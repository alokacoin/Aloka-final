import NewsCategory from '../models/NewsCategory.js';

export const defaultNewsCategories = [
  ['India', 'india', 'map-pinned'],
  ['World', 'world', 'globe'],
  ['Politics', 'politics', 'landmark'],
  ['Business', 'business', 'briefcase-business'],
  ['Economy', 'economy', 'chart-no-axes-column-increasing'],
  ['Finance', 'finance', 'wallet'],
  ['Stock Market', 'stock-market', 'chart-no-axes-combined'],
  ['Banking', 'banking', 'landmark'],
  ['Mutual Funds', 'mutual-funds', 'chart-pie'],
  ['Personal Finance', 'personal-finance', 'wallet'],
  ['Taxation', 'taxation', 'receipt-indian-rupee'],
  ['GST', 'gst', 'receipt-indian-rupee'],
  ['Technology', 'technology', 'cpu'],
  ['Artificial Intelligence', 'artificial-intelligence', 'bot'],
  ['Startups', 'startups', 'rocket'],
  ['Science', 'science', 'flask-conical'],
  ['Health', 'health', 'heart-pulse'],
  ['Sports', 'sports', 'trophy'],
  ['Entertainment', 'entertainment', 'clapperboard'],
  ['Education', 'education', 'graduation-cap'],
  ['Automobile', 'automobile', 'car'],
  ['Real Estate', 'real-estate', 'building'],
  ['Insurance', 'insurance', 'shield-check'],
  ['Government Policies', 'government-policies', 'building-2'],
  ['International Relations', 'international-relations', 'globe-2'],
  ['Cryptocurrency', 'cryptocurrency', 'bitcoin'],
  ['RBI Updates', 'rbi-updates', 'landmark'],
  ['Corporate News', 'corporate-news', 'factory'],
  ['Other', 'other', 'newspaper']
].map(([name, slug, icon], index) => ({ name, slug, icon, order: index + 1, displayOrder: index + 1 }));

export const ensureNewsCategories = async () => {
  await Promise.all(defaultNewsCategories.map(({ slug, ...category }) => NewsCategory.updateOne(
    { slug },
    { $setOnInsert: { ...category, slug, isActive: true } },
    { upsert: true }
  )));
};

export const listActiveNewsCategories = async () => {
  await ensureNewsCategories();
  return NewsCategory.find({ isActive: true }).sort({ displayOrder: 1, order: 1, name: 1 }).lean();
};
