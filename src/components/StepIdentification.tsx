import React from 'react';
import { CustomerData } from '../types';

interface StepIdentificationProps {
  customer: CustomerData;
  onChange: (updated: Partial<CustomerData>) => void;
}

export const StepIdentification: React.FC<StepIdentificationProps> = ({ customer, onChange }) => {
  return (
    <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#eceef0] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#061748] text-white text-xs flex items-center justify-center font-bold">
            1
          </span>
          <h2 className="text-xl text-[#061748] font-semibold tracking-tight">
            Identificação &amp; Contato
          </h2>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#4156b8] flex items-center gap-1 bg-[#dde1ff]/40 px-2.5 py-1 rounded-full">
          <span className="material-symbols-outlined text-[16px]">check_circle</span> Pronto
        </span>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#45464f]">Nome Completo</label>
          <input
            type="text"
            value={customer.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 transition-all font-medium border border-transparent focus:border-[#4156b8]/30"
            placeholder="Seu nome completo"
          />
        </div>

        {/* CPF */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#45464f]">CPF (para emissão da Nota Fiscal)</label>
          <input
            type="text"
            value={customer.cpf}
            onChange={(e) => onChange({ cpf: e.target.value })}
            className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 transition-all font-medium border border-transparent focus:border-[#4156b8]/30"
            placeholder="000.000.000-00"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#45464f]">E-mail Principal</label>
          <input
            type="email"
            value={customer.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 transition-all font-medium border border-transparent focus:border-[#4156b8]/30"
            placeholder="seu.email@exemplo.com"
          />
        </div>

        {/* WhatsApp */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#45464f]">WhatsApp (status da confecção óptica)</label>
          <div className="relative">
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 transition-all font-medium pl-10 border border-transparent focus:border-[#4156b8]/30"
              placeholder="(00) 00000-0000"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#4156b8] text-[20px] pointer-events-none">
              sms
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
