import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EyewearProduct, OrderItem } from '../types';
import { LENS_OPTIONS, CATALOG_PRODUCTS } from '../data/mockData';

interface ProductPageProps {
  product: EyewearProduct;
  onGoToCheckout: (item: OrderItem) => void;
  onOpenLensGuide: () => void;
  onOpenCepModal: () => void;
  onSelectProduct?: (product: EyewearProduct) => void;
  onGoToCheckoutWithProduct?: (product: EyewearProduct) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  product,
  onGoToCheckout,
  onOpenLensGuide,
  onOpenCepModal,
  onSelectProduct,
  onGoToCheckoutWithProduct
}) => {
  const similarRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  const similarProducts = CATALOG_PRODUCTS.filter(
    (p) => p.brand === product.brand && p.id !== product.id
  ).slice(0, 20);

  // Infinite scroll: use fixed card dimensions to avoid layout-dependent jumps
  useEffect(() => {
    const container = similarRef.current;
    if (!container || similarProducts.length === 0) return;

    const CARD_W = 256;
    const GAP = 16;
    const SET_WIDTH = similarProducts.length * (CARD_W + GAP);

    // Initialize at the start of the middle set
    container.scrollLeft = SET_WIDTH;

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;
      const { scrollLeft } = container;

      // User scrolled into the left clone → jump forward by one set
      if (scrollLeft < SET_WIDTH - CARD_W) {
        isScrollingProgrammatically.current = true;
        container.scrollLeft = scrollLeft + SET_WIDTH;
        requestAnimationFrame(() => { isScrollingProgrammatically.current = false; });
      }
      // User scrolled into the right clone → jump back by one set
      else if (scrollLeft >= SET_WIDTH * 2 - CARD_W) {
        isScrollingProgrammatically.current = true;
        container.scrollLeft = scrollLeft - SET_WIDTH;
        requestAnimationFrame(() => { isScrollingProgrammatically.current = false; });
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [similarProducts]);

  const scrollSimilar = (direction: 'left' | 'right') => {
    const container = similarRef.current;
    if (!container || similarProducts.length === 0) return;

    const CARD_W = 256;
    const GAP = 16;
    const STEP = (CARD_W + GAP) * 4;

    // Use relative scrollBy so the browser always animates in the correct direction.
    // The infinite-scroll handler will silently reposition after the animation ends.
    isScrollingProgrammatically.current = true;
    container.scrollBy({ left: direction === 'right' ? STEP : -STEP, behavior: 'smooth' });

    const releaseLock = () => {
      isScrollingProgrammatically.current = false;
      container.removeEventListener('scrollend', releaseLock);
    };
    container.addEventListener('scrollend', releaseLock, { once: true });
    setTimeout(() => { isScrollingProgrammatically.current = false; }, 600);
  };
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.availableColors?.[0] || { name: product.colorName, hex: product.colorHex });
  const [selectedCalibre, setSelectedCalibre] = useState(product.calibre);
  const [selectedLens, setSelectedLens] = useState(LENS_OPTIONS[0]);
  const [isVirtualTryOnActive, setIsVirtualTryOnActive] = useState(false);

  const images = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];
  const totalPrice = product.price + selectedLens.includedPrice;
  const pixPrice = totalPrice * 0.95;

  const handleBuyNow = () => {
    const item: OrderItem = {
      id: product.id,
      name: product.name,
      subtitle: `${selectedColor.name} • ${selectedCalibre}`,
      color: selectedColor.name,
      size: selectedCalibre,
      lensType: selectedLens.name,
      price: totalPrice,
      image: images[0],
      quantity: 1
    };
    onGoToCheckout(item);
  };

  return (
    <div className="w-full bg-[#f7f9fb] pb-16">
      {/* Breadcrumb */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 py-4">
        <nav className="text-xs text-[#767680] flex items-center gap-1.5">
          <span className="hover:text-[#061748] cursor-pointer">Início</span>
          <span>/</span>
          <span className="hover:text-[#061748] cursor-pointer">Coleções</span>
          <span>/</span>
          <span className="hover:text-[#061748] cursor-pointer">Armações em Titânio</span>
          <span>/</span>
          <span className="text-[#061748] font-bold">{product.name}</span>
        </nav>
      </div>

      {/* Main PDP Grid */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* LEFT: Product Gallery & Virtual Try-On (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Main Stage Image / Virtual Try-On Stage */}
            <div className="relative w-full h-80 sm:h-96 md:h-[480px] bg-white rounded-3xl p-6 sm:p-10 flex items-center justify-center border border-[#eceef0] shadow-sm overflow-hidden group">
              {product.badge && (
                <span className="absolute top-5 left-5 bg-[#061748] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm z-10">
                  {product.badge}
                </span>
              )}

              {/* Virtual Try-On overlay toggle */}
              <button
                type="button"
                onClick={() => setIsVirtualTryOnActive(!isVirtualTryOnActive)}
                className="absolute top-5 right-5 bg-white/90 backdrop-blur-md border border-[#c6c5d0] text-[#061748] hover:bg-[#061748] hover:text-white transition-all text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm cursor-pointer z-10"
              >
                <span className="material-symbols-outlined text-[16px]">face</span>
                <span>{isVirtualTryOnActive ? 'Ver Produto Solo' : 'Simulação no Rosto'}</span>
              </button>

              {isVirtualTryOnActive ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center animate-fadeIn">
                  <img
                    src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80"
                    alt="Modelo com óculos"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                  <div className="absolute bottom-3 bg-black/70 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-xs font-medium">
                    Simulação de Prova Facial • Calibre M (50mm)
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={images[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Gallery Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm border border-[#eceef0] rounded-full flex items-center justify-center shadow-md hover:bg-[#061748] hover:text-white hover:border-[#061748] transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-10"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm border border-[#eceef0] rounded-full flex items-center justify-center shadow-md hover:bg-[#061748] hover:text-white hover:border-[#061748] transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-10"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Thumbnail Row */}
            <div className="grid grid-cols-4 gap-3">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsVirtualTryOnActive(false);
                    setSelectedImageIndex(idx);
                  }}
                  className={`h-20 sm:h-24 bg-white rounded-2xl p-2 border flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                    selectedImageIndex === idx && !isVirtualTryOnActive
                      ? 'border-[#061748] ring-2 ring-[#061748]/20 shadow-sm'
                      : 'border-[#eceef0] hover:border-[#c6c5d0]'
                  }`}
                >
                  <img src={imgUrl} alt={`Ângulo ${idx + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* Info Cards Row - Below Images */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-white p-4 rounded-2xl border border-[#eceef0] flex flex-col items-center text-center gap-1">
                <span className="material-symbols-outlined text-[#4156b8] text-[24px]">precision_manufacturing</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#767680]">Material</span>
                <span className="text-xs font-bold text-[#061748]">{product.material.split(' ')[0]}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#eceef0] flex flex-col items-center text-center gap-1">
                <span className="material-symbols-outlined text-[#4156b8] text-[24px]">scale</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#767680]">Peso</span>
                <span className="text-xs font-bold text-[#061748]">{product.specs.weight}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#eceef0] flex flex-col items-center text-center gap-1">
                <span className="material-symbols-outlined text-[#4156b8] text-[24px]">verified</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#767680]">Garantia</span>
                <span className="text-xs font-bold text-[#061748]">2 Anos</span>
              </div>
            </div>

            {/* Description Block - Below Info Cards */}
            <section className="flex flex-col gap-3 mt-6 bg-white p-6 rounded-2xl border border-[#eceef0]">
              <h2 className="text-xl font-bold text-[#061748]">Sobre o Produto</h2>
              <p className="text-[#45464f] leading-relaxed text-sm">
                {product.fullStory || product.description}
              </p>
            </section>

            {/* Technical Specifications Grid - Redesigned */}
            <section className="flex flex-col gap-4 mt-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4156b8] text-[20px]">description</span>
                <h2 className="text-lg font-bold text-[#061748]">Ficha Técnica</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Modelo', value: product.name, icon: 'eyeglasses' },
                  { label: 'Marca', value: product.brand, icon: 'branding_watermark' },
                  { label: 'Material', value: product.material.split(' ')[0], icon: 'category' },
                  { label: 'Formato', value: product.shape, icon: 'pentagon' },
                  { label: 'Lente', value: product.specs.lensWidth, icon: 'width_wide' },
                  { label: 'Ponte', value: product.specs.bridgeWidth, icon: 'height' },
                  { label: 'Haste', value: product.specs.templeLength, icon: 'straighten' },
                  { label: 'Peso', value: product.specs.weight, icon: 'scale' },
                  { label: 'Dobradiça', value: product.specs.hingeType, icon: 'settings_motion_mode' },
                  { label: 'Origem', value: product.specs.origin, icon: 'public' },
                ].map((spec) => (
                  <div
                    key={spec.label}
                    className="bg-white p-3 rounded-xl border border-[#eceef0] hover:border-[#c6c5d0] transition-colors flex flex-col gap-1 group"
                  >
                    <div className="flex items-center gap-1.5 text-[#767680] mb-0.5">
                      <span className="material-symbols-outlined text-[14px] group-hover:text-[#4156b8] transition-colors">{spec.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{spec.label}</span>
                    </div>
                    <span className="text-xs font-bold text-[#061748] leading-tight break-words">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Similar Products Carousel — Below Ficha Técnica */}
            {similarProducts.length > 0 && (
              <section className="mt-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4156b8] text-[20px]">storefront</span>
                    <h2 className="text-lg font-bold text-[#061748]">Produtos Similares</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => scrollSimilar('left')}
                      className="w-8 h-8 rounded-full border border-[#e0e3e5] flex items-center justify-center hover:bg-[#061748] hover:text-white hover:border-[#061748] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollSimilar('right')}
                      className="w-8 h-8 rounded-full border border-[#e0e3e5] flex items-center justify-center hover:bg-[#061748] hover:text-white hover:border-[#061748] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div ref={similarRef} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[...similarProducts, ...similarProducts, ...similarProducts].map((simProduct, idx) => {
                    const original = simProduct.originalPrice || Math.round(simProduct.price * 1.25);
                    const installment = (simProduct.price / 10).toFixed(2).replace('.', ',');
                    const freeShipping = idx % 3 === 0;
                    return (
                      <div
                        key={`similar-${simProduct.id}-${idx}`}
                        className="group flex-none w-[256px] snap-start bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col"
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct?.(simProduct)}>
                          {freeShipping && (
                            <span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                              Frete Grátis
                            </span>
                          )}
                          {original > simProduct.price && (
                            <span className="absolute top-3 right-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                              -{Math.round(((original - simProduct.price) / original) * 100)}%
                            </span>
                          )}
                          <img
                            src={simProduct.image}
                            alt={simProduct.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-[10px] text-[#45464f] mb-0.5 uppercase tracking-wide">{simProduct.brand}</p>
                          <h3
                            className="text-sm font-bold text-[#061748] mb-2 truncate cursor-pointer hover:text-[#4156b8] transition-colors"
                            onClick={() => onSelectProduct?.(simProduct)}
                          >
                            {simProduct.name}
                          </h3>
                          <div className="mt-auto space-y-1.5">
                            {original > simProduct.price && (
                              <p className="text-[11px] text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                            )}
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-black text-[#061748]">R$ {simProduct.price.toFixed(2).replace('.', ',')}</span>
                              <span className="text-[10px] text-[#45464f]">à vista no PIX</span>
                            </div>
                            <p className="text-[11px] text-[#4156b8] font-semibold">
                              ou 10x de R$ {installment} sem juros
                            </p>
                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onGoToCheckoutWithProduct?.(simProduct); }}
                                className="flex-1 bg-[#061748] text-white text-xs font-bold py-2.5 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
                              >
                                Comprar Agora
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onSelectProduct?.(simProduct); }}
                                className="flex-1 border border-[#061748] text-[#061748] text-xs font-bold py-2.5 rounded-lg hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"
                              >
                                + Carrinho
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT: Product Details & Configurator (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6 bg-white p-6 md:p-8 rounded-3xl border border-[#eceef0] shadow-sm sticky top-24">
            {/* Title & Brand */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#4156b8]">
                {product.brand}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight mt-1">
                {product.name}
              </h1>

              {/* Review rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex text-amber-500 text-sm">
                  {'★'.repeat(5)}
                </div>
                <span className="text-xs font-bold text-[#061748]">{product.rating}</span>
                <span className="text-xs text-[#767680]">({product.reviewCount} avaliações verificadas)</span>
              </div>
            </div>

            {/* Price Box - PIX Hero */}
            <div className="relative bg-gradient-to-br from-[#f8f9fb] to-[#eef1f5] p-5 rounded-2xl border border-[#dce0e6] shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#C4D600]/10 rounded-bl-full pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                  {selectedColor.name} com Lentes
                </span>

                {/* PIX Price - Primary */}
                <div className="flex items-end justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="material-symbols-outlined text-[#C4D600] text-[18px] fill-current drop-shadow-sm">account_balance_wallet</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#061748]/70">
                        Preço no Pix
                      </span>
                    </div>
                    <div className="text-4xl sm:text-[2.7rem] font-black text-[#061748] tracking-tighter leading-none">
                      R$ {pixPrice.toFixed(2).replace('.', ',')}
                    </div>
                    <span className="inline-flex self-start items-center gap-1 text-[10px] font-bold text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-md mt-1">
                      <span className="material-symbols-outlined text-[12px]">savings</span>
                      Economia de R$ {(totalPrice - pixPrice).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-[#C4D600] text-[#061748] shadow-[0_4px_12px_rgba(196,214,0,0.4)]">
                    <span className="text-lg font-black leading-none">5%</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide leading-none">OFF</span>
                  </div>
                </div>

                <div className="h-px w-full bg-[#061748]/8 my-0.5" />

                {/* Card Price + Installments */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#45464f]">
                    <span className="material-symbols-outlined text-[18px] text-[#061748]/40">credit_card</span>
                    <span>
                      <span className="text-xs text-[#9ca3af] mr-1">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
                      ou até <strong className="text-[#061748] font-bold">10x</strong> de{' '}
                      <strong className="text-[#061748] font-bold">
                        R$ {(totalPrice / 10).toFixed(2).replace('.', ',')}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#061748]/50 uppercase tracking-wider">
                    Sem juros
                  </span>
                </div>
              </div>
            </div>

            {/* 1. Color Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#061748] uppercase tracking-wide">Cor</label>
              <div className="flex flex-wrap gap-2">
                {product.availableColors?.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-all ${
                      selectedColor.name === color.name
                        ? 'border-[#061748] scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
              <span className="text-xs text-[#767680]">{selectedColor.name}</span>
            </div>

            {/* 2. Calibre Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#061748] uppercase tracking-wide">Calibre</label>
                <button
                  type="button"
                  onClick={onOpenLensGuide}
                  className="text-[10px] font-bold text-[#4156b8] hover:underline cursor-pointer"
                >
                  Guia de Medidas
                </button>
              </div>
              <div className="flex gap-2">
                {product.availableCalibres?.map((cal) => (
                  <button
                    key={cal}
                    type="button"
                    onClick={() => setSelectedCalibre(cal)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedCalibre === cal
                        ? 'bg-[#061748] text-white border-[#061748] shadow-md'
                        : 'bg-white text-[#061748] border-[#e0e3e5] hover:border-[#061748]'
                    }`}
                  >
                    {cal}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Lens Type Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#061748] uppercase tracking-wide">Tipo de Lente</label>
              <div className="flex flex-col gap-2">
                {LENS_OPTIONS.map((lens) => (
                  <button
                    key={lens.id}
                    type="button"
                    onClick={() => setSelectedLens(lens)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all cursor-pointer flex justify-between items-center ${
                      selectedLens.id === lens.id
                        ? 'bg-[#f0f4ff] border-[#4156b8] text-[#061748] font-bold'
                        : 'bg-white border-[#e0e3e5] text-[#45464f] hover:border-[#c6c5d0]'
                    }`}
                  >
                    <span>{lens.name}</span>
                    {lens.includedPrice > 0 && (
                      <span className="text-[10px] opacity-60">+ R$ {lens.includedPrice}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 mt-2">
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full bg-[#061748] text-white text-sm font-black py-4 rounded-xl hover:bg-[#0a2470] active:scale-[0.98] transition-all shadow-lg shadow-[#061748]/20 cursor-pointer"
              >
                Comprar Agora
              </button>

              <button
                type="button"
                onClick={onOpenCepModal}
                className="w-full bg-white text-[#061748] border border-[#e0e3e5] text-sm font-bold py-3.5 rounded-xl hover:bg-[#f7f9fb] hover:border-[#061748] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                Calcular Frete e Prazo
              </button>
            </div>
          </div>
        </div>

              </div>
    </div>
  );
};