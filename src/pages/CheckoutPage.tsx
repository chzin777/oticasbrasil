import React from 'react';
import { CheckoutContext } from '../components/CheckoutContext';
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
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const baseSubtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const pixDiscountAmount = paymentMethod === 'pix' ? baseSubtotalAfterCoupon * 0.05 : 0;
  const totalAmount = baseSubtotalAfterCoupon - pixDiscountAmount;

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Distraction-free Checkout Context Header */}
      <CheckoutContext onOpenSupportModal={onOpenSupportModal} />

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Progressive Form Steps (8 Cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            {/* STEP 1: Identification & Contact */}
            <StepIdentification
              customer={customer}
              onChange={onUpdateCustomer}
            />

            {/* STEP 2: Delivery & Address */}
            <StepDelivery
              address={address}
              onUpdateAddress={onUpdateAddress}
              deliveryMethod={deliveryMethod}
              onSelectDeliveryMethod={onSelectDeliveryMethod}
              onOpenCepModal={onOpenCepModal}
            />

            {/* STEP 3: Eyewear Prescription Upload */}
            <StepPrescription
              prescription={prescription}
              onChange={onUpdatePrescription}
            />

            {/* STEP 4: Payment */}
            <StepPayment
              paymentMethod={paymentMethod}
              onSelectPaymentMethod={onSelectPaymentMethod}
              pixDiscountAmount={pixDiscountAmount}
              totalWithPix={totalAmount}
              totalRegular={baseSubtotalAfterCoupon}
            />
          </div>

          {/* RIGHT COLUMN: Sticky Order Summary (4 Cols) */}
          <OrderSummary
            items={items}
            paymentMethod={paymentMethod}
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
