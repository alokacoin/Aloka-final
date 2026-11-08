import { defaultNewsCategories } from './newsCategories.js';

const categoryRules = [
  ['rbi-updates', /\b(reserve bank of india|\brbi\b|monetary policy|repo rate)\b/i],
  ['gst', /\b(gst|goods and services tax|input tax credit|gst council)\b/i],
  ['taxation', /\b(income tax|tax return|taxpayer|tax filing|tax slab|direct tax|\bitr\b|taxation|customs duty|excise|\btax\b)\b/i],
  ['stock-market', /\b(stock market|shares?|nifty|sensex|equity market|ipo|bse|nse)\b/i],
  ['mutual-funds', /\b(mutual funds?|sip|amfi|asset management company|nav\b)\b/i],
  ['banking', /\b(bank|banking|lender|loan|credit card|deposit|nbfc)\b/i],
  ['insurance', /\b(insurance|insurer|premium|policyholder)\b/i],
  ['cryptocurrency', /\b(cryptocurrency|crypto|bitcoin|ethereum|blockchain)\b/i],
  ['artificial-intelligence', /\b(artificial intelligence|\bai\b|machine learning|generative ai)\b/i],
  ['startups', /\b(startup|start-up|venture capital|funding round|unicorn)\b/i],
  ['automobile', /\b(automobile|automotive|electric vehicle|\bev\b|car maker)\b/i],
  ['real-estate', /\b(real estate|property market|housing|housing market)\b/i],
  ['technology', /\b(technology|tech|software|semiconductor|cybersecurity)\b/i],
  ['sports', /\b(cricket|football|sport|olympic|tournament|ipl)\b/i],
  ['entertainment', /\b(entertainment|film|movie|cinema|streaming|celebrity)\b/i],
  ['science', /\b(science|research|scientist|space mission|climate study)\b/i],
  ['health', /\b(health|healthcare|hospital|medicine|medical|disease)\b/i],
  ['education', /\b(education|university|school|exam|student|academic)\b/i],
  ['business', /\b(business|commerce|trade|industry|market)\b/i],
  ['international-relations', /\b(international relations|diplomacy|foreign affairs|bilateral)\b/i],
  ['government-policies', /\b(government policy|cabinet|union budget|regulation|regulatory)\b/i],
  ['politics', /\b(election|politic|parliament|minister|government|policy)\b/i],
  ['corporate-news', /\b(corporate|earnings|quarterly results|acquisition|merger|company reports)\b/i],
  ['personal-finance', /\b(personal finance|savings|retirement|household|investment|investor)\b/i],
  ['economy', /\b(economy|inflation|gdp|economic growth|employment|interest rates?)\b/i],
  ['finance', /\b(finance|financial|capital)\b/i],
  ['india', /\b(india|indian)\b/i],
  ['world', /\b(world|global|international)\b/i]
];

export const classifyNews = (title, summary = '', source = '') => {
  const text = `${title} ${summary} ${source}`;
  const match = categoryRules.find(([, pattern]) => pattern.test(text));
  const slug = match?.[0] || 'other';
  return defaultNewsCategories.find((category) => category.slug === slug) || defaultNewsCategories.at(-1);
};
