export default function AboutPage() {
  return (
    <main className="container-shell py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">About us</p>
        <h1 className="mt-3 text-4xl font-black text-navy sm:text-5xl">A platform built for disciplined financial growth.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Aloka brings finance professionals, business owners, and curious readers together in one trusted place for learning, analysis, and confident action.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {[
          ['Independent perspective', 'We curate insights that prioritize clarity, compliance, and business relevance over hype.'],
          ['Expert community', 'From founders to CFOs, our members share practical knowledge grounded in real decision-making.'],
          ['Actionable results', 'Readers and clients get frameworks they can use immediately in strategy, compliance, and operations.']
        ].map(([title, text]) => (
          <div key={title} className="card-surface p-7">
            <h2 className="text-xl font-bold text-navy">{title}</h2>
            <p className="mt-4 text-slate-600">{text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
