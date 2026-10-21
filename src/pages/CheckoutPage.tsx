import React, { useState } from 'react';
import { StepIdentification } from '../components/StepIdentification';
import { StepDelivery } from '../components/StepDelivery';
import { StepPrescription } from '../components/StepPrescription';
import { StepPayment } from '../components/StepPayment';
import { OrderSummary } from '../components/OrderSummary';
import {
  CustomerData,
  AddressData,
  OrderItem,
  PaymentMethod,
  DeliveryMethod,
  PrescriptionData
} from '../types';

const STEPS = [
  { id: 'identification', label: 'Identificação' },
  { id: 'delivery', label: 'Entrega' },
  { id: 'prescription', label: 'Receita' },
  { id: 'payment', label: 'Pagamento' },
] as const;

interface CheckoutPageProps {
  customer: CustomerData;
  onUpdateCustomer: (updated: Partial<CustomerData>) => void;
  address: AddressData;
  onUpdateAddress: (updated: AddressData) => void;
  deliveryMethod: DeliveryMethod;
  onSelectDeliveryMethod: (method: DeliveryMethod) => void;
  prescription: PrescriptionData;
  onUpdatePrescription: (updated: Partial<PrescriptionData>) => void;
  paymentMethod: PaymentMethod;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  items: OrderItem[];
  appliedCoupon: string | null;
  onApplyCoupon: (code: string | null, discountAmount: number) => void;
  couponDiscount: number;
  onCheckout: () => void;
  isSubmitting: boolean;
  onOpenCepModal: () => void;
  onOpenSupportModal: () => void;
  onOpenLensCustomizer: () => void;
  onGoBackToProduct: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  customer,
  onUpdateCustomer,
  address,
  onUpdateAddress,
  deliveryMethod,
  onSelectDeliveryMethod,
  prescription,
  onUpdatePrescription,
  paymentMethod,
  onSelectPaymentMethod,
  items,
  appliedCoupon,
  onApplyCoupon,
  couponDiscount,
  onCheckout,
  isSubmitting,
  onOpenCepModal,
  onOpenSupportModal,
  onOpenLensCustomizer,
  onGoBackToProduct
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const baseSubtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const pixDiscountAmount = paymentMethod === 'pix' ? baseSubtotalAfterCoupon * 0.05 : 0;
  const totalAmount = baseSubtotalAfterCoupon - pixDiscountAmount;

  const goToNext = () => setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goToPrev = () => setActiveStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Main Checkout Workflow Canvas */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 w-full">
        {/* Breadcrumb back to product */}
        <div className="mb-4">
          <button
            type="button"
            onClick={onGoBackToProduct}
            className="text-xs text-[#4156b8] hover:text-[#061748] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Voltar para a página do produto (Aura Titanium Round)</span>
          </button>
        </div>

        {/* Stepper indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {STEPS.map((step, idx) => {
              const isActive = idx === activeStep;
              const isCompleted = idx < activeStep;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        isActive
                          ? 'bg-[#4156b8] text-white shadow-md scale-110'
                          : isCompleted
                            ? 'bg-[#C4D600] text-[#061748]'
                            : 'bg-[#e8eaed] text-[#9aa0a6]'
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-[20px]">check</span>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold tracking-wide uppercase transition-colors duration-300 ${
                        isActive ? 'text-[#4156b8]' : isCompleted ? 'text-[#061748]' : 'text-[#9aa0a6]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-6 rounded transition-colors duration-300 ${
                        idx < activeStep ? 'bg-[#C4D600]' : 'bg-[#e8eaed]'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Active Step (8 Cols) — altura fixa para evitar pulo de layout entre steps */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 min-h-[520px]">
            {activeStep === 0 && (
              <StepIdentification
                customer={customer}
                onChange={onUpdateCustomer}
              />
            )}

            {activeStep === 1 && (
              <StepDelivery
                address={address}
                onUpdateAddress={onUpdateAddress}
                deliveryMethod={deliveryMethod}
                onSelectDeliveryMethod={onSelectDeliveryMethod}
                onOpenCepModal={onOpenCepModal}
              />
            )}

            {activeStep === 2 && (
              <StepPrescription
                prescription={prescription}
                onChange={onUpdatePrescription}
              />
            )}

            {activeStep === 3 && (
              <StepPayment
                paymentMethod={paymentMethod}
                onSelectPaymentMethod={onSelectPaymentMethod}
                pixDiscountAmount={pixDiscountAmount}
                totalWithPix={totalAmount}
                totalRegular={baseSubtotalAfterCoupon}
              />
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={goToPrev}
                disabled={activeStep === 0}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeStep === 0
                    ? 'text-[#c0c4ca] cursor-not-allowed'
                    : 'text-[#4156b8] hover:bg-[#f0f2ff] cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Voltar
              </button>

              {activeStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goToNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#4156b8] text-white text-sm font-bold hover:bg-[#3344a0] transition-colors duration-200 cursor-pointer shadow-sm"
                >
                  Próximo
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCheckout}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#C4D600] text-[#061748] text-sm font-black hover:bg-[#b3c400] transition-colors duration-200 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processando...' : 'Finalizar Compra'}
                  {!isSubmitting && <span className="material-symbols-outlined text-[18px]">shopping_bag</span>}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Order Summary (4 Cols) */}
          <OrderSummary
            items={items}
            paymentMethod={paymentMethod}
            deliveryMethod={deliveryMethod}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={onApplyCoupon}
            couponDiscount={couponDiscount}
            onCheckout={onCheckout}
            isSubmitting={isSubmitting}
            onOpenLensCustomizer={onOpenLensCustomizer}
          />
        </div>
      </div>
    </div>
  );
};
