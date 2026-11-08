import {
  getPublicCalculator,
  getPublicCalculatorMetadata,
  getPublicCategory,
  listPublicCalculators,
  listPublicCategories
} from '../modules/calculators/calculatorCatalogueService.js';
import { listQuerySchema, parseBody } from '../modules/calculators/calculatorValidation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const respondWithCalculators = (filters = {}) => asyncHandler(async (_req, res) => {
  const result = await listPublicCalculators(filters);
  res.json({ success: true, ...result });
});

export const listCalculators = asyncHandler(async (req, res) => {
  const query = parseBody(listQuerySchema, req.query);
  const result = await listPublicCalculators({
    ...query,
    search: query.search || query.q
  });
  res.json({ success: true, ...result });
});

export const listCategories = asyncHandler(async (_req, res) => {
  const items = await listPublicCategories();
  res.json({ success: true, items });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await getPublicCategory(req.params.slug);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  return res.json({ success: true, item: category });
});

export const listCalculatorsByCategory = asyncHandler(async (req, res) => {
  const query = parseBody(listQuerySchema, req.query);
  const result = await listPublicCalculators({
    ...query,
    category: req.params.slug,
    search: query.search || query.q
  });
  res.json({ success: true, ...result });
});

export const listFeaturedCalculators = respondWithCalculators({ featured: true, sort: 'featured', limit: 100 });
export const listPopularCalculators = respondWithCalculators({ popular: true, sort: 'popular', limit: 100 });
export const listRecentCalculators = respondWithCalculators({ sort: 'recent', limit: 4 });

export const searchCalculators = asyncHandler(async (req, res) => {
  const query = parseBody(listQuerySchema, req.query);
  const result = await listPublicCalculators({
    ...query,
    search: query.q || query.search
  });
  res.json({ success: true, ...result });
});

export const getCalculator = asyncHandler(async (req, res) => {
  const item = await getPublicCalculator(req.params.slug);
  if (!item) return res.status(404).json({ success: false, message: 'Calculator not found.' });
  return res.json({ success: true, item });
});
