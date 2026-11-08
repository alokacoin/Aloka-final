import mongoose from 'mongoose';
import Calculator from '../../models/Calculator.js';
import CalculatorCategory from '../../models/CalculatorCategory.js';
import { slugify } from './calculatorValidation.js';

const populateCategory = { path: 'categoryId', select: 'name slug icon' };

export const buildPublicCalculatorFilter = async (filters = {}) => {
  const now = new Date();
  const activeCategories = await CalculatorCategory.find({ isActive: true }).select('_id').lean();
  const query = {
    isActive: true,
    categoryId: { $in: activeCategories.map(({ _id }) => _id) },
    publishedAt: { $ne: null, $lte: now }
  };

  if (filters.category) {
    const category = await CalculatorCategory.findOne({
      slug: filters.category.toLowerCase(),
      isActive: true
    }).select('_id').lean();
    if (!category) return { _id: null };
    query.categoryId = category._id;
  }

  if (filters.featured !== undefined) query.isFeatured = filters.featured;
  if (filters.popular !== undefined) query.isPopular = filters.popular;
  if (filters.search) {
    const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(escapedSearch, 'i');
    query.$or = [
      { name: expression },
      { description: expression },
      { shortDescription: expression },
      { keywords: expression },
      { tags: expression }
    ];
  }
  return query;
};

export const getPublicCalculatorMetadata = (calculator) => ({
  id: calculator._id.toString(),
  name: calculator.name,
  slug: calculator.slug,
  description: calculator.description,
  shortDescription: calculator.shortDescription,
  category: calculator.categoryId && typeof calculator.categoryId === 'object'
    ? {
        id: calculator.categoryId._id.toString(),
        name: calculator.categoryId.name,
        slug: calculator.categoryId.slug,
        icon: calculator.categoryId.icon
      }
    : null,
  categorySlug: calculator.categorySlug,
  calculatorType: calculator.calculatorType,
  icon: calculator.icon,
  keywords: calculator.keywords,
  tags: calculator.tags,
  inputSchema: calculator.inputSchema,
  outputSchema: calculator.outputSchema,
  formulaExplanation: calculator.formulaExplanation,
  assumptions: calculator.assumptions,
  disclaimer: calculator.disclaimer,
  relatedCalculatorIds: calculator.relatedCalculatorIds,
  relatedArticleIds: calculator.relatedArticleIds,
  seoTitle: calculator.seoTitle,
  seoDescription: calculator.seoDescription,
  isFeatured: calculator.isFeatured,
  isPopular: calculator.isPopular,
  isImplemented: calculator.isImplemented,
  isVerified: calculator.isVerified,
  sortOrder: calculator.sortOrder,
  publishedAt: calculator.publishedAt
});

const getSort = (sort = 'sortOrder') => {
  if (sort === 'name') return { name: 1 };
  if (sort === 'recent') return { publishedAt: -1, name: 1 };
  if (sort === 'oldest') return { publishedAt: 1, name: 1 };
  if (sort === 'featured') return { isFeatured: -1, sortOrder: 1, name: 1 };
  if (sort === 'popular') return { isPopular: -1, sortOrder: 1, name: 1 };
  return { sortOrder: 1, name: 1 };
};

export const listPublicCalculators = async (filters = {}) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const query = await buildPublicCalculatorFilter(filters);
  const [items, total] = await Promise.all([
    Calculator.find(query)
      .sort(getSort(filters.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(populateCategory)
      .lean(),
    Calculator.countDocuments(query)
  ]);
  return {
    items: items.map(getPublicCalculatorMetadata),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
};

export const getPublicCalculator = async (slug) => {
  const query = await buildPublicCalculatorFilter();
  const calculator = await Calculator.findOne({ ...query, slug })
    .populate(populateCategory)
    .lean();
  return calculator ? getPublicCalculatorMetadata(calculator) : null;
};

export const listPublicCategories = async () =>
  CalculatorCategory.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

export const getPublicCategory = async (slug) =>
  CalculatorCategory.findOne({ slug, isActive: true }).lean();

const resolveCategory = async ({ categoryId, categorySlug }) => {
  let category;
  if (categoryId && mongoose.isValidObjectId(categoryId)) {
    category = await CalculatorCategory.findById(categoryId);
  } else if (categorySlug) {
    category = await CalculatorCategory.findOne({ slug: categorySlug });
  }
  if (!category) {
    const error = new Error('Calculator category not found.');
    error.status = 400;
    throw error;
  }
  return category;
};

export const prepareCalculatorWrite = async (data, current = null) => {
  const next = { ...data };
  if (next.name && !next.slug) next.slug = slugify(next.name);
  if (next.categoryId || next.categorySlug) {
    const category = await resolveCategory(next);
    next.categoryId = category._id;
    next.categorySlug = category.slug;
  } else if (current) {
    next.categoryId = current.categoryId;
    next.categorySlug = current.categorySlug;
  }
  if (next.publishedAt !== undefined && next.publishedAt !== null) {
    next.publishedAt = new Date(next.publishedAt);
  }
  return next;
};

export const ensureCategorySlug = (category) => ({
  ...category,
  slug: category.slug || slugify(category.name.replace(/&/g, 'and'))
});

export const slugifyCategoryName = (name) => slugify(name.replace(/&/g, 'and'));

export const getSortForAdmin = getSort;
