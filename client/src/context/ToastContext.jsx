import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);
const toastStyles = {
  success: { icon: CheckCircle2, color: 'text-success' },
  error: { icon: TriangleAlert, color: 'text-error' },
  info: { icon: Info, color: 'text-info' }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((toast) => toast.id !== id));
  }, []);
  const toast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, type: toastStyles[type] ? type : 'info' }]);
    window.setTimeout(() => dismiss(id), 5000);
    return id;
  }, [dismiss]);
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed right-4 top-4 z-[110] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite" aria-relevant="additions">
          {toasts.map(({ id, message, type }) => {
            const Icon = toastStyles[type].icon;
            return (
              <div key={id} role={type === 'error' ? 'alert' : 'status'} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-body shadow-soft">
                <Icon size={20} className={`mt-0.5 shrink-0 ${toastStyles[type].color}`} aria-hidden="true" />
                <p className="flex-1 text-sm">{message}</p>
                <button type="button" onClick={() => dismiss(id)} aria-label="Dismiss notification" className="text-muted hover:text-heading">
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider.');
  return context;
}
