import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CATALOG_PRODUCTS } from '../data/mockData';
import { EyewearProduct } from '../types';
import HeroCapa, { type HeroTheme } from '../components/HeroCapa';
import SectionShapes from '../components/SectionShapes';
import '../components/HeroCapa.css';

interface HomePageProps {
  heroTheme?: HeroTheme;
  onSetHeroTheme?: (theme: HeroTheme) => void;
  onSelectProduct: (product: EyewearProduct) => void;
  onGoToCheckoutWithProduct: (product: EyewearProduct) => void;
  onOpenLensGuide: () => void;
  onOpenStores: () => void;
  onOpenCatalog: (category: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  heroTheme: externalHeroTheme,
  onSetHeroTheme,
  onSelectProduct,
  onGoToCheckoutWithProduct,
  onOpenLensGuide,
  onOpenStores,
  onOpenCatalog
}) => {
  const [internalHeroTheme, setInternalHeroTheme] = useState<HeroTheme>('default');
  const heroTheme = externalHeroTheme ?? internalHeroTheme;
  const setHeroTheme = onSetHeroTheme ?? setInternalHeroTheme;
  const [customDiscounts, setCustomDiscounts] = useState<Record<string, number>>({});
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [customFreeShipping, setCustomFreeShipping] = useState<Record<string, boolean>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  /* Preço efetivo após desconto personalizado (ou original se não houver edição) */
  const getEffectivePrice = (product: typeof CATALOG_PRODUCTS[number], original: number) => {
    if (customPrices[product.id] !== undefined) return customPrices[product.id];
    const pct = customDiscounts[product.id];
    if (pct === undefined) return product.price;
    return Math.round(original * (1 - pct / 100));
  };

  const isFreeShipping = (product: typeof CATALOG_PRODUCTS[number], idx: number) => {
    if (customFreeShipping[product.id] !== undefined) return customFreeShipping[product.id];
    return idx % 3 === 0;
  };

  /* Modal de edição de produto */
  const EditProductModal = ({
    product,
    original,
    defaultFreeShipping,
    onClose,
  }: {
    product: typeof CATALOG_PRODUCTS[number];
    original: number;
    defaultFreeShipping: boolean;
    onClose: () => void;
  }) => {
    const currentPrice = customPrices[product.id] ?? product.price;
    const defaultPct = Math.round(((original - product.price) / original) * 100);
    const currentPct = customDiscounts[product.id] ?? defaultPct;
    const currentFreeShipping = customFreeShipping[product.id] ?? defaultFreeShipping;
    const [tempPrice, setTempPrice] = useState(currentPrice);
    const [tempPct, setTempPct] = useState(currentPct);
    const [tempFreeShipping, setTempFreeShipping] = useState(currentFreeShipping);

    const handleSave = () => {
      setCustomPrices((prev) => ({ ...prev, [product.id]: tempPrice }));
      setCustomDiscounts((prev) => ({ ...prev, [product.id]: tempPct }));
      setCustomFreeShipping((prev) => ({ ...prev, [product.id]: tempFreeShipping }));
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-[#061748] mb-4">Editar Produto</h3>
          <p className="text-sm text-[#45464f] mb-4 truncate">{product.name}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#061748] mb-1">Preço (R$)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={tempPrice}
                onChange={(e) => setTempPrice(Number(e.target.value) || 0)}
                className="w-full border border-[#eceef0] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C4D600]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#061748] mb-1">Desconto (%)</label>
              <input
                type="number"
                min={0}
                max={99}
                value={tempPct}
                onChange={(e) => setTempPct(Math.min(99, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full border border-[#eceef0] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C4D600]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTempFreeShipping(!tempFreeShipping)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${tempFreeShipping ? 'bg-[#C4D600]' : 'bg-[#eceef0]'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tempFreeShipping ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
              <span className="text-sm text-[#061748] font-medium">Frete Grátis</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#eceef0] text-[#45464f] text-sm font-bold py-2.5 rounded-lg hover:bg-[#f5f5f5] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-[#061748] text-white text-sm font-bold py-2.5 rounded-lg hover:bg-[#0a2060] transition-colors cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* Badge de desconto clicável com input inline */
  const DiscountBadge = ({
    product,
    original,
    freeShipping,
  }: {
    product: typeof CATALOG_PRODUCTS[number];
    original: number;
    freeShipping: boolean;
  }) => {
    const defaultPct = Math.round(((original - product.price) / original) * 100);
    const currentPct = customDiscounts[product.id] ?? defaultPct;
    const isEditing = editingDiscountId === product.id;

    if (original <= product.price && !isEditing) return null;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditingDiscountId(isEditing ? null : product.id);
        }}
        className={`absolute ${freeShipping ? 'top-[2.2rem]' : 'top-3'} left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md cursor-pointer hover:bg-[#b3c400] transition-colors`}
      >
        {isEditing ? (
          <input
            autoFocus
            type="number"
            min={0}
            max={99}
            defaultValue={currentPct}
            onClick={(ev) => ev.stopPropagation()}
            onChange={(ev) => {
              const val = Math.min(99, Math.max(0, Number(ev.target.value) || 0));
              setCustomDiscounts((prev) => ({ ...prev, [product.id]: val }));
            }}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === 'Escape') setEditingDiscountId(null);
            }}
            onBlur={() => setEditingDiscountId(null)}
            className="w-8 bg-transparent outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <>-{currentPct}%</>
        )}
      </button>
    );
  };

  const featuredProduct = CATALOG_PRODUCTS[0];
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const exclusiveRowRef = useRef<HTMLDivElement>(null);
  const newProductsRef = useRef<HTMLDivElement>(null);
  const newProductsRef2 = useRef<HTMLDivElement>(null);
  const newProductsRef3 = useRef<HTMLDivElement>(null);
  const newProductsRef4 = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    const cardWidth = ref.current.firstElementChild?.getBoundingClientRect().width ?? 280;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * 5;
    ref.current.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  };

  /* Rolagem infinita — duplica os cards e reposiciona silenciosamente ao atingir os limites */
  const setupInfiniteScroll = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current;
    if (!el || el.dataset.infiniteReady === 'true') return;
    el.dataset.infiniteReady = 'true';

    // Duplica o conteúdo para criar o loop visual
    const originalHTML = el.innerHTML;
    el.innerHTML = originalHTML + originalHTML;

    const handleScroll = () => {
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half - 10) {
        el.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
      } else if (el.scrollLeft <= 10) {
        el.scrollTo({ left: half, behavior: 'instant' as ScrollBehavior });
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
  }, []);

  useEffect(() => {
    [row1Ref, row2Ref, exclusiveRowRef, newProductsRef, newProductsRef2, newProductsRef3, newProductsRef4].forEach(setupInfiniteScroll);
  }, [setupInfiniteScroll]);

  return (
    <div className="w-full flex flex-col bg-white">
      {/* 1. HERO SECTION — HeroCapa (estilo DAPS com parallax multicamada) */}
      <HeroCapa
        onSelectProduct={onSelectProduct}
        onOpenCatalog={onOpenCatalog}
        theme={heroTheme}
      />

      {/* Botão de alternância de tema do Hero */}
      <button
        type="button"
        onClick={() => setHeroTheme(heroTheme === 'default' ? 'blackfriday' : 'default')}
        className="fixed bottom-6 right-6 z-50 bg-[#061748] text-white px-4 py-2 rounded-full shadow-lg hover:bg-[#0a2366] transition-colors text-sm font-medium flex items-center gap-2"
        aria-label={`Alternar para tema ${heroTheme === 'default' ? 'Black Friday' : 'padrão'}`}
      >
        <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
        {heroTheme === 'default' ? 'Modo Black Friday' : 'Modo Padrão'}
      </button>

      {/* 2. CURADORIA DE ALTA MODA ÓPTICA */}
      <section className="bg-white py-16 sm:py-20 relative z-0">
        <SectionShapes variant="diamonds" bg="white" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 mb-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight">
              Os Mais Desejados do Momento
            </h2>
            <p className="text-xs text-[#45464f] mt-2">
              As peças que estão conquistando nossos clientes, com estilo, conforto e qualidade em alta demanda.
            </p>
          </div>
        </div>

        {/* Row 1 — Armações */}
        <div className="mb-10 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative group/row">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#061748] uppercase tracking-wide">Armações em Destaque</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRow(row1Ref, 'left')}
                  className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Rolar para esquerda"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollRow(row1Ref, 'right')}
                  className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Rolar para direita"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenCatalog('armacoes')}
                className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1"
              >
                Ver todas <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
          </div>
          <div ref={row1Ref} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATALOG_PRODUCTS.slice(0, 20).map((product, idx) => {
              const original = product.originalPrice || Math.round(product.price * 1.25);
              const effectivePrice = getEffectivePrice(product, original);
              const pixPrice = Math.round(effectivePrice * 0.9);
              const installment = (effectivePrice / 10).toFixed(2).replace('.', ',');
              const showBFBadge = heroTheme === 'blackfriday' && idx % 3 === 0;
              const freeShipping = isFreeShipping(product, idx);
              const discountPctR1 = Math.round(((original - product.price) / original) * 100);
              const bfHighlightR1 = heroTheme === 'blackfriday' && (customDiscounts[product.id] ?? discountPctR1) >= 30;
              return (
                <div
                  key={`row1-${product.id}`}
                  className={`group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border ${bfHighlightR1 ? 'border-[#C4D600] border-2 shadow-[0_0_12px_rgba(196,214,0,0.4)]' : 'border-[#eceef0] hover:border-[#C4D600]/40'} hover:shadow-xl transition-all duration-300 flex flex-col`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                    {showBFBadge && (
                      <span className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none">
                        <span className="absolute top-4 -right-8 w-36 bg-[#C4D600] text-[#061748] text-[10px] font-black uppercase tracking-wider text-center py-1.5 rotate-45 shadow-md">
                          Black Friday
                        </span>
                      </span>
                    )}
                    {freeShipping && (
                      <span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                        Frete Grátis
                      </span>
                    )}
                    <DiscountBadge product={product} original={original} freeShipping={freeShipping} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingProductId(product.id); }}
                      className="absolute bottom-3 right-3 z-20 bg-white/90 hover:bg-[#C4D600] text-[#061748] p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                      title="Editar produto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">{product.brand}</p>
                    <h3
                      className="text-base font-bold text-[#061748] mb-3 truncate cursor-pointer hover:text-[#4156b8] transition-colors"
                      onClick={() => onSelectProduct(product)}
                    >
                      {product.name}
                    </h3>
                    <div className="mt-auto space-y-2">
                      {original > effectivePrice && (
                        <p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#061748]">R$ {effectivePrice.toFixed(2).replace('.', ',')}</span>
                        <span className="text-[11px] text-[#45464f]">à vista no PIX</span>
                      </div>
                      <p className="text-xs text-[#4156b8] font-semibold">
                        ou 10x de R$ {installment} sem juros
                      </p>
                      <div className="flex gap-2 pt-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(product); }}
                          className="flex-[2] bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
                        >
                          Comprar Agora
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelectProduct(product); }}
                          className="flex items-center justify-center p-3 border border-[#061748] text-[#061748] rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 2 — Óculos de Sol */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative group/row">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#061748] uppercase tracking-wide">Óculos de Sol</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRow(row2Ref, 'left')}
                  className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Rolar para esquerda"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollRow(row2Ref, 'right')}
                  className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Rolar para direita"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenCatalog('oculos-de-sol')}
                className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1"
              >
                Ver todos <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
          </div>
          <div ref={row2Ref} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[...CATALOG_PRODUCTS].reverse().slice(0, 20).map((product, idx) => {
              const original = product.originalPrice || Math.round(product.price * 1.25);
              const effectivePrice = getEffectivePrice(product, original);
              const installment = (effectivePrice / 10).toFixed(2).replace('.', ',');
              const freeShipping = isFreeShipping(product, idx);
              const showBFBadgeR2 = heroTheme === 'blackfriday' && idx % 3 === 0;
              const discountPctR2 = Math.round(((original - product.price) / original) * 100);
              const bfHighlightR2 = heroTheme === 'blackfriday' && (customDiscounts[product.id] ?? discountPctR2) >= 30;
              return (
                <div
                  key={`row2-${product.id}`}
                  className={`group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border ${bfHighlightR2 ? 'border-[#C4D600] border-2 shadow-[0_0_12px_rgba(196,214,0,0.4)]' : 'border-[#eceef0] hover:border-[#C4D600]/40'} hover:shadow-xl transition-all duration-300 flex flex-col`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                    {showBFBadgeR2 && (
                      <span className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none">
                        <span className="absolute top-4 -right-8 w-36 bg-[#C4D600] text-[#061748] text-[10px] font-black uppercase tracking-wider text-center py-1.5 rotate-45 shadow-md">
                          Black Friday
                        </span>
                      </span>
                    )}
                    {freeShipping && (
                      <span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                        Frete Grátis
                      </span>
                    )}
                    <DiscountBadge product={product} original={original} freeShipping={freeShipping} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingProductId(product.id); }}
                      className="absolute bottom-3 right-3 z-20 bg-white/90 hover:bg-[#C4D600] text-[#061748] p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                      title="Editar produto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">{product.brand}</p>
                    <h3
                      className="text-base font-bold text-[#061748] mb-3 truncate cursor-pointer hover:text-[#4156b8] transition-colors"
                      onClick={() => onSelectProduct(product)}
                    >
                      {product.name}
                    </h3>
                    <div className="mt-auto space-y-2">
                      {original > effectivePrice && (
                        <p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#061748]">R$ {effectivePrice.toFixed(2).replace('.', ',')}</span>
                        <span className="text-[11px] text-[#45464f]">à vista no PIX</span>
                      </div>
                      <p className="text-xs text-[#4156b8] font-semibold">
                        ou 10x de R$ {installment} sem juros
                      </p>
                      <div className="flex gap-2 pt-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(product); }}
                          className="flex-[2] bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
                        >
                          Comprar Agora
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelectProduct(product); }}
                          className="flex items-center justify-center p-3 border border-[#061748] text-[#061748] rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => onOpenCatalog('armacoes')}
            className="inline-flex items-center gap-3 bg-[#061748] text-white text-sm font-black uppercase tracking-wider px-10 py-4 rounded-full hover:bg-[#C4D600] hover:text-[#061748] active:scale-95 transition-all shadow-lg hover:shadow-[0_8px_30px_rgba(196,214,0,0.4)] cursor-pointer"
          >
            <span>Explorar Coleção Completa</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* 3. BENEFÍCIOS / DIFERENCIAIS */}
      <section className="w-full bg-[#061748] py-24 sm:py-32 relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[clamp(60px,10vh,120px)] before:bg-gradient-to-b before:from-white before:to-transparent before:pointer-events-none">
        <SectionShapes variant="arcs" bg="navy" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Por que escolher a gente?
            </h2>
            <p className="text-xs text-white/80 mt-2 font-medium">
              Mais do que óculos, entregamos uma experiência completa de compra com segurança e qualidade garantidas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                icon: 'verified',
                title: 'Autenticidade Garantida',
                desc: 'Todas as peças são originais, com certificado de autenticidade e nota fiscal.'
              },
              {
                icon: 'local_shipping',
                title: 'Entrega Rápida e Segura',
                desc: 'Envio para todo o Brasil com rastreamento em tempo real e embalagem premium.'
              },
              {
                icon: 'support_agent',
                title: 'Atendimento Especializado',
                desc: 'Ópticos e consultores de estilo disponíveis para ajudar na escolha ideal.'
              },
              {
                icon: 'autorenew',
                title: 'Troca Fácil em 30 Dias',
                desc: 'Não ficou perfeito? Troque ou devolva sem burocracia em até 30 dias.'
              }
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/10 rounded-2xl p-6 sm:p-8 border border-white/20 hover:bg-white hover:border-white/40 hover:-translate-y-2 hover:scale-[1.03] transition-all duration-300 flex flex-col items-center text-center group cursor-default backdrop-blur-sm"
              >
                <div className="w-14 h-14 rounded-full bg-[#C4D600] text-[#061748] flex items-center justify-center mb-5 group-hover:bg-[#061748] group-hover:text-[#C4D600] transition-colors duration-300">
                  <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide group-hover:text-[#061748] transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-xs text-white/80 leading-relaxed group-hover:text-[#45464f] transition-colors duration-300">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Fade azul para branco na parte inferior da seção */}
        <div className="absolute bottom-0 left-0 right-0 h-[clamp(80px,12vh,150px)] bg-gradient-to-b from-transparent via-[#061748]/50 to-white pointer-events-none z-20" />
      </section>

      {/* 4. CONHEÇA A LINHA EXCLUSIVA */}
      <section className="bg-white py-16 sm:py-20 relative">
        <SectionShapes variant="circles" bg="white" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 mb-10 relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight">
              Conheça a Linha Exclusiva
            </h2>
            <p className="text-xs text-[#45464f] mt-2">
              Peças selecionadas com design autoral e acabamento premium para quem busca algo único.
            </p>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative group/row">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#061748] uppercase tracking-wide">Linha Exclusiva</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => exclusiveRowRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Rolar para esquerda"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => exclusiveRowRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Rolar para direita"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenCatalog?.('oculos-de-sol')}
                className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1"
              >
                Ver todos <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div ref={exclusiveRowRef} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATALOG_PRODUCTS.slice(5, 15).map((product, idx) => {
              const original = product.originalPrice || Math.round(product.price * 1.25);
              const effectivePrice = getEffectivePrice(product, original);
              const pixPrice = Math.round(effectivePrice * 0.9);
              const installment = (effectivePrice / 10).toFixed(2).replace('.', ',');
              const showBFBadgeExcl = heroTheme === 'blackfriday' && idx % 3 === 0;
              const freeShipping = isFreeShipping(product, idx);
              const discountPctExcl = Math.round(((original - product.price) / original) * 100);
              const bfHighlightExcl = heroTheme === 'blackfriday' && (customDiscounts[product.id] ?? discountPctExcl) >= 30;
              return (
                <div
                  key={`exclusive-${product.id}`}
                  className={`group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border ${bfHighlightExcl ? 'border-[#C4D600] border-2 shadow-[0_0_12px_rgba(196,214,0,0.4)]' : 'border-[#eceef0] hover:border-[#C4D600]/40'} hover:shadow-xl transition-all duration-300 flex flex-col`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                    {showBFBadgeExcl && (
                      <span className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none">
                        <span className="absolute top-4 -right-8 w-36 bg-[#C4D600] text-[#061748] text-[10px] font-black uppercase tracking-wider text-center py-1.5 rotate-45 shadow-md">
                          Black Friday
                        </span>
                      </span>
                    )}
                    <DiscountBadge product={product} original={original} freeShipping={freeShipping} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingProductId(product.id); }}
                      className="absolute bottom-3 right-3 z-20 bg-white/90 hover:bg-[#C4D600] text-[#061748] p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                      title="Editar produto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">{product.brand}</p>
                    <h3
                      className="text-base font-bold text-[#061748] mb-3 truncate cursor-pointer hover:text-[#4156b8] transition-colors"
                      onClick={() => onSelectProduct(product)}
                    >
                      {product.name}
                    </h3>
                    <div className="mt-auto space-y-2">
                      {original > effectivePrice && (
                        <p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#061748]">R$ {effectivePrice.toFixed(2).replace('.', ',')}</span>
                        <span className="text-[11px] text-[#45464f]">à vista no PIX</span>
                      </div>
                      <p className="text-xs text-[#4156b8] font-semibold">
                        ou 10x de R$ {installment} sem juros
                      </p>
                      <div className="flex gap-2 pt-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(product); }}
                          className="flex-[2] bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
                        >
                          Comprar Agora
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelectProduct(product); }}
                          className="flex items-center justify-center p-3 border border-[#061748] text-[#061748] rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. NEWSLETTER SECTION */}
      <section className="w-full bg-[#061748] py-16 sm:py-20 relative overflow-hidden">
        <SectionShapes variant="mixed" bg="navy" />
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#C4D600]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#4156b8]/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative z-10">
          <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                Fique por dentro das <span className="text-[#C4D600]">novidades</span>
              </h2>
              <p className="text-sm sm:text-base text-[#b6c4fe] leading-relaxed max-w-lg mx-auto">
                Receba em primeira mão lançamentos exclusivos, convites para eventos privados e dicas de especialistas em óptica.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); }} className="w-full max-w-md flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                required
                placeholder="Seu melhor e-mail"
                className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-3.5 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-[#C4D600] focus:bg-white/15 transition-all backdrop-blur-sm"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-[#C4D600] text-[#061748] text-sm font-black px-8 py-3.5 rounded-full hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(196,214,0,0.3)] whitespace-nowrap cursor-pointer"
              >
                Inscrever-se
              </button>
            </form>

            <p className="text-[11px] text-white/40 mt-2">
              Respeitamos sua privacidade. Cancele quando quiser.
            </p>
          </div>
        </div>
      </section>

      {/* 6. MAIS PRODUTOS — Nova seção após newsletter */}
      <section className="bg-white py-16 sm:py-20 relative">
        <SectionShapes variant="mixed" bg="white" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 mb-10 relative z-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight">
              Explore Nossa Coleção Completa
            </h2>
            <p className="text-xs text-[#45464f] mt-2">
              Descubra mais modelos exclusivos com design premium e tecnologia avançada para todos os estilos.
            </p>
          </div>
        </div>

      <div className="mb-10 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative group/row z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#061748] uppercase tracking-wide">Novidades da Semana</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollRow(newProductsRef, 'left')}
                className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                aria-label="Rolar para esquerda"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => scrollRow(newProductsRef, 'right')}
                className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer"
                aria-label="Rolar para direita"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => onOpenCatalog('oculos-de-sol')}
              className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1"
            >
              Ver todos <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        </div>
        <div ref={newProductsRef} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATALOG_PRODUCTS.slice(5, 25).map((product, idx) => {
            const original = product.originalPrice || Math.round(product.price * 1.25);
            const effectivePrice = getEffectivePrice(product, original);
            const pixPrice = Math.round(effectivePrice * 0.9);
            const installment = (effectivePrice / 10).toFixed(2).replace('.', ',');
            const showBFBadge = heroTheme === 'blackfriday' && idx % 4 === 0;
            const freeShipping = isFreeShipping(product, idx);
            const discountPctNP1 = Math.round(((original - effectivePrice) / original) * 100);
            const bfHighlightNP1 = heroTheme === 'blackfriday' && discountPctNP1 >= 30;
            return (
              <div
                key={`new-row-${product.id}`}
                className={`group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border ${bfHighlightNP1 ? 'border-[#C4D600] border-2 shadow-[0_0_12px_rgba(196,214,0,0.4)]' : 'border-[#eceef0] hover:border-[#C4D600]/40'} hover:shadow-xl transition-all duration-300 flex flex-col`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                  {showBFBadge && (
                    <span className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none">
                      <span className="absolute top-4 -right-8 w-36 bg-[#C4D600] text-[#061748] text-[10px] font-black uppercase tracking-wider text-center py-1.5 rotate-45 shadow-md">
                        Black Friday
                      </span>
                    </span>
                  )}
                  {freeShipping && (
                    <span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                      Frete Grátis
                    </span>
                  )}
                  {freeShipping && original > effectivePrice && (
                    <span className="absolute top-[2.2rem] left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                      -{discountPctNP1}%
                    </span>
                  )}
                  {!freeShipping && original > effectivePrice && (
                    <span className="absolute top-3 left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                      -{discountPctNP1}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingProductId(product.id); }}
                    className="absolute bottom-3 right-3 z-20 bg-white/90 hover:bg-[#C4D600] text-[#061748] p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                    title="Editar produto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">{product.brand}</p>
                  <h3
                    className="text-base font-bold text-[#061748] mb-3 truncate cursor-pointer hover:text-[#4156b8] transition-colors"
                    onClick={() => onSelectProduct(product)}
                  >
                    {product.name}
                  </h3>
                  <div className="mt-auto space-y-2">
                    {original > effectivePrice && (
                      <p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-[#061748]">R$ {effectivePrice.toFixed(2).replace('.', ',')}</span>
                      <span className="text-[11px] text-[#45464f]">à vista no PIX</span>
                    </div>
                    <p className="text-xs text-[#4156b8] font-semibold">
                      ou 10x de R$ {installment} sem juros
                    </p>
                    <div className="flex gap-2 pt-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(product); }}
                        className="flex-[2] bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
                      >
                        Comprar Agora
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSelectProduct(product); }}
                        className="flex items-center justify-center p-3 border border-[#061748] text-[#061748] rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista 2 — Mais Vendidos */}
      <div className="mb-10 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative group/row z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#061748] uppercase tracking-wide">Mais Vendidos</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => scrollRow(newProductsRef2, 'left')} className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer" aria-label="Rolar para esquerda"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <button type="button" onClick={() => scrollRow(newProductsRef2, 'right')} className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer" aria-label="Rolar para direita"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
            <button type="button" onClick={() => onOpenCatalog('armacoes')} className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1">Ver todos <span className="material-symbols-outlined text-[14px]">chevron_right</span></button>
          </div>
        </div>
        <div ref={newProductsRef2} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATALOG_PRODUCTS.slice(10, 30).map((product, idx) => {
            const original = product.originalPrice || Math.round(product.price * 1.25);
            const effectivePrice = getEffectivePrice(product, original);
            const pixPrice = Math.round(effectivePrice * 0.9);
            const installment = (effectivePrice / 10).toFixed(2).replace('.', ',');
            const showBFBadge = heroTheme === 'blackfriday' && idx % 4 === 0;
            const freeShipping = isFreeShipping(product, idx);
            const discountPctNP2 = Math.round(((original - effectivePrice) / original) * 100);
            const bfHighlightNP2 = heroTheme === 'blackfriday' && discountPctNP2 >= 30;
            return (
              <div key={`np2-${product.id}`} className={`group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border ${bfHighlightNP2 ? 'border-[#C4D600] border-2 shadow-[0_0_12px_rgba(196,214,0,0.4)]' : 'border-[#eceef0] hover:border-[#C4D600]/40'} hover:shadow-xl transition-all duration-300 flex flex-col`}>
                <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                  {showBFBadge && (<span className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none"><span className="absolute top-4 -right-8 w-36 bg-[#C4D600] text-[#061748] text-[10px] font-black uppercase tracking-wider text-center py-1.5 rotate-45 shadow-md">Black Friday</span></span>)}
                  {freeShipping && (<span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">Frete Grátis</span>)}
                  {freeShipping && original > effectivePrice && (<span className="absolute top-[2.2rem] left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">-{discountPctNP2}%</span>)}
                  {!freeShipping && original > effectivePrice && (<span className="absolute top-3 left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">-{discountPctNP2}%</span>)}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingProductId(product.id); }} className="absolute bottom-3 right-3 z-20 bg-white/90 hover:bg-[#C4D600] text-[#061748] p-1.5 rounded-full shadow-md transition-all cursor-pointer" title="Editar produto"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">{product.brand}</p>
                  <h3 className="text-base font-bold text-[#061748] mb-3 truncate cursor-pointer hover:text-[#4156b8] transition-colors" onClick={() => onSelectProduct(product)}>{product.name}</h3>
                  <div className="mt-auto space-y-2">
                    {original > effectivePrice && (<p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>)}
                    <div className="flex items-baseline gap-2"><span className="text-xl font-black text-[#061748]">R$ {effectivePrice.toFixed(2).replace('.', ',')}</span><span className="text-[11px] text-[#45464f]">à vista no PIX</span></div>
                    <p className="text-xs text-[#4156b8] font-semibold">ou 10x de R$ {installment} sem juros</p>
                    <div className="flex gap-2 pt-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(product); }} className="flex-[2] bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer">Comprar Agora</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onSelectProduct(product); }} className="flex items-center justify-center p-3 border border-[#061748] text-[#061748] rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista 3 — Lançamentos */}
      <div className="mb-10 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative group/row z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#061748] uppercase tracking-wide">Lançamentos</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => scrollRow(newProductsRef3, 'left')} className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer" aria-label="Rolar para esquerda"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <button type="button" onClick={() => scrollRow(newProductsRef3, 'right')} className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer" aria-label="Rolar para direita"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
            <button type="button" onClick={() => onOpenCatalog('oculos-de-sol')} className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1">Ver todos <span className="material-symbols-outlined text-[14px]">chevron_right</span></button>
          </div>
        </div>
        <div ref={newProductsRef3} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATALOG_PRODUCTS.slice(15, 35).map((product, idx) => {
            const original = product.originalPrice || Math.round(product.price * 1.25);
            const effectivePrice = getEffectivePrice(product, original);
            const pixPrice = Math.round(effectivePrice * 0.9);
            const installment = (effectivePrice / 10).toFixed(2).replace('.', ',');
            const showBFBadge = heroTheme === 'blackfriday' && idx % 4 === 0;
            const freeShipping = isFreeShipping(product, idx);
            const discountPctNP3 = Math.round(((original - effectivePrice) / original) * 100);
            const bfHighlightNP3 = heroTheme === 'blackfriday' && discountPctNP3 >= 30;
            return (
              <div key={`np3-${product.id}`} className={`group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border ${bfHighlightNP3 ? 'border-[#C4D600] border-2 shadow-[0_0_12px_rgba(196,214,0,0.4)]' : 'border-[#eceef0] hover:border-[#C4D600]/40'} hover:shadow-xl transition-all duration-300 flex flex-col`}>
                <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                  {showBFBadge && (<span className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none"><span className="absolute top-4 -right-8 w-36 bg-[#C4D600] text-[#061748] text-[10px] font-black uppercase tracking-wider text-center py-1.5 rotate-45 shadow-md">Black Friday</span></span>)}
                  {freeShipping && (<span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">Frete Grátis</span>)}
                  {freeShipping && original > effectivePrice && (<span className="absolute top-[2.2rem] left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">-{discountPctNP3}%</span>)}
                  {!freeShipping && original > effectivePrice && (<span className="absolute top-3 left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">-{discountPctNP3}%</span>)}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingProductId(product.id); }} className="absolute bottom-3 right-3 z-20 bg-white/90 hover:bg-[#C4D600] text-[#061748] p-1.5 rounded-full shadow-md transition-all cursor-pointer" title="Editar produto"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">{product.brand}</p>
                  <h3 className="text-base font-bold text-[#061748] mb-3 truncate cursor-pointer hover:text-[#4156b8] transition-colors" onClick={() => onSelectProduct(product)}>{product.name}</h3>
                  <div className="mt-auto space-y-2">
                    {original > effectivePrice && (<p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>)}
                    <div className="flex items-baseline gap-2"><span className="text-xl font-black text-[#061748]">R$ {effectivePrice.toFixed(2).replace('.', ',')}</span><span className="text-[11px] text-[#45464f]">à vista no PIX</span></div>
                    <p className="text-xs text-[#4156b8] font-semibold">ou 10x de R$ {installment} sem juros</p>
                    <div className="flex gap-2 pt-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(product); }} className="flex-[2] bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer">Comprar Agora</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onSelectProduct(product); }} className="flex items-center justify-center p-3 border border-[#061748] text-[#061748] rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista 4 — Ofertas Especiais */}
      <div className="mb-4 max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative group/row z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#061748] uppercase tracking-wide">Ofertas Especiais</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => scrollRow(newProductsRef4, 'left')} className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer" aria-label="Rolar para esquerda"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <button type="button" onClick={() => scrollRow(newProductsRef4, 'right')} className="w-8 h-8 rounded-full bg-[#f2f4f6] hover:bg-[#061748] hover:text-white text-[#061748] flex items-center justify-center transition-all cursor-pointer" aria-label="Rolar para direita"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
            <button type="button" onClick={() => onOpenCatalog('lentes-de-grau')} className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1">Ver todos <span className="material-symbols-outlined text-[14px]">chevron_right</span></button>
          </div>
        </div>
        <div ref={newProductsRef4} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATALOG_PRODUCTS.slice(20, 40).map((product, idx) => {
            const original = product.originalPrice || Math.round(product.price * 1.25);
            const effectivePrice = getEffectivePrice(product, original);
            const pixPrice = Math.round(effectivePrice * 0.9);
            const installment = (effectivePrice / 10).toFixed(2).replace('.', ',');
            const showBFBadge = heroTheme === 'blackfriday' && idx % 4 === 0;
            const freeShipping = isFreeShipping(product, idx);
            const discountPctNP4 = Math.round(((original - effectivePrice) / original) * 100);
            const bfHighlightNP4 = heroTheme === 'blackfriday' && discountPctNP4 >= 30;
            return (
              <div key={`np4-${product.id}`} className={`group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border ${bfHighlightNP4 ? 'border-[#C4D600] border-2 shadow-[0_0_12px_rgba(196,214,0,0.4)]' : 'border-[#eceef0] hover:border-[#C4D600]/40'} hover:shadow-xl transition-all duration-300 flex flex-col`}>
                <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                  {showBFBadge && (<span className="absolute top-0 right-0 z-20 overflow-hidden w-28 h-28 pointer-events-none"><span className="absolute top-4 -right-8 w-36 bg-[#C4D600] text-[#061748] text-[10px] font-black uppercase tracking-wider text-center py-1.5 rotate-45 shadow-md">Black Friday</span></span>)}
                  {freeShipping && (<span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">Frete Grátis</span>)}
                  {freeShipping && original > effectivePrice && (<span className="absolute top-[2.2rem] left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">-{discountPctNP4}%</span>)}
                  {!freeShipping && original > effectivePrice && (<span className="absolute top-3 left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">-{discountPctNP4}%</span>)}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingProductId(product.id); }} className="absolute bottom-3 right-3 z-20 bg-white/90 hover:bg-[#C4D600] text-[#061748] p-1.5 rounded-full shadow-md transition-all cursor-pointer" title="Editar produto"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">{product.brand}</p>
                  <h3 className="text-base font-bold text-[#061748] mb-3 truncate cursor-pointer hover:text-[#4156b8] transition-colors" onClick={() => onSelectProduct(product)}>{product.name}</h3>
                  <div className="mt-auto space-y-2">
                    {original > effectivePrice && (<p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>)}
                    <div className="flex items-baseline gap-2"><span className="text-xl font-black text-[#061748]">R$ {effectivePrice.toFixed(2).replace('.', ',')}</span><span className="text-[11px] text-[#45464f]">à vista no PIX</span></div>
                    <p className="text-xs text-[#4156b8] font-semibold">ou 10x de R$ {installment} sem juros</p>
                    <div className="flex gap-2 pt-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(product); }} className="flex-[2] bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer">Comprar Agora</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onSelectProduct(product); }} className="flex items-center justify-center p-3 border border-[#061748] text-[#061748] rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

      {editingProductId && (() => {
        const product = CATALOG_PRODUCTS.find((p) => p.id === editingProductId);
        if (!product) return null;
        const original = product.originalPrice || Math.round(product.price * 1.25);
        const idx = CATALOG_PRODUCTS.indexOf(product);
        const defaultFreeShipping = idx % 3 === 0;
        return (
          <EditProductModal
            product={product}
            original={original}
            defaultFreeShipping={defaultFreeShipping}
            onClose={() => setEditingProductId(null)}
          />
        );
      })()}
    </div>
  );
}