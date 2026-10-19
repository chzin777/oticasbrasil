import React, { useState } from 'react';
import { AddressData } from '../types';

interface CepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAddress: (address: Partial<AddressData>) => void;
}

export const CepModal: React.FC<CepModalProps> = ({ isOpen, onClose, onApplyAddress }) => {
  const [streetQuery, setStreetQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('São Paulo');

  if (!isOpen) return null;

  const sampleAddresses = [
    { cep: '01414-001', street: 'Rua Bela Cintra', neighborhood: 'Consolação', city: 'São Paulo', state: 'SP' },
    { cep: '01418-100', street: 'Rua Oscar Freire', neighborhood: 'Cerqueira César', city: 'São Paulo', state: 'SP' },
    { cep: '04538-133', street: 'Av. Brigadeiro Faria Lima', neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP' },
    { cep: '22640-100', street: 'Av. das Américas', neighborhood: 'Barra da Tijuca', city: 'Rio de Janeiro', state: 'RJ' }
  ];

  const filtered = sampleAddresses.filter(
    (a) =>
      a.street.toLowerCase().includes(streetQuery.toLowerCase()) ||
      a.cep.includes(streetQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 flex flex-col">
        {/* Header */}
        <div className="bg-[#061748] text-white p-5 flex items-center justify-between">
          <h3 className="text-base font-bold">Consulta de CEP</h3>
          <button onClick={onClose} className="text-white hover:opacity-80">✕</button>
        </div>

        {/* Input */}
        <div className="p-5 flex flex-col gap-3">
          <label className="text-xs font-semibold text-[#45464f]">Digite seu endereço ou bairro:</label>
          <input
            type="text"
            placeholder="Ex: Rua Oscar Freire ou Consolação"
            value={streetQuery}
            onChange={(e) => setStreetQuery(e.target.value)}
            className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-xs text-[#191c1e] border border-[#c6c5d0] focus:outline-none focus:border-[#4156b8]"
          />

          <div className="flex flex-col gap-2 mt-2 max-h-60 overflow-y-auto">
            {filtered.map((item) => (
              <div
                key={item.cep}
                onClick={() => {
                  onApplyAddress(item);
                  onClose();
                }}
                className="p-3 bg-[#f2f4f6] hover:bg-[#dde1ff]/40 rounded-xl cursor-pointer text-xs flex justify-between items-center transition-colors border border-[#e0e3e5]"
              >
                <div>
                  <strong className="block text-[#061748]">{item.street}</strong>
                  <span className="text-[#45464f]">{item.neighborhood} - {item.city}/{item.state}</span>
                </div>
                <span className="bg-white font-mono px-2 py-1 rounded text-[11px] font-bold text-[#4156b8] shadow-xs">
                  {item.cep}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[#f2f4f6] border-t border-[#e0e3e5] flex justify-end">
          <button
            onClick={onClose}
            className="text-xs text-[#45464f] hover:text-[#061748] font-bold px-3 py-1.5"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
