import Calculator from '../models/Calculator.js';
import CalculatorCategory from '../models/CalculatorCategory.js';
import {
  ensureCategorySlug,
  getSortForAdmin,
  prepareCalculatorWrite,
  slugifyCategoryName
} from '../modules/calculators/calculatorCatalogueService.js';
import {
  calculatorCreateSchema,
  calculatorUpdateSchema,
  categorySchema,
  listQuerySchema,
  parseBody
} from '../modules/calculators/calculatorValidation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const parseAdminQuery = (query) => parseBody(listQuerySchema, query);
const invalidId = () => {
  const error = new Error('Invalid resource ID.');
  error.status = 400;
  return error;
};

export const listAdminCalculators = asyncHandler(async (req, res) => {
  const query = parseAdminQuery(req.query);
  const filter = {};
  if (query.category) filter.categorySlug = query.category;
  if (query.search || query.q) {
    const escaped = (query.search || query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: new RegExp(escaped, 'i') },
      { description: new RegExp(escaped, 'i') },
      { keywords: new RegExp(escaped, 'i') }
    ];
  }
  if (query.featured !== undefined) filter.isFeatured = query.featured === 'true';
  if (query.popular !== undefined) filter.isPopular = query.popular === 'true';
  const [items, total] = await Promise.all([
    Calculator.find(filter)
      .sort(getSortForAdmin(query.sort))
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('categoryId', 'name slug')
      .lean(),
    Calculator.countDocuments(filter)
  ]);
  res.json({
    success: true,
    items,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) }
  });
});

export const getAdminCalculator = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw invalidId();
  const item = await Calculator.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ success: false, message: 'Calculator not found.' });
  return res.json({ success: true, item });
});

export const createCalculator = asyncHandler(async (req, res) => {
  const data = parseBody(calculatorCreateSchema, req.body);
  const prepared = await prepareCalculatorWrite(data);
  const item = await Calculator.create({
    ...prepared,
    createdBy: req.user.sub,
    updatedBy: req.user.sub
  });
  res.status(201).json({ success: true, item });
});

export const updateCalculator = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw invalidId();
  const data = parseBody(calculatorUpdateSchema, req.body);
  const current = await Calculator.findById(req.params.id);
  if (!current) return res.status(404).json({ success: false, message: 'Calculator not found.' });
  const prepared = await prepareCalculatorWrite(data, current);
  Object.assign(current, prepared, { updatedBy: req.user.sub });
  await current.save();
  return res.json({ success: true, item: current });
});

export const deleteCalculator = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw invalidId();
  const item = await Calculator.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false, updatedBy: req.user.sub } },
    { new: true, runValidators: true }
  );
  if (!item) return res.status(404).json({ success: false, message: 'Calculator not found.' });
  return res.json({ success: true, item });
});

export const listAdminCategories = asyncHandler(async (_req, res) => {
  const items = await CalculatorCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ success: true, items });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = parseBody(categorySchema, req.body);
  const item = await CalculatorCategory.create(ensureCategorySlug(data));
  res.status(201).json({ success: true, item });
});

export const updateCategory = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw invalidId();
  const data = parseBody(categorySchema.partial().strict().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'At least one field must be provided.' }
  ), req.body);
  const item = await CalculatorCategory.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Category not found.' });
  if (data.isActive === false) {
    const activeCalculatorCount = await Calculator.countDocuments({
      categoryId: item._id,
      isActive: true
    });
    if (activeCalculatorCount) {
      const error = new Error('Move or deactivate this category’s calculators before deactivating it.');
      error.status = 409;
      throw error;
    }
  }
  Object.assign(item, data);
  if (data.name && !data.slug) item.slug = slugifyCategoryName(data.name);
  await item.save();
  await Calculator.updateMany(
    { categoryId: item._id },
    { $set: { categorySlug: item.slug } }
  );
  return res.json({ success: true, item });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw invalidId();
  const category = await CalculatorCategory.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  const calculatorCount = await Calculator.countDocuments({ categoryId: category._id });
  if (calculatorCount) {
    const error = new Error('A category with calculators cannot be deleted. Deactivate it instead.');
    error.status = 409;
    throw error;
  }
  await category.deleteOne();
  return res.json({ success: true, message: 'Category deleted.' });
});
