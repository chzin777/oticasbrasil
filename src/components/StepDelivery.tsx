import React, { useState } from 'react';
import { AddressData, DeliveryMethod } from '../types';

interface StepDeliveryProps {
  address: AddressData;
  onUpdateAddress: (updated: AddressData) => void;
  deliveryMethod: DeliveryMethod;
  onSelectDeliveryMethod: (method: DeliveryMethod) => void;
  onOpenCepModal: () => void;
}

export const StepDelivery: React.FC<StepDeliveryProps> = ({
  address,
  onUpdateAddress,
  deliveryMethod,
  onSelectDeliveryMethod,
  onOpenCepModal
}) => {
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [cepInput, setCepInput] = useState(address.cep);
  const [tempAddress, setTempAddress] = useState(address);
  const [calculating, setCalculating] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string | null>(null);

  const handleCalculateCep = () => {
    setCalculating(true);
    setCepFeedback(null);
    setTimeout(() => {
      setCalculating(false);
      setCepFeedback('Frete Correios gratuito aplicado com sucesso!');
      setTimeout(() => setCepFeedback(null), 4000);
    }, 600);
  };

  const handleSaveAddress = () => {
    onUpdateAddress(tempAddress);
    setIsEditingAddress(false);
  };

  return (
    <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#eceef0] flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-[#061748] text-white text-xs flex items-center justify-center font-bold">
          2
        </span>
        <div>
          <h2 className="text-xl text-[#061748] font-semibold tracking-tight">
            Entrega &amp; Endereço
          </h2>
          <p className="text-xs text-[#45464f] mt-0.5">
            Envio protegido com estojo rígido e flanela microfibra inclusos.
          </p>
        </div>
      </div>

      {/* CEP Row */}
      <div className="pt-1 flex flex-col sm:flex-row gap-3 items-start sm:items-center max-w-md">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={cepInput}
            onChange={(e) => setCepInput(e.target.value)}
            placeholder="00000-000"
            className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 border border-transparent font-medium"
          />
        </div>
        <button
          type="button"
          onClick={handleCalculateCep}
          disabled={calculating}
          className="bg-[#061748] text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:brightness-125 transition-all whitespace-nowrap cursor-pointer shadow-sm active:scale-95"
        >
          {calculating ? 'Calculando...' : 'Calcular Frete'}
        </button>
        <button
          type="button"
          onClick={onOpenCepModal}
          className="text-xs text-[#4156b8] underline cursor-pointer hover:text-[#061748] whitespace-nowrap"
        >
          Não sei meu CEP
        </button>
      </div>

      {cepFeedback && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{cepFeedback}</span>
        </div>
      )}

      {/* Shipping Options Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Option 1: Sedex Especial (Selected by default) */}
        <label
          onClick={() => onSelectDeliveryMethod('sedex')}
          className={`cursor-pointer relative p-4 rounded-xl flex flex-col gap-2 transition-all border ${
            deliveryMethod === 'sedex'
              ? 'bg-[#f2f4f6] border-[#4156b8]/40 shadow-sm ring-1 ring-[#4156b8]/20'
              : 'bg-white border-[#eceef0] hover:bg-[#f7f9fb]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="shipping"
                checked={deliveryMethod === 'sedex'}
                onChange={() => onSelectDeliveryMethod('sedex')}
                className="accent-[#4156b8] w-4 h-4 cursor-pointer"
              />
              <span className="text-sm font-bold text-[#061748]">Correios</span>
            </div>
            <span className="bg-[#dbee2c] text-[#061748] text-[11px] px-2.5 py-0.5 rounded-full font-bold">
              GRÁTIS
            </span>
          </div>
          <p className="text-xs text-[#45464f] pl-6 leading-relaxed">
            Entrega em 2 a 4 dias úteis com rastreamento prioritário e seguro integral de lente.
          </p>
          <div className="pl-6 flex items-center gap-1.5 text-[#263d9f] text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            <span>Seguro total contra extravio</span>
          </div>
        </label>

        {/* Option 2: Store Pickup */}
        <label
          onClick={() => onSelectDeliveryMethod('boutique')}
          className={`cursor-pointer relative p-4 rounded-xl flex flex-col gap-2 transition-all border ${
            deliveryMethod === 'boutique'
              ? 'bg-[#f2f4f6] border-[#4156b8]/40 shadow-sm ring-1 ring-[#4156b8]/20'
              : 'bg-white border-[#eceef0] hover:bg-[#f7f9fb]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="shipping"
                checked={deliveryMethod === 'boutique'}
                onChange={() => onSelectDeliveryMethod('boutique')}
                className="accent-[#4156b8] w-4 h-4 cursor-pointer"
              />
              <span className="text-sm font-bold text-[#061748]">Retirada na Loja</span>
            </div>
            <span className="bg-[#eceef0] text-[#45464f] text-[11px] px-2.5 py-0.5 rounded-full font-bold">
              GRÁTIS
            </span>
          </div>
          <p className="text-xs text-[#45464f] pl-6 leading-relaxed">
            Pronto em 48h na Unidade Flagship Oscar Freire, Jardins - SP com ajuste facial de cortesia.
          </p>
          <div className="pl-6 flex items-center gap-1.5 text-[#4156b8] text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[16px]">store</span>
            <span>Ajuste óptico presencial</span>
          </div>
        </label>
      </div>

      {/* Street Address Confirmation Preview or Edit form */}
      {!isEditingAddress ? (
        <div className="bg-[#f2f4f6] p-4 rounded-xl flex items-center justify-between text-[#45464f] border border-[#e0e3e5]">
          <div className="flex items-center gap-2 text-[#191c1e] text-xs sm:text-sm">
            <span className="material-symbols-outlined text-[#4156b8] text-[20px] flex-shrink-0">
              pin_drop
            </span>
            <span>
              {address.street}, {address.number}{address.complement ? `, ${address.complement}` : ''} - {address.neighborhood}, {address.city} - {address.state}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setTempAddress(address);
              setIsEditingAddress(true);
            }}
            className="text-xs font-bold text-[#4156b8] hover:underline cursor-pointer ml-3 flex-shrink-0"
          >
            Editar
          </button>
        </div>
      ) : (
        <div className="bg-[#f2f4f6] p-4 rounded-xl border border-[#4156b8]/30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#061748]">Editar Endereço de Entrega</span>
            <button
              type="button"
              onClick={() => setIsEditingAddress(false)}
              className="text-xs text-[#45464f] hover:text-[#191c1e]"
            >
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Logradouro"
              value={tempAddress.street}
              onChange={(e) => setTempAddress({ ...tempAddress, street: e.target.value })}
              className="sm:col-span-2 bg-white px-3 py-2 rounded-lg text-xs font-medium border border-[#c6c5d0]"
            />
            <input
              type="text"
              placeholder="Número"
              value={tempAddress.number}
              onChange={(e) => setTempAddress({ ...tempAddress, number: e.target.value })}
              className="bg-white px-3 py-2 rounded-lg text-xs font-medium border border-[#c6c5d0]"
            />
            <input
              type="text"
              placeholder="Complemento"
              value={tempAddress.complement}
              onChange={(e) => setTempAddress({ ...tempAddress, complement: e.target.value })}
              className="bg-white px-3 py-2 rounded-lg text-xs font-medium border border-[#c6c5d0]"
            />
            <input
              type="text"
              placeholder="Bairro"
              value={tempAddress.neighborhood}
              onChange={(e) => setTempAddress({ ...tempAddress, neighborhood: e.target.value })}
              className="bg-white px-3 py-2 rounded-lg text-xs font-medium border border-[#c6c5d0]"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cidade"
                value={tempAddress.city}
                onChange={(e) => setTempAddress({ ...tempAddress, city: e.target.value })}
                className="flex-1 bg-white px-3 py-2 rounded-lg text-xs font-medium border border-[#c6c5d0]"
              />
              <input
                type="text"
                placeholder="UF"
                value={tempAddress.state}
                onChange={(e) => setTempAddress({ ...tempAddress, state: e.target.value })}
                className="w-14 bg-white px-2 py-2 rounded-lg text-xs font-medium text-center border border-[#c6c5d0]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveAddress}
              className="bg-[#061748] text-white text-xs font-bold px-4 py-1.5 rounded-full hover:brightness-110 cursor-pointer"
            >
              Salvar Endereço
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
