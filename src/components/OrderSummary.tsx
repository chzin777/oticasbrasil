import React, { useState } from 'react';
import { OrderItem, PaymentMethod, DeliveryMethod } from '../types';
import { AVAILABLE_COUPONS } from '../data/mockData';

interface OrderSummaryProps {
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  appliedCoupon: string | null;
  onApplyCoupon: (code: string | null, discountAmount: number) => void;
  couponDiscount: number;
  onCheckout: () => void;
  isSubmitting: boolean;
  onOpenLensCustomizer?: (item: OrderItem) => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  paymentMethod,
  deliveryMethod,
  appliedCoupon,
  onApplyCoupon,
  couponDiscount,
  onCheckout,
  isSubmitting,
  onOpenLensCustomizer
}) => {
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const baseSubtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  
  // 5% Pix discount
  const pixDiscount = paymentMethod === 'pix' ? baseSubtotalAfterCoupon * 0.05 : 0;
  const finalTotal = baseSubtotalAfterCoupon - pixDiscount;
  const totalRegular = baseSubtotalAfterCoupon;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    if (AVAILABLE_COUPONS[code]) {
      const info = AVAILABLE_COUPONS[code];
      let discountVal = 0;
      if (info.discountPercent) {
        discountVal = (subtotal * info.discountPercent) / 100;
      } else if (info.discountAmount) {
        discountVal = info.discountAmount;
      }
      onApplyCoupon(code, discountVal);
      setCouponCodeInput('');
    } else {
      setCouponError('Cupom inválido. Experimente: BRASIL10 ou BEMVINDO');
    }
  };

  const handleRemoveCoupon = () => {
    onApplyCoupon(null, 0);
  };

  return (
    <aside className="lg:col-span-5 xl:col-span-4 sticky top-28 flex flex-col gap-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eceef0] flex flex-col gap-4">
        {/* Summary Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#eceef0]">
          <h3 className="text-xl font-bold text-[#061748] tracking-tight">
            Resumo do Pedido
          </h3>
          <span className="bg-[#eceef0] text-[#45464f] text-xs px-2.5 py-0.5 rounded-full font-semibold">
            {items.reduce((acc, i) => acc + i.quantity, 0)} {items.length === 1 && items[0].quantity === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* Item Rows */}
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 items-start bg-[#f2f4f6] p-3 rounded-xl border border-[#e0e3e5] relative group"
            >
              {/* Product Thumbnail */}
              <div className="w-20 h-20 bg-white rounded-lg flex-shrink-0 p-1 flex items-center justify-center shadow-sm border border-[#c6c5d0]/30 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-sm font-bold text-[#061748] truncate">
                    {item.name}
                  </h4>
                  <span className="text-xs font-bold text-[#061748] whitespace-nowrap">
                    R$ {item.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <span className="text-xs text-[#45464f] mt-0.5">
                  {item.subtitle}
                </span>

                <div className="mt-1 flex items-center gap-1 text-[11px] text-[#4156b8] font-medium">
                  <span className="material-symbols-outlined text-[14px]">lens</span>
                  <span className="truncate">{item.lensType}</span>
                </div>

                {onOpenLensCustomizer && (
                  <button
                    type="button"
                    onClick={() => onOpenLensCustomizer(item)}
                    className="text-[10px] text-left text-[#4156b8] underline font-semibold mt-1 hover:text-[#061748] cursor-pointer"
                  >
                    Personalizar Lentes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Coupon Accordion/Input */}
        <form onSubmit={handleApplyCoupon} className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="CUPOM DE DESCONTO"
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value)}
              className="flex-1 bg-[#f2f4f6] px-4 py-2 rounded-full text-xs text-[#191c1e] focus:outline-none uppercase font-semibold border border-transparent focus:border-[#4156b8]/40"
            />
            <button
              type="submit"
              className="bg-[#061748] text-white text-xs px-4 py-2 rounded-full font-semibold hover:brightness-125 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Aplicar
            </button>
          </div>

          {appliedCoupon && (
            <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200 mt-1 animate-fadeIn">
              <span className="flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Cupom <strong>{appliedCoupon}</strong> ativo (- R$ {couponDiscount.toFixed(2).replace('.', ',')})
              </span>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-emerald-700 hover:text-red-600 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {couponError && (
            <span className="text-[11px] text-red-600 px-2 mt-0.5">
              {couponError}
            </span>
          )}
        </form>

        {/* Price Breakdown Table */}
        <div className="flex flex-col gap-1.5 pt-1 text-xs">
          <div className="flex justify-between text-[#45464f]">
            <span>Subtotal Armação + Lentes</span>
            <span className="text-[#191c1e] font-medium">
              R$ {subtotal.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {appliedCoupon && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Desconto de Cupom ({appliedCoupon})</span>
              <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
            </div>
          )}

          {deliveryMethod !== 'pickup' && (
            <div className="flex justify-between text-[#45464f]">
              <span>Frete Correios com Seguro</span>
              <span className="text-[#4156b8] font-bold">Grátis</span>
            </div>
          )}

          {paymentMethod === 'pix' && (
            <div className="flex justify-between items-center text-[#F7915E] font-semibold">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">local_offer</span>
                <span>Desconto Especial Pix (5%)</span>
              </span>
              <span>- R$ {pixDiscount.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
        </div>

        {/* Prominent Totals */}
        <div className="pt-2 bg-[#f2f4f6] p-4 rounded-xl flex flex-col gap-1 border border-[#e0e3e5]">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-[#061748]">
              {paymentMethod === 'pix' ? 'Total no Pix:' : 'Total do Pedido:'}
            </span>
            <span className="text-3xl font-extrabold text-[#061748] tracking-tight">
              R$ {finalTotal.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <p className="text-xs text-[#45464f] text-right">
            ou <strong className="text-[#191c1e]">R$ {totalRegular.toFixed(2).replace('.', ',')}</strong> em até{' '}
            <strong className="text-[#191c1e]">10x de R$ {(totalRegular / 10).toFixed(2).replace('.', ',')}</strong> sem juros no cartão
          </p>
        </div>

        {/* High-Converting Primary CTA Button (Electric Lime #C4D600) */}
        <button
          type="button"
          onClick={onCheckout}
          disabled={isSubmitting}
          className="w-full bg-[#C4D600] text-[#061748] hover:brightness-95 active:scale-[0.99] transition-all text-base md:text-lg font-extrabold py-4 px-6 rounded-full shadow-md flex items-center justify-center gap-2 cursor-pointer ring-2 ring-[#C4D600]/30 hover:shadow-lg disabled:opacity-70"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-[#061748]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Processando Pedido...</span>
            </span>
          ) : (
            <>
              <span>Finalizar Pedido com Segurança</span>
              <span className="material-symbols-outlined text-[24px]">lock</span>
            </>
          )}
        </button>

        {/* Optic Guarantee Badges */}
        <div className="pt-1 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#45464f] text-xs">
            <span className="material-symbols-outlined text-[#4156b8] text-[18px]">verified</span>
            <span>Garantia de Adaptação de 60 Dias nas Lentes</span>
          </div>
          <div className="flex items-center gap-2 text-[#45464f] text-xs">
            <span className="material-symbols-outlined text-[#4156b8] text-[18px]">cached</span>
            <span>Devolução e Troca Facilitada sem Custos em 30 Dias</span>
          </div>
        </div>
      </div>

      {/* Optician Review Seal Card */}
      <div className="bg-[#061748] text-white p-4 rounded-xl flex items-center gap-3 shadow-sm border border-[#364476]/30">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[#dbee2c] flex-shrink-0">
          <span className="material-symbols-outlined text-[24px]">visibility</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white">
            Conferência Técnica Garantida
          </span>
          <span className="text-xs text-[#b6c4fe] leading-snug mt-0.5">
            Cada par de lentes passa por conferência em lensômetro digital antes da postagem.
          </span>
        </div>
      </div>
    </aside>
  );
};
