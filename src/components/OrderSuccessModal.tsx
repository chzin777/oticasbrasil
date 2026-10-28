import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CustomerData, AddressData, OrderItem, PaymentMethod, PrescriptionData } from '../types';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
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
  orderId,
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

  const orderNumber = orderId ? orderId.slice(0, 8).toUpperCase() : 'PENDENTE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#061748] text-white p-4 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            ✕
          </button>
          <div className="flex items-center gap-3 pr-8 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[#dbee2c] text-[#061748] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#dbee2c] font-bold">
                Pedido registrado • pagamento pendente
              </span>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Obrigado, {customer.name.split(' ')[0]}!
              </h2>
              <p className="text-xs text-[#b6c4fe] mt-0.5">
                Pedido #{orderNumber} • Conta: {customer.email}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 sm:gap-6">
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
                <span className="text-[11px] text-[#45464f]">Aguardando pagamento</span>
              </div>
              <div className="flex flex-col gap-1 items-start bg-white p-2.5 rounded-xl border border-[#4156b8]/40 shadow-xs">
                <span className="text-[10px] font-bold text-[#4156b8] bg-[#dde1ff] px-2 py-0.5 rounded-full">
                  Etapa 2 • Pendente
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

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-700">info</span>
              <div className="text-xs leading-5 text-[#45464f]">
                <p className="font-bold text-[#061748]">Pedido registrado em modo demonstrativo</p>
                <p>
                  Nenhuma cobrança foi realizada. A integração de pagamento ainda não está ativa.
                  Forma selecionada: {paymentMethod.toUpperCase()} • Valor demonstrativo: R$ {totalAmount.toFixed(2).replace('.', ',')}.
                </p>
              </div>
            </div>
          </div>

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
