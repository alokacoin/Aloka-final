const TAX_YEARS = {
  '2025-26': { label: 'FY 2025–26' },
  '2026-27': { label: 'FY 2026–27' }
};

const NEW_REGIME_SLABS = [
  { limit: 400_000, rate: 0 },
  { limit: 800_000, rate: 0.05 },
  { limit: 1_200_000, rate: 0.1 },
  { limit: 1_600_000, rate: 0.15 },
  { limit: 2_000_000, rate: 0.2 },
  { limit: 2_400_000, rate: 0.25 },
  { limit: Infinity, rate: 0.3 }
];

const OLD_REGIME_SLABS = {
  below60: [
    { limit: 250_000, rate: 0 },
    { limit: 500_000, rate: 0.05 },
    { limit: 1_000_000, rate: 0.2 },
    { limit: Infinity, rate: 0.3 }
  ],
  age60to79: [
    { limit: 300_000, rate: 0 },
    { limit: 500_000, rate: 0.05 },
    { limit: 1_000_000, rate: 0.2 },
    { limit: Infinity, rate: 0.3 }
  ],
  age80plus: [
    { limit: 500_000, rate: 0 },
    { limit: 1_000_000, rate: 0.2 },
    { limit: Infinity, rate: 0.3 }
  ]
};

const STANDARD_DEDUCTION = {
  new: 75_000,
  old: 50_000
};

const REBATE = {
  new: { incomeLimit: 1_200_000, maximum: 60_000 },
  old: { incomeLimit: 500_000, maximum: 12_500 }
};

function calculateSlabTax(income, slabs) {
  let tax = 0;
  let lowerLimit = 0;

  for (const { limit, rate } of slabs) {
    if (income <= lowerLimit) break;
    tax += (Math.min(income, limit) - lowerLimit) * rate;
    lowerLimit = limit;
  }

  return tax;
}

function calculateRebate(tax, income, rebate) {
  if (income <= rebate.incomeLimit) {
    return Math.min(tax, rebate.maximum);
  }

  const maximumTaxAfterMarginalRelief = income - rebate.incomeLimit;
  return Math.min(
    tax,
    rebate.maximum,
    Math.max(0, tax - maximumTaxAfterMarginalRelief)
  );
}

function calculateRegimeTax({ income, standardDeduction, deductions, slabs, rebate }) {
  const taxableIncome = Math.max(0, income - standardDeduction - deductions);
  const slabTax = calculateSlabTax(taxableIncome, slabs);
  const rebateAmount = calculateRebate(slabTax, taxableIncome, rebate);
  const taxAfterRebate = Math.max(0, slabTax - rebateAmount);
  const cess = taxAfterRebate * 0.04;

  return {
    taxableIncome: Math.round(taxableIncome),
    slabTax: Math.round(slabTax),
    rebate: Math.round(rebateAmount),
    cess: Math.round(cess),
    totalTax: Math.round(taxAfterRebate + cess)
  };
}

export function calculateIncomeTax({
  financialYear,
  annualSalary,
  otherIncome = 0,
  oldRegimeDeductions = 0,
  ageGroup = 'below60'
}) {
  if (!TAX_YEARS[financialYear]) {
    throw new RangeError('Choose a supported financial year.');
  }

  const amounts = [annualSalary, otherIncome, oldRegimeDeductions];
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new RangeError('Income and deductions must be valid non-negative amounts.');
  }

  const oldRegimeSlabs = OLD_REGIME_SLABS[ageGroup];
  if (!oldRegimeSlabs) {
    throw new RangeError('Choose a valid age group.');
  }

  const grossIncome = annualSalary + otherIncome;
  const salaryDeduction = Math.min(annualSalary, STANDARD_DEDUCTION.new);
  const oldSalaryDeduction = Math.min(annualSalary, STANDARD_DEDUCTION.old);
  const newRegime = calculateRegimeTax({
    income: grossIncome,
    standardDeduction: salaryDeduction,
    deductions: 0,
    slabs: NEW_REGIME_SLABS,
    rebate: REBATE.new
  });
  const oldRegime = calculateRegimeTax({
    income: grossIncome,
    standardDeduction: oldSalaryDeduction,
    deductions: oldRegimeDeductions,
    slabs: oldRegimeSlabs,
    rebate: REBATE.old
  });

  return {
    financialYear: TAX_YEARS[financialYear].label,
    grossIncome,
    newRegime,
    oldRegime,
    surchargeApplies:
      newRegime.taxableIncome > 5_000_000 || oldRegime.taxableIncome > 5_000_000
  };
}
