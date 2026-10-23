import React, { useEffect } from 'react';

export const inputCls =
  'w-full bg-white border border-[#c6c5d0] rounded-xl px-3.5 py-2.5 text-sm text-[#191c1e] placeholder:text-[#b0b3ba] focus:outline-none focus:border-[#4156b8] focus:ring-2 focus:ring-[#4156b8]/20 transition-all disabled:bg-[#f7f9fb]';

export const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#061748] text-white hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-[#45464f] border border-[#c6c5d0] hover:bg-[#f2f4f6] transition-colors cursor-pointer';

export const Field: React.FC<{ label: string; hint?: string; className?: string; children: React.ReactNode }> = ({
  label,
  hint,
  className = '',
  children,
}) => (
  <label className={`block ${className}`}>
    <span className="text-[11px] font-bold uppercase tracking-wider text-[#45464f] mb-1.5 block">{label}</span>
    {children}
    {hint && <span className="text-[11px] text-[#767680] mt-1 block">{hint}</span>}
  </label>
);

export const Card: React.FC<{ title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => (
  <section className={`bg-white rounded-3xl border border-[#eceef0] shadow-sm p-5 sm:p-6 ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {title && <h2 className="text-xl font-bold text-[#061748]">{title}</h2>}
          {subtitle && <p className="text-sm text-[#767680] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; flush?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
  flush,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div className="fixed inset-0 bg-[#061748]/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[calc(100dvh-1.5rem)] flex flex-col ${flush ? 'h-[min(90dvh,760px)]' : ''} bg-white rounded-3xl shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#eceef0] shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-[#061748] min-w-0 break-words">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full flex items-center justify-center text-[#767680] hover:bg-[#f2f4f6] hover:text-[#061748] cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={flush ? 'flex flex-col min-h-0 flex-1' : 'p-4 sm:p-8 overflow-y-auto min-h-0'}>{children}</div>
      </div>
    </div>
  );
};

export const Notice: React.FC<{ kind: 'ok' | 'error'; children: React.ReactNode }> = ({ kind, children }) => (
  <div
    className={`flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border ${
      kind === 'ok' ? 'bg-[#f4f9d0] border-[#C4D600]/60 text-[#061748]' : 'bg-red-50 border-red-200 text-red-700'
    }`}
  >
    <span className="material-symbols-outlined text-[18px]">{kind === 'ok' ? 'check_circle' : 'error'}</span>
    {children}
  </div>
);

export const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export const STORAGE_FULL_MSG = 'Não foi possível salvar: o armazenamento do navegador está cheio. Use fotos menores ou links de imagem.';
