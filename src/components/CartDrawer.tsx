import React from 'react';
import { OrderItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onAddAccessory: (name: string, price: number, image: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onAddAccessory,
  onCheckout
}) => {
  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden ${
        isOpen ? 'visible' : 'invisible pointer-events-none'
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs will-change-opacity transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ transform: isOpen ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)' }}
        >
          {/* Header */}
          <div className="p-6 bg-[#061748] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
              <h3 className="text-base font-bold">Sacola de Compras</h3>
              <span className="bg-[#dbee2c] text-[#061748] text-[11px] font-bold px-2 py-0.5 rounded-full ml-1">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <button onClick={onClose} className="text-white hover:opacity-80 cursor-pointer">✕</button>
          </div>

          {/* Items list */}
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-[#f2f4f6] rounded-2xl border border-[#e0e3e5]"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-contain bg-white rounded-xl p-1 shadow-xs border border-[#c6c5d0]/30"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#061748] truncate">{item.name}</h4>
                  <span className="text-[11px] text-[#45464f] block">{item.subtitle}</span>
                  <span className="text-[11px] text-[#4156b8] block truncate font-medium">{item.lensType}</span>
                  <span className="text-xs font-bold text-[#061748] block mt-1">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center border border-[#c6c5d0] rounded-full bg-white text-xs">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center font-bold text-[#45464f] hover:text-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-1 text-[11px] font-bold">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center font-bold text-[#45464f] hover:text-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Suggested Accessory - Optional Add-on (NOT in cart) */}
            <div className="mt-4 pt-4 border-t border-[#eceef0]">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#C4D600] text-[14px]">lightbulb</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#45464f]">
                  Recomendamos também
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-[#4156b8] bg-[#4156b8]/10 px-1.5 py-0.5 rounded">
                  Não incluso
                </span>
              </div>
              <p className="text-[10px] text-[#6b6e76] mb-2 leading-relaxed">
                Complemente seu pedido com este kit de cuidados para suas lentes.
              </p>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#e0e3e5] shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4156b8] text-[22px]">clean_hands</span>
                  <div>
                    <h5 className="text-xs font-bold text-[#061748]">Kit Antiembaçante Zeiss Lens Care</h5>
                    <span className="text-[11px] text-[#45464f]">Spray 60ml + Microfibra Especial</span>
                    <span className="block text-[11px] font-bold text-[#061748] mt-0.5">R$ 39,00</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onAddAccessory(
                      'Kit Zeiss Lens Care',
                      39.0,
                      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80'
                    )
                  }
                  className="bg-[#C4D600] text-[#061748] text-[11px] font-bold px-3 py-1.5 rounded-full hover:bg-[#b3c200] transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Adicionar à sacola
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-[#f2f4f6] border-t border-[#e0e3e5] flex flex-col gap-3">
            <div className="flex justify-between items-center text-sm font-bold text-[#061748]">
              <span>Subtotal:</span>
              <span className="text-xl">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="w-full bg-[#dbee2c] text-[#061748] text-sm font-extrabold py-3.5 rounded-full hover:brightness-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Finalizar Compra</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <p className="text-[10px] text-center text-[#6b6e76] leading-relaxed">
              Pagamento seguro · Entrega garantida
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
