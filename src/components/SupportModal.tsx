import React, { useState } from 'react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [msg, setMsg] = useState('Olá! Tenho uma dúvida sobre a conferência da minha receita médica para o modelo Aura Titanium.');

  if (!isOpen) return null;

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/5511987654321?text=${encoded}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 flex flex-col">
        {/* Header */}
        <div className="bg-[#061748] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </div>
            <div>
              <h3 className="text-sm font-bold">Concierge Óptico Óticas Brasil</h3>
              <span className="text-[11px] text-[#b6c4fe] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Online agora
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-start gap-2.5 text-emerald-900">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">verified_user</span>
            <p className="text-[11px] leading-relaxed">
              Nosso time técnico é composto exclusivamente por ópticos registrados no CBOO, prontos para orientar sobre espessura de lentes, cilindros, dioptrias e medidas faciais.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-[#061748]">Sua Mensagem para o Especialista:</label>
            <textarea
              rows={3}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full bg-[#f2f4f6] p-3 rounded-xl border border-[#c6c5d0] focus:outline-none focus:border-[#4156b8] text-xs font-medium text-[#191c1e]"
            />
          </div>

          <button
            onClick={handleSendWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>Iniciar Conversa no WhatsApp</span>
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
