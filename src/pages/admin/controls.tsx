import React from 'react';
import { ghostBtn, Modal } from './ui';

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, description, disabled }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e8ebf1] bg-[#fafbfc] px-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#24324b]">{label}</p>
      {description && <p className="mt-0.5 text-xs text-[#7b8497]">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[#4156b8]' : 'bg-[#cdd3de]'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

export const ConfirmDialog: React.FC<{
  title: string;
  heading: string;
  message: string;
  subjectLabel: string;
  subject: string;
  confirmLabel: string;
  cancelLabel: string;
  icon?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ title, heading, message, subjectLabel, subject, confirmLabel, cancelLabel, icon = 'delete_forever', danger = true, busy, onConfirm, onClose }) => (
  <Modal title={title} onClose={onClose}>
    <div className="space-y-5">
      <div className={`flex items-start gap-4 rounded-2xl border p-4 ${danger ? 'border-red-100 bg-red-50/70' : 'border-[#e3e7f5] bg-[#f4f6fd]'}`}>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ${danger ? 'text-red-600 ring-red-100' : 'text-[#4156b8] ring-[#e3e7f5]'}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </span>
        <div className="min-w-0 pt-0.5">
          <p className={`text-sm font-bold ${danger ? 'text-[#8f2525]' : 'text-[#142344]'}`}>{heading}</p>
          <p className={`mt-1 text-xs leading-relaxed ${danger ? 'text-[#785b5b]' : 'text-[#5b6680]'}`}>{message}</p>
        </div>
      </div>
      <div className="rounded-xl border border-[#e8ebf1] bg-[#fafbfc] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8992a4]">{subjectLabel}</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#24324b]">{subject}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-[#edf0f5] pt-4 sm:flex-row sm:justify-end">
        <button type="button" className={`${ghostBtn} sm:min-w-28`} onClick={onClose}>{cancelLabel}</button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 sm:min-w-36 ${
            danger ? 'bg-[#b42318] hover:bg-[#912018] focus:ring-red-300' : 'bg-[#061748] hover:bg-[#0a2060] focus:ring-[#4156b8]/40'
          }`}
        >
          {busy ? 'Aguarde...' : confirmLabel}
        </button>
      </div>
    </div>
  </Modal>
);
