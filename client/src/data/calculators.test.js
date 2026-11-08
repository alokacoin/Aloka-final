import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculators,
  calculatorCategories,
  filterCalculators,
  findCalculatorPath
} from './calculators.js';
import {
  calculateWithEngine,
  getCalculatorEngine,
  implementedCalculatorSlugs
} from '../../../shared/calculatorEngines.js';

test('calculator registry has unique identifiers and valid categories', () => {
  const ids = calculators.map(({ id }) => id);
  const categoryNames = new Set(calculatorCategories.map(({ name }) => name));

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(calculators.length > 80);
  assert.ok(calculators.every(({ category }) => categoryNames.has(category)));
});

test('search matches names, categories, and related topics', () => {
  assert.ok(filterCalculators({ query: 'home loan' }).some(({ name }) => name === 'Home Loan EMI Calculator'));
  assert.ok(filterCalculators({ query: 'assessment year' }).some(({ category }) => category === 'Income tax'));
  assert.ok(filterCalculators({ query: 'GST' }).every(({ category }) => category === 'GST'));
});

test('category, discovery, and alphabetical filters work together', () => {
  const featuredInvestments = filterCalculators({
    category: 'Investments',
    discovery: 'featured'
  });
  assert.deepEqual(featuredInvestments.map(({ name }) => name), ['SIP Calculator']);

  const sorted = filterCalculators({ category: 'General finance' });
  assert.deepEqual(sorted.map(({ name }) => name), [...sorted.map(({ name }) => name)].sort());
});

test('only calculators with an implemented engine are marked available', () => {
  const available = calculators.filter(({ status }) => status === 'available');
  assert.ok(available.length > 15);
  assert.equal(findCalculatorPath(available[0]), '/calculators/income-tax-calculator');
  assert.equal(implementedCalculatorSlugs.has('sip-calculator'), true);
  assert.equal(
    findCalculatorPath(calculators.find(({ name }) => name === 'SIP Calculator')),
    '/calculators/sip-calculator'
  );
  assert.equal(findCalculatorPath(calculators.find(({ name }) => name === 'NPS Calculator')), null);
});

test('calculator engines produce predictable GST and SIP results', () => {
  const gst = calculateWithEngine('gst-calculator', { amount: 10_000, gstRate: 18 });
  assert.equal(gst.primaryValue, 11_800);
  assert.equal(gst.metrics[0].value, 1_800);

  const sip = calculateWithEngine('sip-calculator', {
    monthlyInvestment: 5_000,
    annualRate: 12,
    years: 10
  });
  assert.equal(sip.inputs.monthlyInvestment, 5_000);
  assert.ok(sip.primaryValue > 1_100_000 && sip.primaryValue < 1_200_000);
  assert.ok(sip.assumptions.length > 0);
});

test('calculator engines reject invalid and unsupported inputs', () => {
  assert.throws(
    () => calculateWithEngine('percentage-calculator', { value: -1, percentage: 10 }),
    RangeError
  );
  assert.throws(
    () => calculateWithEngine('nps-calculator', {}),
    /No verified calculation engine/
  );
});

test('every advertised formula engine calculates finite results from its published defaults', () => {
  for (const slug of implementedCalculatorSlugs) {
    const calculator = calculators.find(({ id }) => id === slug);
    const engine = calculator && calculateWithEngine(slug, Object.fromEntries(
      getCalculatorEngine(slug).fields.map(({ id, defaultValue }) => [id, defaultValue])
    ));
    assert.ok(engine, `${slug} should have a registered calculator`);
    assert.ok(Number.isFinite(engine.primaryValue), `${slug} should produce a finite result`);
    assert.equal(engine.calculatorSlug, slug);
    assert.ok(Array.isArray(engine.assumptions));
  }
});
