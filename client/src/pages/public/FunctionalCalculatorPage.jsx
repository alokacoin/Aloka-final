import { useMemo, useState } from 'react';
import { Bookmark, Calculator, Info, RotateCcw } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import CalculatorPageLayout from '../../components/calculators/CalculatorPageLayout';
import Button from '../../components/ui/Button';
import { calculators } from '../../data/calculators';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { calculateWithEngine, getCalculatorEngine } from '@aloka/shared/calculatorEngines';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
});

const formatValue = (label, value) =>
  label.toLowerCase().includes('(%)') || label.toLowerCase().includes('rate (%)')
    ? `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`
    : label.toLowerCase().includes('units')
      ? Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : currency.format(value);

export default function FunctionalCalculatorPage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const calculator = calculators.find((item) => item.id === slug);
  const engine = getCalculatorEngine(slug);
  const [values, setValues] = useState(() => Object.fromEntries(
    (engine?.fields || []).map(({ id, defaultValue }) => [id, defaultValue])
  ));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const description = useMemo(
    () => calculator
      ? `Enter your figures to use the ${calculator.name}. Review the assumptions before relying on an estimate.`
      : '',
    [calculator]
  );

  if (!calculator || !engine) return <Navigate to="/calculators" replace />;

  const submit = (event) => {
    event.preventDefault();
    try {
      setResult(calculateWithEngine(slug, values));
      setError('');
    } catch (calculationError) {
      setResult(null);
      setError(calculationError.message);
    }
  };

  const saveCalculator = async () => {
    setIsSavingBookmark(true);
    try {
      const { data } = await api.get(`/v1/calculators/${slug}`);
      await api.post('/user/bookmarks', {
        targetType: 'Calculator',
        targetId: data.item.id
      });
      toast('Calculator saved to your bookmarks.', 'success');
    } catch (saveError) {
      const message = saveError.response?.status === 401
        ? 'Sign in to save calculators.'
        : saveError.response?.data?.message || 'Could not save this calculator.';
      toast(message, 'error');
    } finally {
      setIsSavingBookmark(false);
    }
  };

  return (
    <CalculatorPageLayout
      title={calculator.name}
      category={calculator.category}
      description={description}
      disclaimer="This tool provides an illustrative estimate, not tax, investment, or legal advice. Check the assumptions and consult a qualified professional where appropriate."
    >
      <section className="container-shell grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <form onSubmit={submit} className="card-surface h-fit space-y-5 p-6 sm:p-8">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-navy">Enter your details</h2>
              <p className="mt-2 text-sm text-muted">Change the example values to match your scenario.</p>
            </div>
            <Button type="button" variant="secondary" className="px-3 py-2" loading={isSavingBookmark} onClick={saveCalculator}>
              <Bookmark size={16} />Save
            </Button>
          </div>
          {engine.fields.map(({ id, label, min, max, step, hint }) => (
            <div key={id}>
              <label htmlFor={`calculator-${id}`} className="mb-2 block text-sm font-semibold text-slate-700">
                {label}
              </label>
              <input
                id={`calculator-${id}`}
                type="number"
                required
                min={min}
                max={max}
                step={step}
                value={values[id]}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [id]: event.target.value }));
                  setResult(null);
                }}
                className="form-control"
              />
              {hint && <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>}
            </div>
          ))}
          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit"><Calculator size={17} className="mr-2 inline" />Calculate</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setValues(Object.fromEntries(engine.fields.map(({ id, defaultValue }) => [id, defaultValue])));
                setResult(null);
                setError('');
              }}
            >
              <RotateCcw size={16} className="mr-2 inline" />Reset
            </Button>
          </div>
        </form>

        <section aria-live="polite" className="space-y-5">
          {result ? (
            <article className="card-surface p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Estimate</p>
              <h2 className="mt-3 text-lg font-semibold text-muted">{result.primaryLabel}</h2>
              <p className="mt-1 break-words text-3xl font-black text-navy sm:text-4xl">
                {formatValue(result.primaryLabel, result.primaryValue)}
              </p>
              {result.metrics.length > 0 && (
                <dl className="mt-6 space-y-3 border-t border-border pt-5">
                  {result.metrics.map(({ label: metricLabel, value }) => (
                    <div key={metricLabel} className="flex justify-between gap-4 text-sm">
                      <dt className="text-muted">{metricLabel}</dt>
                      <dd className="text-right font-semibold text-text">{formatValue(metricLabel, value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          ) : (
            <div className="card-surface flex min-h-56 flex-col items-center justify-center p-8 text-center">
              <Calculator size={28} className="text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-navy">Your result will appear here</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">Enter your values and calculate to see an estimate with its assumptions.</p>
            </div>
          )}

          <aside className="flex items-start gap-3 rounded-2xl border border-border bg-secondary p-5 text-sm leading-6 text-body">
            <Info size={18} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-heading">Calculation assumptions</h2>
              {engine.assumptions.length ? (
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {engine.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                </ul>
              ) : (
                <p className="mt-2">Uses the values entered; excludes other costs or adjustments not shown above.</p>
              )}
            </div>
          </aside>
        </section>
      </section>
    </CalculatorPageLayout>
  );
}
