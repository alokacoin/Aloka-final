import { Link } from 'react-router-dom';

export default function AlokaLogo({ className = '', inverse = false, tagline = false, to = '/' }) {
  return (
    <Link
      to={to}
      aria-label="Aloka home"
      className={`inline-flex flex-col ${className}`.trim()}
    >
      <span className={`block text-xl font-extrabold tracking-tight ${inverse ? 'text-white' : 'text-primary'}`}>
        Aloka
      </span>
      {tagline && (
        <span className={`block text-[10px] leading-4 ${inverse ? 'text-slate-300' : 'text-muted'}`}>
          Your Finance. Your Knowledge. Your Aloka.
        </span>
      )}
    </Link>
  );
}
