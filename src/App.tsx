/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { FramesPage } from './pages/FramesPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TaxasAsaasPage } from './pages/TaxasAsaasPage';
import { RayBanMetaPage } from './pages/RayBanMetaPage';
import { SunglassesPage } from './pages/SunglassesPage';
import { LensesPage } from './pages/LensesPage';
import { WishlistPage } from './pages/WishlistPage';
import { ProfilePage } from './pages/ProfilePage';
import { AboutPage } from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { CatalogModal } from './components/CatalogModal';
import { StoresModal } from './components/StoresModal';
import { SearchModal } from './components/SearchModal';
import { LensGuideModal } from './components/LensGuideModal';
import { CepModal } from './components/CepModal';
import { SupportModal } from './components/SupportModal';
import { CartDrawer } from './components/CartDrawer';
import { SpecialistChat } from './components/SpecialistChat';
import { useStoreSettings } from './lib/storeSettings';
import { getDiscountPolicies, getCustomerStatus, invalidateCustomerStatus } from './lib/siteStore';
import { Footer } from './components/Footer';
import { MaintenancePage } from './components/MaintenancePage';
import { useToast } from './components/ToastContext';
import { CheckoutAccount, type AccountUser } from './components/CheckoutAccount';
import { LoginPage } from './pages/LoginPage';

import {
  INITIAL_PRESCRIPTION,
} from './data/mockData';
import { CATALOG_PRODUCTS } from './lib/siteStore';
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
  if (pathname === '/oculos-de-sol') return 'sunglasses';
  if (pathname === '/lentes-de-grau') return 'lenses';
  if (pathname === '/lista-de-desejos') return 'wishlist';
  if (pathname === '/todos-os-produtos') return 'allProducts';
  if (pathname === '/quem-somos') return 'about';
  if (pathname === '/minha-conta') return 'profile';
  if (pathname === '/checkout') return 'checkout';
  if (pathname === '/taxas') return 'taxas';
  return 'home';
};

const EMPTY_ADDRESS: AddressData = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
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
  const { pathname } = useLocation();
  const settings = useStoreSettings();
  if (pathname.startsWith('/admin')) return <AdminPage />;
  if (settings.maintenance.enabled) {
    return <MaintenancePage storeName={settings.store.name} message={settings.maintenance.message} />;
  }
  return <SiteApp />;
}

function SiteApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const settings = useStoreSettings();
  const currentPage = getPageFromPath(location.pathname);

  const [customer, setCustomer] = useState<CustomerData>({ name: '', cpf: '', email: '', phone: '' });
  const [account, setAccount] = useState<AccountUser | null>(null);
  const requiresAccount = location.pathname === '/checkout' || location.pathname === '/minha-conta';
  const [authLoading, setAuthLoading] = useState(requiresAccount);
  const [cartReadyFor, setCartReadyFor] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressData>(EMPTY_ADDRESS);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sedex');
  const [prescription, setPrescription] = useState<PrescriptionData>(INITIAL_PRESCRIPTION);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [items, setItems] = useState<OrderItem[]>([]);

  // Mantém a seleção válida quando a loja desativa uma forma de pagamento ou entrega
  useEffect(() => {
    const { pix, card, boleto } = settings.payment;
    const enabledPayments: PaymentMethod[] = [];
    if (pix.enabled) enabledPayments.push('pix');
    if (card.enabled) enabledPayments.push('card');
    if (boleto.enabled) enabledPayments.push('boleto');
    if (enabledPayments.length && !enabledPayments.includes(paymentMethod)) setPaymentMethod(enabledPayments[0]);
    const { homeEnabled, pickupEnabled } = settings.delivery;
    if (deliveryMethod === 'sedex' && !homeEnabled && pickupEnabled) setDeliveryMethod('boutique');
    if (deliveryMethod === 'boutique' && !pickupEnabled && homeEnabled) setDeliveryMethod('sedex');
  }, [settings, paymentMethod, deliveryMethod]);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  // Automatic discounts (policies) state
  const [policyDiscount, setPolicyDiscount] = useState<number>(0);
  const [appliedPolicyId, setAppliedPolicyId] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
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
  const [isSpecialistChatOpen, setIsSpecialistChatOpen] = useState(false);

  // Hero theme state (shared between HomePage and Header)
  const [heroTheme, setHeroTheme] = useState<'default' | 'blackfriday'>('default');

  // Busca sessão em rotas públicas para atualizar o Header após login/registro
  useEffect(() => {
    if (location.pathname === '/checkout' || location.pathname === '/minha-conta') return;
    if (account) return;
    let active = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ user: AccountUser | null }>;
      })
      .then((data) => {
        if (!active || !data?.user) return;
        setAccount(data.user);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [location.pathname, account]);

  useEffect(() => {
    if (location.pathname !== '/checkout' && location.pathname !== '/minha-conta') return;
    let active = true;
    setAuthLoading(true);
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível verificar sua conta.');
        return response.json() as Promise<{ user: AccountUser | null }>;
      })
      .then(({ user }) => {
        if (!active || !user) return;
        setAccount(user);
        setCustomer((current) => ({
          ...current,
          name: user.name,
          email: user.email,
          cpf: user.cpf || current.cpf,
          phone: user.phone || current.phone,
        }));
        if (user.address) setAddress({ ...EMPTY_ADDRESS, ...user.address });
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(
          'Não foi possível verificar sua conta',
          error instanceof Error ? error.message : 'Tente recarregar a página.',
        );
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location.pathname, toast]);

  useEffect(() => {
    if (!account) {
      setCartReadyFor(null);
      return;
    }
    let active = true;
    const loadCart = async () => {
      const response = await fetch('/api/cart', { credentials: 'same-origin' });
      const cartResult = await response.json() as {
        items?: Array<{ productId: string; quantity: number; options?: Record<string, string> }>;
        error?: string;
      };
      if (!response.ok) throw new Error(cartResult.error || 'Não foi possível carregar seu carrinho.');
      if (!Array.isArray(cartResult.items) || cartResult.items.length === 0) {
        if (active) setCartReadyFor(account.id);
        return;
      }

      const productResponse = await fetch('/api/store/products');
      const productResult = await productResponse.json() as { products?: EyewearProduct[] };
      if (!productResponse.ok || !Array.isArray(productResult.products)) {
        throw new Error('Não foi possível carregar os produtos do carrinho.');
      }
      const products = new Map(productResult.products.map((product) => [product.id, product]));
      const restoredItems = cartResult.items.flatMap((cartItem) => {
        const product = products.get(cartItem.productId);
        if (!product) return [];
        const color = cartItem.options?.color || product.colorName || 'Padrão';
        const size = cartItem.options?.size || product.calibre || 'Único';
        return [{
          id: product.id,
          name: product.name,
          subtitle: `${color} • Calibre ${size}`,
          color,
          size,
          lensType: cartItem.options?.lensType || 'Sem personalização',
          price: Number(product.price),
          image: product.image,
          quantity: cartItem.quantity,
        }];
      });
      if (!active) return;
      setItems(restoredItems);
      setCartReadyFor(account.id);
    };

    loadCart().catch((error: unknown) => {
      if (!active) return;
      toast.error(
        'Não foi possível carregar seu carrinho',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
      setCartReadyFor(account.id);
    });
    return () => {
      active = false;
    };
  }, [account, toast]);

  useEffect(() => {
    if (!account || cartReadyFor !== account.id) return;
    fetch('/api/cart', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          options: { color: item.color, size: item.size, lensType: item.lensType },
        })),
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || 'Não foi possível salvar seu carrinho.');
      }
    }).catch((error: unknown) => {
      toast.error(
        'Não foi possível salvar seu carrinho',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    });
  }, [account, cartReadyFor, items, toast]);

  // Navigation helper with scroll to top
  const navigateTo = (page: AppPage, productId?: string) => {
    let path = '/';
    switch (page) {
      case 'home': path = '/'; break;
      case 'product': path = `/produto/${productId}`; break;
      case 'frames': path = '/armacoes'; break;
      case 'lenses': path = '/lentes-de-grau'; break;
      case 'allProducts': path = '/todos-os-produtos'; break;
      case 'about': path = '/quem-somos'; break;
      case 'checkout': path = '/checkout'; break;
      case 'taxas': path = '/taxas'; break;
    }
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Automatic policy discount calculation
  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      const policies = getDiscountPolicies();
      if (!policies.length || !items.length) {
        if (!cancelled) {
          setPolicyDiscount(0);
          setAppliedPolicyId(null);
        }
        return;
      }

      const currentSubtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
      const productIds = new Set(items.map((i) => i.id));

      // Fetch real customer status for client-based triggers
      const customerStatus = account ? await getCustomerStatus() : null;

      // Find best applicable policy (highest discount wins)
      let bestDiscount = 0;
      let bestPolicyId: string | null = null;

      for (const policy of policies) {
        if (!policy.active) continue;

        // Check expiration
        if (policy.duration) {
          const durationMs = policy.duration.value * (policy.duration.unit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
          if (Date.now() > new Date(policy.createdAt).getTime() + durationMs) continue;
        }

        // Check product scope
        if (!policy.allProducts && policy.productIds?.length) {
          const hasMatchingProduct = policy.productIds.some((pid: string) => productIds.has(pid));
          if (!hasMatchingProduct) continue;
        }

        let applicable = false;

        switch (policy.trigger) {
          case 'cart_value': {
            const op = policy.valueOperator || 'minimum';
            if (op === 'minimum' && currentSubtotal >= (policy.minCartValue || 0)) applicable = true;
            else if (op === 'maximum' && currentSubtotal <= (policy.maxCartValue || Infinity)) applicable = true;
            else if (op === 'between' && currentSubtotal >= (policy.minCartValue || 0) && currentSubtotal <= (policy.maxCartValue || Infinity)) applicable = true;
            break;
          }
          case 'item_quantity': {
            const op = policy.quantityOperator || 'minimum';
            if (op === 'minimum' && totalItems >= (policy.minItems || 0)) applicable = true;
            else if (op === 'maximum' && totalItems <= (policy.maxItems || Infinity)) applicable = true;
            else if (op === 'between' && totalItems >= (policy.minItems || 0) && totalItems <= (policy.maxItems || Infinity)) applicable = true;
            break;
          }
          case 'first_purchase':
          case 'new_customer':
            // Only apply if customer is logged in and has NO previous orders
            applicable = Boolean(customerStatus?.isFirstPurchase);
            break;
          case 'returning_customer':
            // Only apply if customer has more than one previous order
            applicable = Boolean(customerStatus?.isReturningCustomer);
            break;
          default:
            // birthday, abandoned_cart, progressive_time require additional backend/session data
            break;
        }

        if (applicable) {
          const discountAmount = policy.discountType === 'percentage'
            ? (currentSubtotal * policy.discountValue) / 100
            : policy.discountValue;

          if (discountAmount > bestDiscount) {
            bestDiscount = discountAmount;
            bestPolicyId = policy.id;
          }
        }
      }

      if (!cancelled) {
        setPolicyDiscount(Math.min(bestDiscount, currentSubtotal));
        setAppliedPolicyId(bestPolicyId);
      }
    };

    evaluate();
    return () => { cancelled = true; };
  }, [items, account]);

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalAutomaticDiscount = couponDiscount + policyDiscount;
  const baseSubtotalAfterDiscounts = Math.max(0, subtotal - totalAutomaticDiscount);
  const pixDiscountAmount = paymentMethod === 'pix' ? baseSubtotalAfterDiscounts * (settings.payment.pix.discountPercent / 100) : 0;
  const totalAmount = baseSubtotalAfterDiscounts - pixDiscountAmount;

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

  const handleCheckout = async () => {
    if (!account) {
      toast.error('Entre na sua conta', 'É necessário acessar uma conta antes de finalizar o pedido.');
      return;
    }
    if (!items.length) {
      toast.error('Seu carrinho está vazio', 'Adicione um produto antes de finalizar a compra.');
      return;
    }
    setIsSubmitting(true);
    try {
      const profileResponse = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      const profileResult = await profileResponse.json() as { user?: AccountUser; error?: string };
      if (!profileResponse.ok || !profileResult.user) {
        throw new Error(profileResult.error || 'Não foi possível salvar seus dados.');
      }
      setAccount(profileResult.user);
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            options: { color: item.color, size: item.size, lensType: item.lensType },
          })),
          address,
          deliveryMethod,
          paymentMethod,
          couponCode: appliedCoupon,
          couponDiscount,
          policyId: appliedPolicyId,
          policyDiscount,
          subtotal,
          totalAmount,
          prescription: {
            fileName: prescription.fileName || '',
            sendViaWhatsApp: prescription.sendViaWhatsApp,
            manualEntered: prescription.manualEntered,
            odSph: prescription.odSph,
            odCyl: prescription.odCyl,
            odAxis: prescription.odAxis,
            oeSph: prescription.oeSph,
            oeCyl: prescription.oeCyl,
            oeAxis: prescription.oeAxis,
            dnp: prescription.dnp,
          },
          // Asaas integration placeholder - billing data ready for gateway
          billing: {
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpf.replace(/\D/g, ''),
              phone: customer.phone.replace(/\D/g, ''),
            },
            address: deliveryMethod === 'sedex' ? {
              street: address.street,
              number: address.number,
              complement: address.complement,
              neighborhood: address.neighborhood,
              city: address.city,
              state: address.state,
              cep: address.cep.replace(/\D/g, ''),
            } : undefined,
          },
        }),
      });
      const orderResult = await orderResponse.json() as { order?: { id: string; asaasPaymentUrl?: string }; error?: string };
      if (!orderResponse.ok || !orderResult.order) {
        throw new Error(orderResult.error || 'Não foi possível registrar o pedido.');
      }

      // If Asaas returns a payment URL (future integration), redirect to it
      if (orderResult.order.asaasPaymentUrl) {
        window.location.href = orderResult.order.asaasPaymentUrl;
        return;
      }

      invalidateCustomerStatus();
      setOrderId(orderResult.order.id);
      setIsSubmitting(false);
      setIsSuccessModalOpen(true);
    } catch (error) {
      toast.error(
        'Não foi possível finalizar o pedido',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProduct = (product: EyewearProduct) => {
    navigateTo('product', product.id);
  };

  const redirectToLoginWithTransition = () => {
    navigate('/login', { state: { from: location.pathname } });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleGoToCheckoutWithProduct = (product: EyewearProduct, lensType = 'Lentes HD Antirreflexo + Blue Light') => {
    if (!account) {
      redirectToLoginWithTransition();
      return;
    }
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
    if (!account) {
      redirectToLoginWithTransition();
      return;
    }
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
      id: 'accessory-zeiss-lens-care',
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
      {location.pathname !== '/login' && (
      <Header
        currentPage={currentPage}
        activeCategory={isCatalogOpen ? catalogCategory : currentPage === 'frames' ? 'armacoes' : currentPage === 'sunglasses' ? 'oculos-de-sol' : currentPage === 'lenses' ? 'lentes-de-grau' : null}
        isStoresActive={isStoresOpen}
        heroTheme={heroTheme}
        onNavigate={(page) => navigateTo(page)}
        onOpenCatalog={(category) => {
          if (category === 'armacoes') {
            navigateTo('frames');
          } else if (category === 'oculos-de-sol') {
            navigate('/oculos-de-sol');
          } else if (category === 'lentes-de-grau') {
            navigate('/lentes-de-grau');
          }
        }}
        onOpenStores={() => setIsStoresOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        cartCount={items.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        onOpenWishlist={() => { navigate('/lista-de-desejos'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
        onOpenProfile={() => { navigate('/minha-conta'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
        userName={account?.name}
        onLogout={() => {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
            .catch(() => {})
            .finally(() => {
              setAccount(null);
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'instant' });
            });
        }}
      />
      )}

      {/* Main Content Area based on Current Page */}
      <main className={`w-full min-w-0 min-h-screen ${currentPage === 'home' ? '' : 'pt-32 sm:pt-36 bg-[#f7f9fb]'}`}>
        <Routes>
          <Route path="/" element={
            <HomePage
              heroTheme={heroTheme}
              onSetHeroTheme={setHeroTheme}
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

          <Route path="/todos-os-produtos" element={
            <FramesPage
              showAll
              onSelectProductForCheckout={handleGoToCheckoutWithProduct}
              onNavigateHome={() => navigateTo('home')}
            />
          } />
          <Route path="/quem-somos" element={<AboutPage onOpenStores={() => setIsStoresOpen(true)} />} />
          <Route path="/rayban-meta" element={
            <RayBanMetaPage
              onSelectProductForCheckout={handleGoToCheckoutWithProduct}
              onNavigateHome={() => navigateTo('home')}
            />
          } />
          <Route path="/oculos-de-sol" element={
            <SunglassesPage
              onSelectProductForCheckout={handleGoToCheckoutWithProduct}
              onNavigateHome={() => navigateTo('home')}
            />
          } />
          <Route path="/lentes-de-grau" element={
            <LensesPage
              onSelectProductForCheckout={handleGoToCheckoutWithProduct}
              onNavigateHome={() => navigateTo('home')}
            />
          } />
          <Route path="/lista-de-desejos" element={<WishlistPage />} />
          <Route path="/minha-conta" element={
            account ? (
              <ProfilePage
                customer={customer}
                address={address}
                cartCount={items.reduce((acc, i) => acc + i.quantity, 0)}
                onUpdateCustomer={handleUpdateCustomer}
                onUpdateAddress={setAddress}
                onOpenCart={() => setIsCartDrawerOpen(true)}
              />
            ) : authLoading ? (
              <div className="mx-auto flex min-h-[55vh] items-center justify-center text-sm font-semibold text-[#4156b8]">
                Verificando sua conta...
              </div>
            ) : (
              <CheckoutAccount
                context="profile"
                onAuthenticated={(user) => {
                  setAccount(user);
                  setCustomer((current) => ({
                    ...current,
                    name: user.name,
                    email: user.email,
                    cpf: user.cpf || current.cpf,
                    phone: user.phone || current.phone,
                  }));
                  if (user.address) setAddress({ ...EMPTY_ADDRESS, ...user.address });
                }}
              />
            )
          } />

          <Route path="/taxas" element={<TaxasAsaasPage />} />
          <Route path="/login" element={<LoginPage />} />

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
              policyDiscount={policyDiscount}
              onCheckout={handleCheckout}
              isSubmitting={isSubmitting}
              account={account}
              authLoading={authLoading}
              onAuthenticated={(user) => {
                setAccount(user);
                setCustomer((current) => ({
                  ...current,
                  name: user.name,
                  email: user.email,
                  cpf: user.cpf || current.cpf,
                  phone: user.phone || current.phone,
                }));
                if (user.address) setAddress({ ...EMPTY_ADDRESS, ...user.address });
              }}
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
          } else if (category === 'oculos-de-sol') {
            navigate('/oculos-de-sol');
          } else if (category === 'lentes-de-grau') {
            navigate('/lentes-de-grau');
          }
        }}
        onOpenStores={() => setIsStoresOpen(true)}
        onOpenLensGuide={() => setIsLensGuideOpen(true)}
        onOpenFaq={() => setIsLensGuideOpen(true)}
      />

      {/* Supporting Interactive Modals */}
      <OrderSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setOrderId(null);
          setItems([]);
        }}
        orderId={orderId}
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

      {/* Specialist Chat Widget */}
      <SpecialistChat
        isOpen={isSpecialistChatOpen}
        onClose={() => setIsSpecialistChatOpen(false)}
      />

      {/* Floating Trigger Button - stacked above theme toggle */}
      {!isSpecialistChatOpen && (
        <button
          onClick={() => setIsSpecialistChatOpen(true)}
          className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 flex items-center gap-1.5 bg-[#061748] hover:bg-[#0a2366] text-white px-3 sm:px-4 py-2 rounded-full shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
          aria-label="Falar com um especialista"
        >
          <span className="material-symbols-outlined text-[18px] text-[#dbee2c] group-hover:animate-pulse">support_agent</span>
          <span className="hidden sm:inline text-xs font-bold tracking-wide">Falar com Especialista</span>
        </button>
      )}
    </div>
  );
}