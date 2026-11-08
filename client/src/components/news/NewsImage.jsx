import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';

export default function NewsImage({ src, alt, category, className = '' }) {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setUnavailable(false);
  }, [src]);

  return (
    <div
      className={`relative grid overflow-hidden bg-gradient-to-br from-soft-blue via-secondary to-card text-primary ${className}`}
      role={!src || unavailable ? 'img' : undefined}
      aria-label={!src || unavailable ? `${category || 'News'} image unavailable` : undefined}
    >
      {src && !unavailable ? (
        <img
          src={src}
          alt={alt || category || 'News'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setUnavailable(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <Newspaper size={34} aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Aloka News</span>
          <span className="text-sm font-semibold text-body">{category || 'Latest headlines'}</span>
        </div>
      )}
    </div>
  );
}
