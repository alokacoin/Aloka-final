import { forwardRef } from 'react';

const TextInput = forwardRef(function TextInput(
  { id, label, error, hint, className = '', ...props },
  ref
) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      {label && <label htmlFor={id} className="block text-sm font-medium text-body">{label}</label>}
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`form-control ${error ? 'form-control-error' : ''} ${className}`.trim()}
        {...props}
      />
      {hint && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-error">{error}</p>}
    </div>
  );
});

export default TextInput;
