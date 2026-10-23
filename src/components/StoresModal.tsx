import React from 'react';
import { OPTICAL_STORES } from '../data/mockData';

interface StoresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoresModal: React.FC<StoresModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#061748] text-white p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#dbee2c]">
              Atendimento Presencial
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Nossas Lojas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* List of stores */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          <p className="text-xs text-[#45464f]">
            Visite nossas unidades para ajuste anatômico gratuito da sua armação, medição digital de DNP por vídeo-computação e consultoria com ópticos diplomados.
          </p>

          <div className="flex flex-col gap-3">
            {OPTICAL_STORES.map((store) => (
              <div
                key={store.id}
                className="bg-[#f2f4f6] p-4 rounded-2xl border border-[#e0e3e5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#061748]">{store.name}</h4>
                    {store.hasLab && (
                      <span className="text-[10px] bg-[#dde1ff] text-[#001257] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">lens</span> Lab Próprio 1h
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#191c1e] font-medium">{store.address}</p>
                  <p className="text-xs text-[#45464f]">{store.neighborhood} - {store.city}</p>
                  <p className="text-[11px] text-[#45464f] mt-1">Horário: {store.hours}</p>
                </div>

                <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                  <a
                    href={`https://wa.me/5511987654321?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20um%20ajuste%20na%20unidade%20${encodeURIComponent(store.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none bg-[#061748] text-white text-xs font-bold px-4 py-2 rounded-full hover:brightness-125 text-center cursor-pointer transition-all"
                  >
                    Agendar Ajuste
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f2f4f6] border-t border-[#e0e3e5] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#061748] text-white text-xs font-bold px-5 py-2 rounded-full cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
