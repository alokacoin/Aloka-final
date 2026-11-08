import { forwardRef } from 'react';

const variants = {
  primary: 'primary-btn',
  secondary: 'secondary-btn',
  ghost: 'ghost-btn',
  danger: 'danger-btn'
};

const Button = forwardRef(function Button(
  { variant = 'primary', className = '', children, loading = false, disabled = false, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${variants[variant] || variants.primary} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span aria-hidden="true" className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  );
});

export default Button;
