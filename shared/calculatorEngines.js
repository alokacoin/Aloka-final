const percent = (value) => value / 100;
const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const futureValue = (principal, annualRate, years, periodsPerYear = 12) => {
  const ratePerPeriod = percent(annualRate) / periodsPerYear;
  const periods = years * periodsPerYear;
  return principal * ((1 + ratePerPeriod) ** periods);
};

const field = (id, label, defaultValue, { min = 0, max = 1_000_000_000, step = 100, hint = '' } = {}) => ({
  id, label, defaultValue, min, max, step, hint
});
const amount = (id, label, defaultValue = 100_000, options = {}) =>
  field(id, label, defaultValue, { step: 1000, ...options });
const rate = (id = 'annualRate', label = 'Annual rate (%)', defaultValue = 8, options = {}) =>
  field(id, label, defaultValue, { min: 0, max: 1000, step: 0.1, ...options });
const years = (defaultValue = 5) =>
  field('years', 'Period (years)', defaultValue, { min: 0.5, max: 100, step: 0.5 });

const createEngine = (fields, calculate, assumptions = []) => ({ fields, calculate, assumptions });
const result = (primaryLabel, primaryValue, metrics = [], breakdown = []) => ({
  primaryLabel,
  primaryValue: roundMoney(primaryValue),
  metrics: metrics.map(([label, value]) => ({ label, value: roundMoney(value) })),
  breakdown: breakdown.map(([label, value]) => ({ label, value: roundMoney(value) }))
});

const gstAmountEngine = createEngine(
  [
    amount('amount', 'Amount before GST', 10_000),
    rate('gstRate', 'GST rate (%)', 18, { max: 100 })
  ],
  ({ amount: base, gstRate }) => {
    const tax = base * percent(gstRate);
    return result('Total including GST', base + tax, [['GST amount', tax], ['Amount before GST', base]]);
  },
  ['The GST rate is entered by you; verify the applicable rate and tax treatment for your supply.']
);

const gstIncludedEngine = createEngine(
  [
    amount('totalAmount', 'Amount including GST', 11_800),
    rate('gstRate', 'GST rate (%)', 18, { max: 100 })
  ],
  ({ totalAmount, gstRate }) => {
    const base = totalAmount / (1 + percent(gstRate));
    const tax = totalAmount - base;
    return result('Amount before GST', base, [['GST included', tax], ['Total amount', totalAmount]]);
  },
  ['Assumes a single GST rate applies to the entire tax-inclusive amount.']
);

const compoundInterestEngine = createEngine(
  [amount('principal', 'Initial amount', 100_000), rate(), years()],
  ({ principal, annualRate, years: term }) => {
    const value = futureValue(principal, annualRate, term, 1);
    return result('Future value', value, [['Interest earned', value - principal], ['Initial amount', principal]]);
  },
  ['Compounded annually; excludes tax, fees, and changes in rate.']
);

const sipEngine = createEngine(
  [
    amount('monthlyInvestment', 'Monthly investment', 5_000, { max: 10_000_000 }),
    rate('annualRate', 'Expected annual return (%)', 12),
    years(10)
  ],
  ({ monthlyInvestment, annualRate, years: term }) => {
    const months = Math.round(term * 12);
    const monthlyRate = percent(annualRate) / 12;
    const invested = monthlyInvestment * months;
    const value = monthlyRate === 0
      ? invested
      : monthlyInvestment * (((1 + monthlyRate) ** months - 1) / monthlyRate);
    return result('Estimated future value', value, [['Total invested', invested], ['Estimated growth', value - invested]]);
  },
  ['Assumes fixed end-of-month contributions and a constant monthly-equivalent return; actual returns vary and are not guaranteed.']
);

const loanEmiEngine = createEngine(
  [
    amount('principal', 'Loan amount', 2_500_000),
    rate('annualRate', 'Annual interest rate (%)', 8.5),
    field('months', 'Loan term (months)', 240, { min: 1, max: 1200, step: 1 })
  ],
  ({ principal, annualRate, months }) => {
    const monthlyRate = percent(annualRate) / 12;
    const emi = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
    const paid = emi * months;
    return result('Monthly payment (EMI)', emi, [['Total repayment', paid], ['Total interest', paid - principal]]);
  },
  ['Assumes a fixed interest rate, equal monthly payments, and no fees or prepayments.']
);

const simpleInterestEngine = createEngine(
  [amount('principal', 'Principal', 100_000), rate(), years()],
  ({ principal, annualRate, years: term }) => {
    const interest = principal * percent(annualRate) * term;
    return result('Total amount', principal + interest, [['Simple interest', interest], ['Principal', principal]]);
  },
  ['Uses simple interest without compounding.']
);

const cagrEngine = createEngine(
  [
    amount('initialValue', 'Starting value', 100_000, { min: 0.01 }),
    amount('finalValue', 'Ending value', 150_000),
    years(3)
  ],
  ({ initialValue, finalValue, years: term }) => {
    if (!initialValue || !term) return result('Annualized growth', 0);
    const cagr = ((finalValue / initialValue) ** (1 / term) - 1) * 100;
    return result('Annualized growth (%)', cagr, [['Total change', finalValue - initialValue]]);
  },
  ['Assumes values are positive and ignores interim contributions, withdrawals, taxes, and fees.']
);

const discountEngine = createEngine(
  [amount('originalPrice', 'Original price', 5_000), rate('discountRate', 'Discount (%)', 10, { max: 100 })],
  ({ originalPrice, discountRate }) => {
    const savings = originalPrice * percent(discountRate);
    return result('Price after discount', originalPrice - savings, [['Discount amount', savings], ['Original price', originalPrice]]);
  }
);

const percentageEngine = createEngine(
  [amount('value', 'Value', 250), rate('percentage', 'Percentage (%)', 15, { max: 1_000_000 })],
  ({ value, percentage }) => result('Calculated percentage', value * percent(percentage), [['Value', value], ['Percentage (%)', percentage]])
);

const inflationEngine = createEngine(
  [amount('currentAmount', 'Current amount', 100_000), rate('inflationRate', 'Annual inflation (%)', 5), years(10)],
  ({ currentAmount, inflationRate, years: term }) => {
    const futureCost = currentAmount * (1 + percent(inflationRate)) ** term;
    return result('Equivalent future cost', futureCost, [['Increase from inflation', futureCost - currentAmount], ['Current amount', currentAmount]]);
  },
  ['Assumes a constant annual inflation rate; actual inflation varies.']
);

const roiEngine = createEngine(
  [amount('investment', 'Initial investment', 100_000), amount('returnAmount', 'Value received', 125_000)],
  ({ investment, returnAmount }) => {
    const gain = returnAmount - investment;
    return result('Return on investment (%)', investment ? (gain / investment) * 100 : 0, [['Net gain', gain], ['Initial investment', investment]]);
  }
);

const profitMarginEngine = createEngine(
  [amount('revenue', 'Revenue', 100_000), amount('cost', 'Total cost', 60_000)],
  ({ revenue, cost }) => {
    const profit = revenue - cost;
    return result('Profit margin (%)', revenue ? (profit / revenue) * 100 : 0, [['Profit', profit], ['Revenue', revenue]]);
  }
);

const grossProfitEngine = createEngine(
  [amount('revenue', 'Revenue', 100_000), amount('costOfGoods', 'Cost of goods sold', 60_000)],
  ({ revenue, costOfGoods }) => {
    const grossProfit = revenue - costOfGoods;
    return result('Gross profit', grossProfit, [['Gross margin (%)', revenue ? (grossProfit / revenue) * 100 : 0], ['Revenue', revenue]]);
  }
);

const markupEngine = createEngine(
  [amount('cost', 'Cost', 1_000), rate('markupRate', 'Markup (%)', 25, { max: 1_000_000 })],
  ({ cost, markupRate }) => {
    const markup = cost * percent(markupRate);
    return result('Selling price', cost + markup, [['Markup amount', markup], ['Cost', cost]]);
  }
);

const breakEvenEngine = createEngine(
  [
    amount('fixedCosts', 'Fixed costs', 100_000),
    amount('variableCost', 'Variable cost per unit', 50),
    amount('sellingPrice', 'Selling price per unit', 100)
  ],
  ({ fixedCosts, variableCost, sellingPrice }) => {
    const contribution = sellingPrice - variableCost;
    if (contribution <= 0) return result('Break-even units', 0, [['Contribution per unit', contribution]]);
    return result('Break-even units', Math.ceil(fixedCosts / contribution), [['Contribution per unit', contribution], ['Break-even revenue', Math.ceil(fixedCosts / contribution) * sellingPrice]]);
  },
  ['Assumes constant prices and costs; excludes capacity constraints and taxes.']
);

const revenueGrowthEngine = createEngine(
  [amount('previousRevenue', 'Previous revenue', 100_000), amount('currentRevenue', 'Current revenue', 120_000)],
  ({ previousRevenue, currentRevenue }) => result(
    'Revenue growth (%)',
    previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
    [['Revenue change', currentRevenue - previousRevenue]]
  )
);

const taxInclusivePriceEngine = createEngine(
  [amount('basePrice', 'Price before tax', 1_000), rate('taxRate', 'Tax rate (%)', 18, { max: 100 })],
  ({ basePrice, taxRate }) => {
    const tax = basePrice * percent(taxRate);
    return result('Price including tax', basePrice + tax, [['Tax amount', tax], ['Price before tax', basePrice]]);
  },
  ['Enter the applicable tax rate; tax treatment can vary by product and jurisdiction.']
);

const engineBySlug = new Map();
const register = (slugs, engine) => slugs.forEach((slug) => engineBySlug.set(slug, engine));

register(['gst-calculator', 'gst-exclusive-amount-calculator', 'igst-calculator'], gstAmountEngine);
register(['gst-inclusive-amount-calculator', 'reverse-gst-calculator'], gstIncludedEngine);
register(['gst-split-calculator-cgst-sgst'], createEngine(
  [amount('amount', 'Amount before GST', 10_000), rate('gstRate', 'GST rate (%)', 18, { max: 100 })],
  ({ amount: base, gstRate }) => {
    const totalTax = base * percent(gstRate);
    return result('Total including GST', base + totalTax, [
      ['CGST', totalTax / 2], ['SGST', totalTax / 2], ['Total GST', totalTax]
    ]);
  },
  ['Assumes an intra-state supply with an equal CGST/SGST split and a user-entered combined rate. Confirm the applicable tax treatment.']
));
register(['sip-calculator'], sipEngine);
register(['lumpsum-investment-calculator', 'mutual-fund-returns-calculator'], compoundInterestEngine);
register(['cagr-calculator'], cagrEngine);
register(['inflation-calculator', 'inflation-impact-calculator'], inflationEngine);
register(['home-loan-emi-calculator', 'personal-loan-emi-calculator', 'car-loan-emi-calculator', 'education-loan-emi-calculator', 'business-loan-emi-calculator'], loanEmiEngine);
register(['simple-interest-calculator'], simpleInterestEngine);
register(['compound-interest-calculator'], compoundInterestEngine);
register(['percentage-calculator'], percentageEngine);
register(['discount-calculator'], discountEngine);
register(['return-on-investment-roi-calculator'], roiEngine);
register(['profit-margin-calculator'], profitMarginEngine);
register(['gross-profit-calculator'], grossProfitEngine);
register(['markup-calculator'], markupEngine);
register(['break-even-point-calculator'], breakEvenEngine);
register(['revenue-growth-calculator'], revenueGrowthEngine);
register(['tax-inclusive-pricing-calculator'], taxInclusivePriceEngine);

export const implementedCalculatorSlugs = new Set(engineBySlug.keys());

export const getCalculatorEngine = (slug) => engineBySlug.get(slug) || null;

export const calculateWithEngine = (slug, rawInputs) => {
  const engine = getCalculatorEngine(slug);
  if (!engine) throw new Error(`No verified calculation engine exists for "${slug}".`);

  const inputs = {};
  for (const { id, label, min, max, step } of engine.fields) {
    const value = Number(rawInputs[id]);
    if (!Number.isFinite(value) || value < min || value > max || (step === 1 && !Number.isInteger(value))) {
      throw new RangeError(`${label} must be between ${min} and ${max}.`);
    }
    inputs[id] = value;
  }

  const calculation = engine.calculate(inputs);
  return {
    calculatorSlug: slug,
    inputs,
    ...calculation,
    results: {
      primary: { label: calculation.primaryLabel, value: calculation.primaryValue },
      metrics: calculation.metrics
    },
    chartData: [],
    assumptions: engine.assumptions,
    disclaimer: 'Illustrative estimate only. Verify inputs, current rules, and fees before making a financial decision.',
    calculatedAt: new Date().toISOString(),
    ruleVersion: '1.0'
  };
};
