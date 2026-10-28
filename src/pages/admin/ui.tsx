import React, { useEffect } from 'react';
import { CustomSelect } from '../../components/CustomSelect';

export const inputCls =
  'w-full bg-white border border-[#c6c5d0] rounded-lg px-3 py-2 text-[13px] text-[#191c1e] placeholder:text-[#b0b3ba] focus:outline-none focus:border-[#4156b8] focus:ring-2 focus:ring-[#4156b8]/20 transition-all disabled:bg-[#f7f9fb]';

export const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#061748] text-white hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-[#45464f] border border-[#c6c5d0] hover:bg-[#f2f4f6] transition-colors cursor-pointer';

export const Field: React.FC<{ label: string; hint?: string; className?: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  hint,
  className = '',
  required = false,
  children,
}) => (
  <label className={`block ${className}`}>
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#596276] mb-1.5 block">
      {label}{required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
    </span>
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
  <section className={`bg-white rounded-2xl border border-[#e8ebf1] shadow-[0_1px_3px_rgba(20,35,68,0.04)] p-4 sm:p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          {title && <h2 className="text-base font-semibold text-[#142344]">{title}</h2>}
          {subtitle && <p className="text-xs text-[#7b8497] mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; flush?: boolean; fixedHeight?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
  flush,
  fixedHeight,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div className="fixed inset-0 bg-[#061748]/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[calc(100dvh-1.5rem)] flex flex-col ${fixedHeight ? 'h-[min(85dvh,820px)]' : flush ? 'h-[min(90dvh,760px)]' : ''} bg-white rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#eceef0] shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-[#061748] min-w-0 break-words">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full flex items-center justify-center text-[#767680] hover:bg-[#f2f4f6] hover:text-[#061748] cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={`${flush || fixedHeight ? 'flex flex-col min-h-0 flex-1' : 'p-4 sm:p-8 overflow-y-auto min-h-0'} ${fixedHeight ? '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''}`}>{children}</div>
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

export const Pagination: React.FC<{
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}> = ({ page, pageSize, total, onPageChange, onPageSizeChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = total ? (currentPage - 1) * pageSize : 0;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[#eceef0] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-[#737d91]">
        <label htmlFor="admin-page-size">Mostrar</label>
        <CustomSelect
          id="admin-page-size"
          aria-label="Itens por página"
          className="!min-h-0 !w-20 !gap-1.5 !rounded-lg !px-2 !py-1.5 !text-xs"
          value={pageSize}
          onChange={onPageSizeChange}
          options={[15, 25, 50].map((size) => ({ value: size, label: size }))}
        />
        <span>por página</span>
        <span className="ml-2 text-[#929bad]">
          {total ? `${pageStart + 1}–${Math.min(pageStart + pageSize, total)} de ${total}` : '0 resultados'}
        </span>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          className="rounded-lg border border-[#e1e5ec] px-3 py-1.5 text-xs font-medium text-[#47536a] transition hover:bg-[#f7f8fa] hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
        >
          Anterior
        </button>
        <span className="min-w-16 text-center text-xs text-[#737d91]">
          {currentPage} / {pageCount}
        </span>
        <button
          type="button"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(Math.min(currentPage + 1, pageCount))}
          className="rounded-lg border border-[#e1e5ec] px-3 py-1.5 text-xs font-medium text-[#47536a] transition hover:bg-[#f7f8fa] hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
        >
          Próxima
        </button>
      </div>
    </div>
  );
};

export const STORAGE_FULL_MSG = 'Não foi possível salvar: o armazenamento do navegador está cheio. Use fotos menores ou links de imagem.';
