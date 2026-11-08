import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Calculator from '../src/models/Calculator.js';
import CalculatorCategory from '../src/models/CalculatorCategory.js';
import { calculatorCategories, calculators } from '@aloka/shared/calculators';
import { implementedCalculatorSlugs } from '@aloka/shared/calculatorEngines';

const categoryTypes = {
  'Income tax': 'tax',
  GST: 'gst',
  Investments: 'investment',
  'Loans & EMI': 'loan',
  'Banking & savings': 'banking',
  'Retirement & pension': 'retirement',
  'Salary & employment': 'salary',
  'Business & accounting': 'business',
  'General finance': 'general'
};
const disclaimers = 'For educational purposes only. Verify current rules and consult a qualified professional before making financial or tax decisions.';
const now = new Date();

const seed = async () => {
  const connection = await connectDB();
  if (!connection) throw new Error('MongoDB is unavailable; catalogue seeding was not performed.');

  const categoriesByName = new Map();
  for (const [sortOrder, category] of calculatorCategories.entries()) {
    const slug = category.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const savedCategory = await CalculatorCategory.findOneAndUpdate(
      { slug },
      {
        $setOnInsert: {
          name: category.name,
          slug,
          description: category.description,
          sortOrder,
          isActive: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoriesByName.set(category.name, savedCategory);
  }

  for (const [sortOrder, calculator] of calculators.entries()) {
    const category = categoriesByName.get(calculator.category);
    const isImplemented = calculator.status === 'available' &&
      (calculator.id === 'income-tax-calculator-old-vs-new-tax-regime' ||
        implementedCalculatorSlugs.has(calculator.id));
    const entry = {
      name: calculator.name,
      slug: calculator.id,
      description: `Explore estimates and scenarios for ${calculator.name.toLowerCase()}.`,
      shortDescription: `Explore ${calculator.name.toLowerCase()} scenarios.`,
      categoryId: category._id,
      categorySlug: category.slug,
      calculatorType: categoryTypes[calculator.category],
      icon: category.icon || 'Calculator',
      keywords: calculator.keywords.split(/\s+/).filter(Boolean),
      tags: [calculator.category.toLowerCase()],
      disclaimer: disclaimers,
      seoTitle: calculator.name,
      seoDescription: `Explore ${calculator.name.toLowerCase()} with Aloka.`,
      isActive: true,
      isFeatured: calculator.featured,
      isPopular: calculator.popular,
      sortOrder,
      publishedAt: now
    };
    await Calculator.findOneAndUpdate(
      { slug: calculator.id },
      {
        $set: { isImplemented, isVerified: isImplemented },
        $setOnInsert: entry
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${calculatorCategories.length} categories and ${calculators.length} calculator listings.`);
};

seed()
  .catch((error) => {
    console.error('Calculator catalogue seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
