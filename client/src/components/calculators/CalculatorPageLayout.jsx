import { ArrowLeft, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CalculatorPageLayout({
  title,
  description,
  category = 'Financial calculator',
  image,
  children,
  disclaimer
}) {
  return (
    <main className="min-h-screen bg-background">
      <header className="relative isolate overflow-hidden bg-navy py-14 text-white sm:py-20">
        {image && (
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/95 to-navy/75" />
        <div className="container-shell">
          <Link to="/calculators" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-200 hover:text-white">
            <ArrowLeft size={16} aria-hidden="true" /> All calculators
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold backdrop-blur-sm">
            <Calculator size={15} aria-hidden="true" /> {category}
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-200">{description}</p>
        </div>
      </header>
      {children}
      {disclaimer && (
        <aside className="container-shell pb-10 text-sm leading-6 text-muted" aria-label="Calculator disclaimer">
          {disclaimer}
        </aside>
      )}
    </main>
  );
}
