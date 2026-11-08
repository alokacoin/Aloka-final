import { useMemo, useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import CalculatorPageLayout from '../../components/calculators/CalculatorPageLayout';
import { calculateIncomeTax } from '../../utils/incomeTax';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

function numberValue(value) {
  return Math.max(0, Number(value) || 0);
}

function AmountInput({ id, label, value, onChange, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-border bg-white transition focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/10">
        <span className="pl-4 text-slate-500" aria-hidden="true">₹</span>
        <input
          id={id}
          type="number"
          min="0"
          max="1000000000"
          step="1000"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(numberValue(event.target.value))}
          className="w-full rounded-xl bg-transparent px-3 py-3.5 text-text outline-none"
        />
      </div>
      {hint && <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>}
    </div>
  );
}

function RegimeResult({ title, result, recommended }) {
  return (
    <article className={`rounded-2xl border p-6 ${recommended ? 'border-teal/40 bg-teal/5' : 'border-border bg-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-navy">{title}</h3>
        {recommended && (
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
            Lower estimate
          </span>
        )}
      </div>
      <div className="mt-5 text-3xl font-black text-navy">{currency.format(result.totalTax)}</div>
      <p className="mt-1 text-sm text-muted">Estimated annual tax including 4% cess</p>
      <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Taxable income</dt>
          <dd className="font-semibold text-text">{currency.format(result.taxableIncome)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Tax before rebate</dt>
          <dd className="font-semibold text-text">{currency.format(result.slabTax)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Rebate applied</dt>
          <dd className="font-semibold text-teal">−{currency.format(result.rebate)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Health & education cess</dt>
          <dd className="font-semibold text-text">{currency.format(result.cess)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function IncomeTaxCalculatorPage() {
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [annualSalary, setAnnualSalary] = useState(1_200_000);
  const [otherIncome, setOtherIncome] = useState(0);
  const [oldRegimeDeductions, setOldRegimeDeductions] = useState(150_000);
  const [ageGroup, setAgeGroup] = useState('below60');

  const estimate = useMemo(
    () =>
      calculateIncomeTax({
        financialYear,
        annualSalary,
        otherIncome,
        oldRegimeDeductions,
        ageGroup
      }),
    [financialYear, annualSalary, otherIncome, oldRegimeDeductions, ageGroup]
  );

  const recommendedRegime =
    estimate.newRegime.totalTax <= estimate.oldRegime.totalTax ? 'new' : 'old';

  return (
    <CalculatorPageLayout
      title="Indian Income Tax Calculator"
      category="Free tax estimation tool"
      description="Estimate your annual tax and compare the old and new regimes for FY 2025–26 or FY 2026–27."
      image="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1800&q=80"
    >
      <section className="container-shell grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <div className="card-surface h-fit p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-navy">Your income details</h2>
          <p className="mt-2 text-sm text-muted">Estimates update automatically as you edit the values.</p>

          <div className="mt-7 space-y-5">
            <div>
              <label htmlFor="financial-year" className="mb-2 block text-sm font-semibold text-slate-700">
                Financial year
              </label>
              <select
                id="financial-year"
                value={financialYear}
                onChange={(event) => setFinancialYear(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
              >
                <option value="2025-26">FY 2025–26 (AY 2026–27)</option>
                <option value="2026-27">FY 2026–27 (Tax Year 2026–27)</option>
              </select>
            </div>

            <AmountInput
              id="annual-salary"
              label="Annual salary or pension"
              value={annualSalary}
              onChange={setAnnualSalary}
              hint="Enter gross annual salary or pension before standard deduction."
            />

            <AmountInput
              id="other-income"
              label="Other ordinary income"
              value={otherIncome}
              onChange={setOtherIncome}
              hint="For example, interest income. Capital gains and other special-rate income are excluded."
            />

            <div>
              <label htmlFor="age-group" className="mb-2 block text-sm font-semibold text-slate-700">
                Age group (for old-regime slabs)
              </label>
              <select
                id="age-group"
                value={ageGroup}
                onChange={(event) => setAgeGroup(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
              >
                <option value="below60">Below 60 years</option>
                <option value="age60to79">60 to 79 years</option>
                <option value="age80plus">80 years or above</option>
              </select>
            </div>

            <AmountInput
              id="old-regime-deductions"
              label="Eligible old-regime deductions"
              value={oldRegimeDeductions}
              onChange={setOldRegimeDeductions}
              hint="Enter the total deductions you are eligible to claim, such as 80C/80D. This is used only for the old-regime estimate."
            />
          </div>
        </div>

        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">{estimate.financialYear}</p>
              <h2 className="mt-2 text-2xl font-bold text-navy">Regime comparison</h2>
            </div>
            <span className="hidden rounded-full bg-white px-3 py-2 text-xs font-medium text-muted sm:inline-flex">
              Based on entered income
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <RegimeResult
              title="New regime"
              result={estimate.newRegime}
              recommended={recommendedRegime === 'new'}
            />
            <RegimeResult
              title="Old regime"
              result={estimate.oldRegime}
              recommended={recommendedRegime === 'old'}
            />
          </div>

          {estimate.surchargeApplies && (
            <div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Your income is above ₹50 lakh. This estimate does not include surcharge or surcharge marginal relief, so the actual tax may be higher.
            </div>
          )}

          <div className="mt-5 flex gap-3 rounded-xl border border-border bg-white p-4 text-sm leading-6 text-muted">
            <Info size={18} className="mt-0.5 shrink-0 text-navy" />
            <p>
              This is an indicative estimate for resident individuals with ordinary income. It assumes the standard deduction, 87A rebate and 4% cess; it excludes surcharge, special-rate income, exemptions such as HRA, and other individual tax adjustments. Verify the applicable rules with the Income Tax Department or a tax professional before filing.
            </p>
          </div>

          <a
            href="https://www.incometax.gov.in/iec/foportal/"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy underline underline-offset-4"
          >
            <ShieldCheck size={16} />
            Verify current rules with the Income Tax Department
          </a>
        </div>
      </section>
    </CalculatorPageLayout>
  );
}
