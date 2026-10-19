import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CustomerData, AddressData, OrderItem, PaymentMethod, PrescriptionData } from '../types';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerData;
  address: AddressData;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  totalAmount: number;
  prescription: PrescriptionData;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  customer,
  address,
  items,
  paymentMethod,
  totalAmount,
  prescription
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const orderNumber = 'OB-98241';
  const pixCopyCode = '00020126580014br.gov.bcb.pix0136ob-98241-otica-brasil-pix-instant5204000053039865405845.505802BR5913OTICAS BRASIL6009SAO PAULO62070503***6304E8A2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#061748] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#dbee2c] text-[#061748] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#dbee2c] font-bold">
                Pedido Finalizado com Sucesso
              </span>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Obrigado, {customer.name.split(' ')[0]}!
              </h2>
              <p className="text-xs text-[#b6c4fe] mt-0.5">
                Pedido #{orderNumber} • Notificações enviadas para {customer.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Optical Lab Workflow Tracker */}
          <div className="bg-[#f2f4f6] p-4 rounded-2xl border border-[#e0e3e5]">
            <h4 className="text-xs font-bold text-[#061748] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#4156b8]">precision_manufacturing</span>
              <span>Status do Laboratório Óptico</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex flex-col gap-1 items-start bg-white p-2.5 rounded-xl border border-emerald-300">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Etapa 1 • Concluída
                </span>
                <span className="font-bold text-[#061748]">Pedido Recebido</span>
                <span className="text-[11px] text-[#45464f]">Pagamento em processamento</span>
              </div>
              <div className="flex flex-col gap-1 items-start bg-white p-2.5 rounded-xl border border-[#4156b8]/40 shadow-xs">
                <span className="text-[10px] font-bold text-[#4156b8] bg-[#dde1ff] px-2 py-0.5 rounded-full">
                  Etapa 2 • Em Andamento
                </span>
                <span className="font-bold text-[#061748]">Conferência da Receita</span>
                <span className="text-[11px] text-[#45464f]">
                  {prescription.fileName ? 'Receita em análise' : prescription.sendViaWhatsApp ? 'Aguardando envio via WhatsApp' : 'Grau manual conferido'}
                </span>
              </div>
              <div className="flex flex-col gap-1 items-start bg-white/60 p-2.5 rounded-xl text-[#767680]">
                <span className="text-[10px] font-bold bg-[#eceef0] px-2 py-0.5 rounded-full">
                  Etapa 3
                </span>
                <span className="font-bold">Corte &amp; Lapidação</span>
                <span className="text-[11px]">Montagem na armação</span>
              </div>
              <div className="flex flex-col gap-1 items-start bg-white/60 p-2.5 rounded-xl text-[#767680]">
                <span className="text-[10px] font-bold bg-[#eceef0] px-2 py-0.5 rounded-full">
                  Etapa 4
                </span>
                <span className="font-bold">Expedição Sedex</span>
                <span className="text-[11px]">Seguro integral contra extravio</span>
              </div>
            </div>
          </div>

          {/* Pix Instructions if Pix was selected */}
          {paymentMethod === 'pix' && (
            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-28 bg-white p-2 rounded-xl shadow-xs border border-amber-300 flex items-center justify-center flex-shrink-0">
                <svg className="w-24 h-24 text-[#061748]" fill="currentColor" viewBox="0 0 100 100">
                  <rect height="25" rx="3" width="25" x="10" y="10" />
                  <rect height="25" rx="3" width="25" x="65" y="10" />
                  <rect height="25" rx="3" width="25" x="10" y="65" />
                  <rect height="10" width="10" x="45" y="45" />
                  <rect height="10" width="10" x="40" y="15" />
                  <rect height="15" width="10" x="75" y="45" />
                  <rect height="10" width="20" x="45" y="75" />
                  <rect height="15" width="15" x="70" y="70" />
                </svg>
              </div>
              <div className="flex-1 flex flex-col gap-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold text-[#061748]">Pague via Pix para faturamento instantâneo:</span>
                  <span className="text-xs font-extrabold text-[#061748] bg-[#dbee2c] px-2 py-0.5 rounded-full">
                    R$ {totalAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p className="text-xs text-[#45464f]">
                  Abra o aplicativo do seu banco, escolha &ldquo;Pagar com Pix&rdquo; e aponte a câmera para o QR Code ou cole o código abaixo:
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={pixCopyCode}
                    className="flex-1 bg-white border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-mono text-[#061748] truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pixCopyCode);
                      alert('Código Pix Copia e Cola copiado para sua área de transferência!');
                    }}
                    className="bg-[#061748] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:brightness-125 cursor-pointer whitespace-nowrap"
                  >
                    Copiar Código
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Items & Shipping Address recap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#f2f4f6] p-4 rounded-xl border border-[#e0e3e5]">
              <span className="text-[10px] font-bold text-[#45464f] uppercase tracking-wider block mb-2">
                Item Selecionado
              </span>
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-3">
                  <img src={i.image} alt={i.name} className="w-12 h-12 object-contain bg-white rounded-lg p-1" />
                  <div>
                    <h5 className="font-bold text-[#061748]">{i.name}</h5>
                    <span className="text-[#45464f] block">{i.subtitle}</span>
                    <span className="text-[#4156b8] font-semibold text-[11px]">{i.lensType}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#f2f4f6] p-4 rounded-xl border border-[#e0e3e5]">
              <span className="text-[10px] font-bold text-[#45464f] uppercase tracking-wider block mb-2">
                Endereço de Entrega
              </span>
              <p className="font-semibold text-[#061748]">{customer.name}</p>
              <p className="text-[#45464f]">{address.street}, {address.number} {address.complement}</p>
              <p className="text-[#45464f]">{address.neighborhood} - {address.city}/{address.state}</p>
              <p className="text-[#45464f]">CEP: {address.cep}</p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-[#f2f4f6] border-t border-[#e0e3e5] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs font-bold text-[#4156b8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Imprimir Comprovante</span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#061748] text-white text-xs font-bold px-6 py-2.5 rounded-full hover:brightness-125 cursor-pointer shadow-sm"
            >
              Concluir &amp; Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
