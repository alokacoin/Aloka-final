import test from 'node:test';
import assert from 'node:assert/strict';
import Calculator from '../src/models/Calculator.js';
import CalculatorCategory from '../src/models/CalculatorCategory.js';
import {
  getPublicCalculatorMetadata,
  slugifyCategoryName
} from '../src/modules/calculators/calculatorCatalogueService.js';
import {
  calculatorCreateSchema,
  calculatorUpdateSchema,
  categorySchema,
  listQuerySchema,
  parseBody,
  slugify
} from '../src/modules/calculators/calculatorValidation.js';

const validCalculator = {
  name: 'SIP Calculator',
  description: 'Estimate investment growth.',
  shortDescription: 'Explore a regular investment scenario.',
  categorySlug: 'investments',
  calculatorType: 'investment'
};

test('calculator writes validate required fields and reject unknown properties', () => {
  assert.equal(calculatorCreateSchema.safeParse(validCalculator).success, true);
  assert.equal(calculatorCreateSchema.safeParse({ ...validCalculator, isAdmin: true }).success, false);
  assert.equal(calculatorCreateSchema.safeParse({ ...validCalculator, categorySlug: undefined }).success, false);
  assert.equal(calculatorUpdateSchema.safeParse({ isFeatured: true }).success, true);
  assert.equal(calculatorUpdateSchema.safeParse({}).success, false);
});

test('categories and list parameters are validated and bounded', () => {
  assert.equal(categorySchema.safeParse({ name: 'Income tax' }).success, true);
  assert.equal(listQuerySchema.parse({ page: '2', limit: '100', q: 'GST' }).page, 2);
  assert.equal(listQuerySchema.safeParse({ limit: '101' }).success, false);
  assert.equal(listQuerySchema.safeParse({ sort: 'arbitrary' }).success, false);
});

test('validation errors include a client-safe 400 status', () => {
  assert.throws(
    () => parseBody(calculatorCreateSchema, { name: 'missing fields' }),
    (error) => error.status === 400 && error.message.includes('description')
  );
});

test('calculator slugs normalize names consistently', () => {
  assert.equal(slugify('Income Tax Calculator – Old vs New Tax Regime'), 'income-tax-calculator-old-vs-new-tax-regime');
  assert.equal(slugifyCategoryName('Loans & EMI'), 'loans-and-emi');
});

test('public calculator metadata excludes internal administration fields', () => {
  const metadata = getPublicCalculatorMetadata({
    _id: { toString: () => 'calculator-id' },
    name: 'SIP Calculator',
    slug: 'sip-calculator',
    description: 'Estimate investment growth.',
    shortDescription: 'Explore a regular investment scenario.',
    categoryId: {
      _id: { toString: () => 'category-id' },
      name: 'Investments',
      slug: 'investments',
      icon: 'Chart'
    },
    categorySlug: 'investments',
    calculatorType: 'investment',
    keywords: [],
    tags: [],
    isActive: true,
    isFeatured: false,
    isPopular: false,
    isImplemented: false,
    isVerified: false,
    createdBy: 'internal-user',
    updatedBy: 'internal-user'
  });

  assert.equal(metadata.category.name, 'Investments');
  assert.equal(metadata.isImplemented, false);
  assert.equal('createdBy' in metadata, false);
  assert.equal('updatedBy' in metadata, false);
  assert.equal('isActive' in metadata, false);
});

test('calculator models declare unique slugs and catalogue search/filter indexes', () => {
  const calculatorIndexes = Calculator.schema.indexes();
  const categoryIndexes = CalculatorCategory.schema.indexes();
  assert.ok(calculatorIndexes.some(([fields, options]) => fields.slug === 1 && options.unique));
  assert.ok(calculatorIndexes.some(([fields]) => fields.name === 'text' && fields.keywords === 'text'));
  assert.ok(categoryIndexes.some(([fields, options]) => fields.slug === 1 && options.unique));
});
