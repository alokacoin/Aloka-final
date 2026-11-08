import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateIncomeTax } from './incomeTax.js';

test('new regime applies the standard deduction and 87A rebate at the FY 2025-26 threshold', () => {
  const result = calculateIncomeTax({
    financialYear: '2025-26',
    annualSalary: 1_275_000
  });

  assert.equal(result.newRegime.taxableIncome, 1_200_000);
  assert.equal(result.newRegime.slabTax, 60_000);
  assert.equal(result.newRegime.rebate, 60_000);
  assert.equal(result.newRegime.totalTax, 0);
});

test('new regime calculates marginal relief just above the 12 lakh taxable-income limit', () => {
  const result = calculateIncomeTax({
    financialYear: '2026-27',
    annualSalary: 1_285_000
  });

  assert.equal(result.newRegime.taxableIncome, 1_210_000);
  assert.equal(result.newRegime.totalTax, 10_400);
});

test('old regime accepts eligible deductions and calculates cess after rebate', () => {
  const result = calculateIncomeTax({
    financialYear: '2025-26',
    annualSalary: 1_000_000,
    oldRegimeDeductions: 150_000
  });

  assert.equal(result.oldRegime.taxableIncome, 800_000);
  assert.equal(result.oldRegime.slabTax, 72_500);
  assert.equal(result.oldRegime.rebate, 0);
  assert.equal(result.oldRegime.cess, 2_900);
  assert.equal(result.oldRegime.totalTax, 75_400);
});

test('old regime uses the age-based basic exemption for senior citizens', () => {
  const result = calculateIncomeTax({
    financialYear: '2025-26',
    annualSalary: 600_000,
    ageGroup: 'age60to79'
  });

  assert.equal(result.oldRegime.taxableIncome, 550_000);
  assert.equal(result.oldRegime.slabTax, 20_000);
});

test('rejects invalid years and negative values', () => {
  assert.throws(
    () => calculateIncomeTax({ financialYear: '2024-25', annualSalary: 100_000 }),
    RangeError
  );
  assert.throws(
    () => calculateIncomeTax({ financialYear: '2025-26', annualSalary: -1 }),
    RangeError
  );
});
