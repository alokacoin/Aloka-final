import { ArrowRight, Calculator, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CalculatorCard({ calculator, href, featured = false }) {
  return (
    <article className={`flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 ${featured ? 'sm:p-6' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-soft-blue text-primary">
          <Calculator size={19} aria-hidden="true" />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          calculator.status === 'available' ? 'bg-success/10 text-success' : 'bg-secondary text-muted'
        }`}>
          {calculator.status === 'available' ? 'Available' : 'Coming soon'}
        </span>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{calculator.category}</p>
      <h3 className="mt-2 text-lg font-bold leading-snug text-heading">{calculator.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">
        {calculator.status === 'available'
          ? 'Enter your values to calculate an estimate and review the assumptions.'
          : 'This calculator is listed in the hub and planned for a future release. Its calculation is not available yet.'}
      </p>
      {href ? (
        <Link to={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Calculate now <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted" aria-label={`${calculator.name} coming soon`}>
          <Clock3 size={15} aria-hidden="true" /> Planned for a later stage
        </span>
      )}
    </article>
  );
}
