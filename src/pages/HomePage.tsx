import React, { useRef, useState } from 'react';
import { CATALOG_PRODUCTS } from '../data/mockData';
import { EyewearProduct } from '../types';
import HeroCapa from '../components/HeroCapa';
import '../components/HeroCapa.css';

interface HomePageProps {
  onSelectProduct: (product: EyewearProduct) => void;
  onGoToCheckoutWithProduct: (product: EyewearProduct) => void;
  onOpenLensGuide: () => void;
  onOpenStores: () => void;
  onOpenCatalog: (category: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectProduct,
  onGoToCheckoutWithProduct,
  onOpenLensGuide,
  onOpenStores,
  onOpenCatalog
}) => {
  const featuredProduct = CATALOG_PRODUCTS[0];
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const exclusiveRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    const cardWidth = ref.current.firstElementChild?.getBoundingClientRect().width ?? 280;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * 5;
    ref.current.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="w-full flex flex-col bg-white">
      {/* 1. HERO SECTION — HeroCapa (estilo DAPS com parallax multicamada) */}
      <HeroCapa
        onSelectProduct={onSelectProduct}
        onOpenCatalog={onOpenCatalog}
      />

      {/* 2. CURADORIA DE ALTA MODA ÓPTICA */}
      <section className="bg-white py-16 sm:py-20">
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
              const pixPrice = Math.round(product.price * 0.9);
              const installment = (product.price / 10).toFixed(2).replace('.', ',');
              const freeShipping = idx % 3 === 0;
              return (
                <div
                  key={`row1-${product.id}`}
                  className="group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                    {freeShipping && (
                      <span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                        Frete Grátis
                      </span>
                    )}
                    {original > product.price && (
                      <span className="absolute top-3 right-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                        -{Math.round(((original - product.price) / original) * 100)}%
                      </span>
                    )}
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
                      {original > product.price && (
                        <p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#061748]">R$ {product.price.toFixed(2).replace('.', ',')}</span>
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
              const installment = (product.price / 10).toFixed(2).replace('.', ',');
              const freeShipping = idx % 3 === 0;
              return (
                <div
                  key={`row2-${product.id}`}
                  className="group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                    {freeShipping && (
                      <span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                        Frete Grátis
                      </span>
                    )}
                    {original > product.price && (
                      <span className="absolute top-3 right-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                        -{Math.round(((original - product.price) / original) * 100)}%
                      </span>
                    )}
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
                      {original > product.price && (
                        <p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#061748]">R$ {product.price.toFixed(2).replace('.', ',')}</span>
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
      <section className="w-full bg-[#C4D600] py-16 sm:py-20 relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[clamp(60px,10vh,120px)] before:bg-gradient-to-b before:from-white before:to-transparent before:pointer-events-none after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[clamp(60px,10vh,120px)] after:bg-gradient-to-t after:from-[#C4D600] after:to-transparent after:pointer-events-none">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight">
              Por que escolher a gente?
            </h2>
            <p className="text-xs text-[#061748]/80 mt-2 font-medium">
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
                className="bg-[#061748] rounded-2xl p-6 sm:p-8 border border-[#061748] hover:bg-white hover:border-[#061748]/20 hover:-translate-y-2 hover:scale-[1.03] transition-all duration-300 flex flex-col items-center text-center group cursor-default"
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

        {/* Fade branco para transição suave */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-white pointer-events-none" />
      </section>

      {/* 4. CONHEÇA A LINHA EXCLUSIVA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 mb-10">
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
                onClick={() => onGoToCatalog?.()}
                className="text-xs font-bold text-[#4156b8] hover:text-[#061748] transition-colors cursor-pointer flex items-center gap-1"
              >
                Ver todos <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div ref={exclusiveRowRef} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATALOG_PRODUCTS.slice(5, 15).map((product) => {
              const original = product.originalPrice || Math.round(product.price * 1.25);
              const pixPrice = Math.round(product.price * 0.9);
              const installment = (product.price / 10).toFixed(2).replace('.', ',');
              return (
                <div
                  key={`exclusive-${product.id}`}
                  className="group flex-none w-[300px] snap-start bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative cursor-pointer" onClick={() => onSelectProduct(product)}>
                    {original > product.price && (
                      <span className="absolute top-3 right-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                        -{Math.round(((original - product.price) / original) * 100)}%
                      </span>
                    )}
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
                      {original > product.price && (
                        <p className="text-xs text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#061748]">R$ {product.price.toFixed(2).replace('.', ',')}</span>
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
      <NewsletterSection />
    </div>
  );
};

function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail('');
    }
  };

  return (
    <section className="w-full bg-[#061748] py-16 sm:py-20 relative overflow-hidden">
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

          <form onSubmit={handleSubscribe} className="w-full max-w-md flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {subscribed && (
            <div className="animate-fadeIn flex items-center gap-2 text-[#C4D600] text-sm font-bold bg-[#C4D600]/10 px-4 py-2 rounded-full border border-[#C4D600]/20">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Inscrição confirmada! Bem-vindo ao clube.</span>
            </div>
          )}

          <p className="text-[11px] text-white/40 mt-2">
            Respeitamos sua privacidade. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
}