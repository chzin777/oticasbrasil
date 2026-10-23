import React from 'react';

export const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-b border-[#eceef0] pb-4 mb-4 last:border-0">
    <h3 className="text-xs font-bold uppercase tracking-wider text-[#061748] mb-3">{title}</h3>
    <div className="flex flex-col gap-2">{children}</div>
  </div>
);

export const CheckboxItem = ({ label, checked, onClick, count }: { label: string; checked: boolean; onClick: () => void; count?: number }) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${checked ? 'bg-[#4156b8] border-[#4156b8]' : 'border-[#c6c5d0] bg-white group-hover:border-[#4156b8]/50'}`}>
      {checked && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onClick} />
    <span className={`text-sm flex-1 ${checked ? 'text-[#061748] font-semibold' : 'text-[#45464f] group-hover:text-[#061748]'}`}>{label}</span>
    {count !== undefined && <span className="text-[10px] text-[#999]">({count})</span>}
  </label>
);
