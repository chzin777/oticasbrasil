import React, { useState } from 'react';
import { PaymentMethod } from '../types';

interface StepPaymentProps {
  paymentMethod: PaymentMethod;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  pixDiscountAmount: number;
  totalWithPix: number;
  totalRegular: number;
}

export const StepPayment: React.FC<StepPaymentProps> = ({
  paymentMethod,
  onSelectPaymentMethod,
  pixDiscountAmount,
  totalWithPix,
  totalRegular
}) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('BEATRIZ M SILVEIRA');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('842');
  const [installments, setInstallments] = useState('10');

  const demoPixCode = '00020126580014br.gov.bcb.pix0136ob-98241-otica-brasil-pix-instant5204000053039865405845.505802BR5913OTICAS BRASIL6009SAO PAULO62070503***6304E8A2';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(demoPixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  return (
    <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#eceef0] flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-[#061748] text-white text-xs flex items-center justify-center font-bold">
          4
        </span>
        <div>
          <h2 className="text-xl text-[#061748] font-semibold tracking-tight">
            Forma de Pagamento
          </h2>
          <p className="text-xs text-[#45464f] mt-0.5">
            Transação 100% segura com confirmação imediata.
          </p>
        </div>
      </div>

      {/* Payment Tabs */}
      <div className="flex flex-wrap gap-2 bg-[#f2f4f6] p-1.5 rounded-full">
        {/* Pix Button */}
        <button
          type="button"
          onClick={() => onSelectPaymentMethod('pix')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            paymentMethod === 'pix'
              ? 'bg-[#061748] text-white shadow-sm'
              : 'text-[#45464f] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
          <span>Pix Instantâneo</span>
          <span className="bg-[#F7915E] text-white text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
            5% OFF
          </span>
        </button>

        {/* Card Button */}
        <button
          type="button"
          onClick={() => onSelectPaymentMethod('card')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            paymentMethod === 'card'
              ? 'bg-[#061748] text-white shadow-sm'
              : 'text-[#45464f] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">credit_card</span>
          <span>Cartão de Crédito</span>
          <span className="font-normal text-[11px] text-[#7481b7] hidden sm:inline">(em até 10x)</span>
        </button>

        {/* Boleto Button */}
        <button
          type="button"
          onClick={() => onSelectPaymentMethod('boleto')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            paymentMethod === 'boleto'
              ? 'bg-[#061748] text-white shadow-sm'
              : 'text-[#45464f] hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">barcode</span>
          <span>Boleto</span>
        </button>
      </div>

      {/* PIX Content Panel */}
      {paymentMethod === 'pix' && (
        <div className="bg-[#f2f4f6] p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 border border-[#e0e3e5] animate-fadeIn">
          {/* Visual QR Code Mockup */}
          <div className="w-32 h-32 bg-white p-2 rounded-xl flex flex-col items-center justify-center shadow-sm flex-shrink-0 border border-[#c6c5d0]/30 relative group">
            <svg className="w-28 h-28 text-[#061748]" fill="currentColor" viewBox="0 0 100 100">
              <rect height="25" rx="3" width="25" x="10" y="10" />
              <rect height="25" rx="3" width="25" x="65" y="10" />
              <rect height="25" rx="3" width="25" x="10" y="65" />
              <rect height="10" width="10" x="45" y="45" />
              <rect height="10" width="10" x="40" y="15" />
              <rect height="15" width="10" x="75" y="45" />
              <rect height="10" width="20" x="45" y="75" />
              <rect height="15" width="15" x="70" y="70" />
            </svg>
            <div className="absolute inset-0 bg-[#061748]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] font-bold bg-white text-[#061748] px-2 py-0.5 rounded shadow">
                QR Oficial
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center md:text-left flex-1">
            <span className="text-sm font-bold text-[#061748] flex items-center justify-center md:justify-start gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-[#F7915E]">savings</span>
              <span>Você economiza R$ {pixDiscountAmount.toFixed(2).replace('.', ',')} pagando no Pix!</span>
            </span>
            <p className="text-xs text-[#45464f] leading-relaxed">
              O QR Code oficial com validade de 30 minutos e o código &ldquo;Copia e Cola&rdquo; serão exibidos imediatamente após a finalização. Seu pedido é faturado no mesmo segundo para acelerar a confecção das lentes.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4156b8]">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Aprovação sem espera de compensação</span>
              </div>
              <button
                type="button"
                onClick={handleCopyPix}
                className="text-xs font-bold text-[#061748] bg-white border border-[#c6c5d0] px-3 py-1 rounded-full hover:bg-[#eceef0] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>{copiedPix ? '✓ Código Copiado!' : 'Copiar Chave Pix'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Card Content Panel */}
      {paymentMethod === 'card' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card Number */}
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#45464f]">Número do Cartão de Crédito</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 border border-transparent font-medium"
                />
                <span className="material-symbols-outlined absolute right-4 top-2.5 text-[#45464f] text-[20px]">
                  credit_card
                </span>
              </div>
            </div>

            {/* Holder Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#45464f]">Nome Impresso no Cartão</label>
              <input
                type="text"
                placeholder="Como consta no cartão"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 border border-transparent font-medium uppercase"
              />
            </div>

            {/* Expiry & CVV */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#45464f]">Validade</label>
                <input
                  type="text"
                  placeholder="MM/AA"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 border border-transparent font-medium"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#45464f]">CVV</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="123"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 border border-transparent font-medium"
                />
              </div>
            </div>

            {/* Installments */}
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#45464f]">Opções de Parcelamento</label>
              <select
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="w-full bg-[#f2f4f6] px-4 py-2.5 rounded-full text-sm text-[#191c1e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4156b8]/40 cursor-pointer border border-transparent font-medium"
              >
                <option value="10">10x de R$ {(totalRegular / 10).toFixed(2).replace('.', ',')} sem juros (Total: R$ {totalRegular.toFixed(2).replace('.', ',')})</option>
                <option value="8">8x de R$ {(totalRegular / 8).toFixed(2).replace('.', ',')} sem juros</option>
                <option value="6">6x de R$ {(totalRegular / 6).toFixed(2).replace('.', ',')} sem juros</option>
                <option value="3">3x de R$ {(totalRegular / 3).toFixed(2).replace('.', ',')} sem juros</option>
                <option value="1">1x de R$ {totalRegular.toFixed(2).replace('.', ',')} à vista</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Boleto Panel */}
      {paymentMethod === 'boleto' && (
        <div className="bg-[#f2f4f6] p-6 rounded-xl flex flex-col gap-2 border border-[#e0e3e5] animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#061748]">barcode_scanner</span>
            <span className="text-sm font-bold text-[#061748]">Boleto Bancário à Vista</span>
          </div>
          <p className="text-xs text-[#45464f] leading-relaxed">
            Compensação em até 2 dias úteis. A montagem óptica terá início após a confirmação do pagamento bancário pelo sistema financeiro nacional.
          </p>
          <div className="mt-2 p-3 bg-white rounded-lg border border-[#c6c5d0] flex items-center justify-between text-xs">
            <span className="font-mono text-[#061748] tracking-wider font-semibold">
              34191.79001 01043.510047 91020.150008 4 98250000089000
            </span>
            <span className="text-[10px] bg-[#dde1ff] text-[#001257] px-2 py-0.5 rounded font-bold">
              Itaú Óticas
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
