/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { FramesPage } from './pages/FramesPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TaxasAsaasPage } from './pages/TaxasAsaasPage';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { CatalogModal } from './components/CatalogModal';
import { StoresModal } from './components/StoresModal';
import { SearchModal } from './components/SearchModal';
import { LensGuideModal } from './components/LensGuideModal';
import { CepModal } from './components/CepModal';
import { SupportModal } from './components/SupportModal';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';

import {
  INITIAL_CUSTOMER,
  INITIAL_ADDRESS,
  INITIAL_ORDER_ITEM,
  INITIAL_PRESCRIPTION,
  CATALOG_PRODUCTS
} from './data/mockData';
import {
  CustomerData,
  AddressData,
  OrderItem,
  PaymentMethod,
  DeliveryMethod,
  PrescriptionData,
  EyewearProduct,
  AppPage
} from './types';

// Helper to derive current page type from pathname for Header styling/logic
const getPageFromPath = (pathname: string): AppPage => {
  if (pathname.startsWith('/produto/')) return 'product';
  if (pathname === '/armacoes') return 'frames';
  if (pathname === '/checkout') return 'checkout';
  if (pathname === '/taxas') return 'taxas';
  return 'home';
};

// Wrapper component to handle product slug lookup
function ProductPageRoute({
  onGoToCheckout,
  onOpenLensGuide,
  onOpenCepModal,
  onSelectProduct,
  onGoToCheckoutWithProduct
}: {
  onGoToCheckout: (item: OrderItem) => void;
  onOpenLensGuide: () => void;
  onOpenCepModal: () => void;
  onSelectProduct?: (product: EyewearProduct) => void;
  onGoToCheckoutWithProduct?: (product: EyewearProduct) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  const product = CATALOG_PRODUCTS.find(p => p.id === slug);

  if (!product) {
    return <div className="pt-40 text-center text-xl">Produto não encontrado.</div>;
  }

  return (
    <ProductPage
      product={product}
      onGoToCheckout={onGoToCheckout}
      onOpenLensGuide={onOpenLensGuide}
      onOpenCepModal={onOpenCepModal}
      onSelectProduct={onSelectProduct}
      onGoToCheckoutWithProduct={onGoToCheckoutWithProduct}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = getPageFromPath(location.pathname);

  // Shared state remains in App to be passed down or managed globally later
  const [customer, setCustomer] = useState<CustomerData>(INITIAL_CUSTOMER);
  const [address, setAddress] = useState<AddressData>(INITIAL_ADDRESS);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sedex');
  const [prescription, setPrescription] = useState<PrescriptionData>(INITIAL_PRESCRIPTION);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [items, setItems] = useState<OrderItem[]>([INITIAL_ORDER_ITEM]);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<'armacoes' | 'oculos-de-sol' | 'lentes-de-grau'>('armacoes');
  const [isStoresOpen, setIsStoresOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLensGuideOpen, setIsLensGuideOpen] = useState(false);
  const [isCepOpen, setIsCepOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Navigation helper with scroll to top
  const navigateTo = (page: AppPage, productId?: string) => {
    let path = '/';
    switch (page) {
      case 'home': path = '/'; break;
      case 'product': path = `/produto/${productId}`; break;
      case 'frames': path = '/armacoes'; break;
      case 'checkout': path = '/checkout'; break;
      case 'taxas': path = '/taxas'; break;
    }
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const baseSubtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const pixDiscountAmount = paymentMethod === 'pix' ? baseSubtotalAfterCoupon * 0.05 : 0;
  const totalAmount = baseSubtotalAfterCoupon - pixDiscountAmount;

  // Handlers
  const handleUpdateCustomer = (updated: Partial<CustomerData>) => {
    setCustomer((prev) => ({ ...prev, ...updated }));
  };

  const handleUpdatePrescription = (updated: Partial<PrescriptionData>) => {
    setPrescription((prev) => ({ ...prev, ...updated }));
  };

  const handleApplyCoupon = (code: string | null, discountAmount: number) => {
    setAppliedCoupon(code);
    setCouponDiscount(discountAmount);
  };

  const handleCheckout = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccessModalOpen(true);
    }, 850);
  };

  const handleSelectProduct = (product: EyewearProduct) => {
    navigateTo('product', product.id);
  };

  const handleGoToCheckoutWithProduct = (product: EyewearProduct, lensType = 'Lentes HD Antirreflexo + Blue Light') => {
    const newItem: OrderItem = {
      id: product.id,
      name: product.name,
      subtitle: `${product.colorName} • Calibre ${product.calibre}`,
      color: product.colorName,
      size: product.calibre,
      lensType: lensType,
      price: product.price,
      image: product.image,
      quantity: 1
    };
    setItems([newItem]);
    navigateTo('checkout');
  };

  const handleGoToCheckoutFromProductPage = (orderItem: OrderItem) => {
    setItems([orderItem]);
    navigateTo('checkout');
  };

  const handleUpdateItemQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleAddAccessory = (name: string, price: number, image: string) => {
    const accessoryItem: OrderItem = {
      id: 'acc-' + Date.now(),
      name,
      subtitle: 'Acessório de Proteção Óptica',
      color: 'Standard',
      size: 'Único',
      lensType: 'Acessório Especial',
      price,
      image,
      quantity: 1
    };
    setItems((prev) => [...prev, accessoryItem]);
  };

  return (
    <div className="bg-[#f7f9fb] min-h-screen font-sans text-[#191c1e] flex flex-col selection:bg-[#dbee2c] selection:text-[#061748]">
      {/* Top Announcement Bar, Navigation & Screen Switcher */}
      <Header
        currentPage={currentPage}
        activeCategory={isCatalogOpen ? catalogCategory : currentPage === 'frames' ? 'armacoes' : null}
        isStoresActive={isStoresOpen}
        onNavigate={(page) => navigateTo(page)}
        onOpenCatalog={(category) => {
          if (category === 'armacoes') {
            navigateTo('frames');
          } else {
            setCatalogCategory(category);
            setIsCatalogOpen(true);
          }
        }}
        onOpenStores={() => setIsStoresOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        cartCount={items.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        onOpenProfile={() => {
          alert(`Usuário Conectado: ${customer.name}\nCPF: ${customer.cpf}\nWhatsApp: ${customer.phone}`);
        }}
      />

      {/* Main Content Area based on Current Page */}
      <main className={`w-full min-h-screen ${currentPage === 'home' ? '' : 'pt-36 bg-[#f7f9fb]'}`}>
        <Routes>
          <Route path="/" element={
            <HomePage
              onSelectProduct={handleSelectProduct}
              onGoToCheckoutWithProduct={handleGoToCheckoutWithProduct}
              onOpenLensGuide={() => setIsLensGuideOpen(true)}
              onOpenStores={() => setIsStoresOpen(true)}
              onOpenCatalog={(category) => {
                if (category === 'armacoes') {
                  navigateTo('frames');
                } else {
                  setCatalogCategory(category);
                  setIsCatalogOpen(true);
                }
              }}
            />
          } />

          <Route path="/produto/:slug" element={
            <ProductPageRoute
              onGoToCheckout={handleGoToCheckoutFromProductPage}
              onOpenLensGuide={() => setIsLensGuideOpen(true)}
              onOpenCepModal={() => setIsCepOpen(true)}
              onSelectProduct={handleSelectProduct}
              onGoToCheckoutWithProduct={handleGoToCheckoutWithProduct}
            />
          } />

          <Route path="/armacoes" element={
            <FramesPage
              onSelectProductForCheckout={handleGoToCheckoutWithProduct}
              onNavigateHome={() => navigateTo('home')}
            />
          } />

          <Route path="/taxas" element={<TaxasAsaasPage />} />

          <Route path="*" element={<NotFoundPage />} />
          <Route path="/checkout" element={
            <CheckoutPage
              customer={customer}
              onUpdateCustomer={handleUpdateCustomer}
              address={address}
              onUpdateAddress={setAddress}
              deliveryMethod={deliveryMethod}
              onSelectDeliveryMethod={setDeliveryMethod}
              prescription={prescription}
              onUpdatePrescription={handleUpdatePrescription}
              paymentMethod={paymentMethod}
              onSelectPaymentMethod={setPaymentMethod}
              items={items}
              appliedCoupon={appliedCoupon}
              onApplyCoupon={handleApplyCoupon}
              couponDiscount={couponDiscount}
              onCheckout={handleCheckout}
              isSubmitting={isSubmitting}
              onOpenCepModal={() => setIsCepOpen(true)}
              onOpenSupportModal={() => setIsSupportOpen(true)}
              onOpenLensCustomizer={() => {
                setCatalogCategory('lentes-de-grau');
                setIsCatalogOpen(true);
              }}
              onGoBackToProduct={() => navigate(-1)}
            />
          } />
        </Routes>
      </main>

      {/* Global Brand Footer */}
      <Footer
        onOpenCatalog={(category) => {
          if (category === 'armacoes') {
            navigateTo('frames');
          } else {
            setCatalogCategory(category);
            setIsCatalogOpen(true);
          }
        }}
        onOpenStores={() => setIsStoresOpen(true)}
        onOpenLensGuide={() => setIsLensGuideOpen(true)}
        onOpenFaq={() => setIsLensGuideOpen(true)}
      />

      {/* Supporting Interactive Modals */}
      <OrderSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        customer={customer}
        address={address}
        items={items}
        paymentMethod={paymentMethod}
        totalAmount={totalAmount}
        prescription={prescription}
      />

      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        initialCategory={catalogCategory}
        onSelectProductForCheckout={(prod, lens) => {
          handleGoToCheckoutWithProduct(prod, lens);
        }}
      />

      <StoresModal
        isOpen={isStoresOpen}
        onClose={() => setIsStoresOpen(false)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(prod) => {
          navigateTo('product', prod.id);
        }}
      />

      <LensGuideModal
        isOpen={isLensGuideOpen}
        onClose={() => setIsLensGuideOpen(false)}
      />

      <CepModal
        isOpen={isCepOpen}
        onClose={() => setIsCepOpen(false)}
        onApplyAddress={(newAddr) => {
          setAddress((prev) => ({ ...prev, ...newAddr }));
        }}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        items={items}
        onUpdateQuantity={handleUpdateItemQuantity}
        onAddAccessory={handleAddAccessory}
        onCheckout={() => navigateTo('checkout')}
      />
    </div>
  );
}