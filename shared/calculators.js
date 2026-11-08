import { implementedCalculatorSlugs } from './calculatorEngines.js';

export const calculatorCategories = [
  {
    name: 'Income tax',
    description: 'Understand tax estimates, deductions, and salary-related tax topics.',
    calculators: [
      'Income Tax Calculator – Old vs New Tax Regime',
      'Salary Income Tax Calculator',
      'HRA Exemption Calculator',
      'Standard Deduction Calculator',
      'Capital Gains Tax Calculator',
      'Short-Term Capital Gains Calculator',
      'Long-Term Capital Gains Calculator',
      'Tax Saving Calculator',
      'Advance Tax Calculator',
      'TDS Calculator',
      'Gratuity Calculator',
      'Leave Encashment Tax Calculator',
      'Freelance Income Tax Calculator',
      'Presumptive Taxation Calculator (44AD / 44ADA)',
      'Professional Tax Calculator'
    ]
  },
  {
    name: 'GST',
    description: 'Explore goods and services tax calculations and invoice breakdowns.',
    calculators: [
      'GST Calculator',
      'GST Inclusive Amount Calculator',
      'GST Exclusive Amount Calculator',
      'GST Split Calculator (CGST + SGST)',
      'IGST Calculator',
      'Reverse GST Calculator',
      'GST Late Fee Calculator',
      'GST Interest Calculator',
      'GST Invoice Calculator',
      'Composition Scheme Calculator'
    ]
  },
  {
    name: 'Investments',
    description: 'Explore investment growth, returns, and financial goal estimates.',
    calculators: [
      'SIP Calculator',
      'Lumpsum Investment Calculator',
      'Mutual Fund Returns Calculator',
      'CAGR Calculator',
      'XIRR Calculator',
      'Stock Returns Calculator',
      'Inflation Calculator',
      'Real Rate of Return Calculator',
      'Goal-Based Investment Calculator',
      'SWP Calculator',
      'STP Calculator',
      'Dividend Yield Calculator'
    ]
  },
  {
    name: 'Loans & EMI',
    description: 'Review loan repayment, EMI, and prepayment scenarios.',
    calculators: [
      'Home Loan EMI Calculator',
      'Personal Loan EMI Calculator',
      'Car Loan EMI Calculator',
      'Education Loan EMI Calculator',
      'Business Loan EMI Calculator',
      'Gold Loan Calculator',
      'Loan Eligibility Calculator',
      'Loan Prepayment Calculator',
      'EMI vs Prepayment Comparison',
      'Loan Interest Calculator',
      'Amortization Schedule Calculator'
    ]
  },
  {
    name: 'Banking & savings',
    description: 'Plan savings and understand the potential growth of deposits.',
    calculators: [
      'Fixed Deposit (FD) Calculator',
      'Recurring Deposit (RD) Calculator',
      'Public Provident Fund (PPF) Calculator',
      'Employee Provident Fund (EPF) Calculator',
      'National Savings Certificate (NSC) Calculator',
      'Sukanya Samriddhi Yojana Calculator',
      'Senior Citizen Savings Scheme Calculator',
      'Simple Interest Calculator',
      'Compound Interest Calculator',
      'Savings Goal Calculator'
    ]
  },
  {
    name: 'Retirement & pension',
    description: 'Explore retirement savings and income estimates.',
    calculators: [
      'Retirement Planning Calculator',
      'NPS Calculator',
      'EPF Retirement Calculator',
      'Monthly Pension Calculator',
      'Retirement Corpus Calculator',
      'Annuity Calculator',
      'Post-Retirement Income Calculator'
    ]
  },
  {
    name: 'Salary & employment',
    description: 'Understand salary components and take-home pay estimates.',
    calculators: [
      'CTC to In-Hand Salary Calculator',
      'In-Hand Salary Calculator',
      'Gross Salary Calculator',
      'Basic Salary Calculator',
      'DA Calculator',
      'Bonus Calculator',
      'PF Deduction Calculator',
      'Salary Hike Calculator',
      'Monthly vs Annual Salary Calculator'
    ]
  },
  {
    name: 'Business & accounting',
    description: 'Explore common business performance and accounting calculations.',
    calculators: [
      'Profit Margin Calculator',
      'Gross Profit Calculator',
      'Net Profit Calculator',
      'Markup Calculator',
      'Break-Even Point Calculator',
      'Business Valuation Estimator',
      'Working Capital Calculator',
      'Cash Flow Calculator',
      'Return on Investment (ROI) Calculator',
      'Depreciation Calculator',
      'Inventory Turnover Calculator',
      'Revenue Growth Calculator'
    ]
  },
  {
    name: 'General finance',
    description: 'Quick calculations for percentages, discounts, inflation, and goals.',
    calculators: [
      'Percentage Calculator',
      'Ratio Calculator',
      'Currency Conversion Calculator',
      'Inflation Impact Calculator',
      'Purchasing Power Calculator',
      'Discount Calculator',
      'Tax Inclusive Pricing Calculator',
      'Financial Goal Calculator'
    ]
  }
];

const featuredIds = new Set([
  'income-tax-calculator-old-vs-new-tax-regime',
  'sip-calculator',
  'gst-calculator'
]);
const popularIds = new Set([
  'income-tax-calculator-old-vs-new-tax-regime',
  'home-loan-emi-calculator',
  'sip-calculator',
  'gst-calculator'
]);
const recentlyAddedIds = new Set([
  'income-tax-calculator-old-vs-new-tax-regime',
  'ctc-to-in-hand-salary-calculator',
  'gst-calculator',
  'retirement-planning-calculator'
]);
const categoryKeywords = {
  'Income tax': 'income salary assessment year financial year tax regime deduction',
  GST: 'goods services tax invoice cgst sgst igst',
  Investments: 'investment returns mutual funds sip savings wealth',
  'Loans & EMI': 'loan borrowing repayment emi interest mortgage',
  'Banking & savings': 'bank deposit savings interest account',
  'Retirement & pension': 'retirement pension corpus old age',
  'Salary & employment': 'salary payroll ctc take home employment',
  'Business & accounting': 'business accounting revenue expenses profit company',
  'General finance': 'general money percentage discount inflation'
};

const slugify = (name) => name
  .toLowerCase()
  .replace(/[–—]/g, '-')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const calculators = calculatorCategories.flatMap(({ name: category, calculators: names }) =>
  names.map((name) => ({
    id: slugify(name),
    name,
    category,
    status: name === 'Income Tax Calculator – Old vs New Tax Regime' ||
      implementedCalculatorSlugs.has(slugify(name)) ? 'available' : 'planned',
    keywords: `${categoryKeywords[category] || ''} ${name.toLowerCase()}`,
    featured: featuredIds.has(slugify(name)),
    popular: popularIds.has(slugify(name)),
    recentlyAdded: recentlyAddedIds.has(slugify(name))
  }))
);

export const availableCalculatorPath = '/calculators/income-tax-calculator';

export const findCalculatorPath = (calculator) => {
  if (calculator.status !== 'available') return null;
  return calculator.id === 'income-tax-calculator-old-vs-new-tax-regime'
    ? availableCalculatorPath
    : `/calculators/${calculator.id}`;
};

export function filterCalculators({
  items = calculators,
  query = '',
  category = 'All calculators',
  discovery = 'all',
  sort = 'alphabetical'
} = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((calculator) => {
    const matchesCategory = category === 'All calculators' || calculator.category === category;
    const matchesSearch = !normalizedQuery ||
      calculator.name.toLowerCase().includes(normalizedQuery) ||
      calculator.category.toLowerCase().includes(normalizedQuery) ||
      calculator.keywords.includes(normalizedQuery);
    const matchesDiscovery = discovery === 'all' || calculator[discovery] === true;
    return matchesCategory && matchesSearch && matchesDiscovery;
  }).sort((left, right) => {
    if (sort === 'category') {
      return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
    }
    return left.name.localeCompare(right.name);
  });
}

export const slugifyCalculatorName = slugify;
