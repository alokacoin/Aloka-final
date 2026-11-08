export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className = ''
}) {
  const alignment = align === 'center' ? 'mx-auto text-center' : '';

  return (
    <div className={`max-w-3xl ${alignment} ${className}`.trim()}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">
          {eyebrow}
        </p>
      )}
      <h2 className="section-title mt-3">{title}</h2>
      {description && <p className="mt-4 text-slate-600">{description}</p>}
    </div>
  );
}
