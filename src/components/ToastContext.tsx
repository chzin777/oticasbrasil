import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastKind = 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  dark: boolean;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, title: string, description?: string) => {
    const dark = document.documentElement.classList.contains('dark');
    const toast = { id: ++nextToastId, kind, title, description, dark };
    setToasts((current) => [...current.slice(-2), toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 4000);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (title, description) => push('success', title, description),
    error: (title, description) => push('error', title, description),
  }), [push]);

  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 && createPortal(
        <div
          aria-live="polite"
          aria-relevant="additions removals"
          className="pointer-events-none fixed bottom-5 right-4 z-[999999] flex w-[356px] max-w-[calc(100vw-32px)] flex-col gap-3 sm:bottom-6 sm:right-8"
        >
          {toasts.map((toast) => {
            const background = toast.dark
              ? toast.kind === 'error' ? '#7f1d1d' : '#051647'
              : toast.kind === 'error' ? '#fef2f2' : '#ffffff';
            const color = toast.dark ? '#ffffff' : toast.kind === 'error' ? '#7f1d1d' : '#051647';

            return (
              <div
                key={toast.id}
                role={toast.kind === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto relative overflow-hidden rounded-xl shadow-[0_12px_35px_rgba(5,22,71,0.2)] ring-1 ring-slate-200/80 animate-[toast-enter_220ms_ease-out]"
                style={{ background, color }}
              >
                <div className="flex items-start gap-3 p-4">
                  <span className={`material-symbols-outlined mt-0.5 text-[20px] ${toast.kind === 'error' ? 'text-[#F7915E]' : 'text-[#94a300]'}`}>
                    {toast.kind === 'error' ? 'error' : 'check_circle'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-5">{toast.title}</p>
                    {toast.description && <p className="mt-1 text-xs leading-relaxed opacity-75">{toast.description}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar notificação"
                    onClick={() => dismiss(toast.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-60 transition hover:bg-black/5 hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-1 origin-left animate-[toast-progress_4s_linear_forwards] ${toast.kind === 'error' ? 'bg-[#F7915E]' : 'bg-[#C4D600]'}`}
                />
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider.');
  return context;
}
