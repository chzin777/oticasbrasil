import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  description: string;
}

const RAYBAN_META_PRODUCTS: Product[] = [
  {
    id: 'rbm-wayfarer',
    name: 'Ray-Ban Meta Wayfarer',
    price: 2499,
    originalPrice: 2999,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=400&fit=crop',
    description: 'O clássico Wayfarer reinventado com tecnologia Meta integrada.',
  },
  {
    id: 'rbm-headliner',
    name: 'Ray-Ban Meta Headliner',
    price: 2699,
    originalPrice: 3199,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=400&fit=crop',
    description: 'Design moderno com lentes inteligentes e captura de conteúdo.',
  },
  {
    id: 'rbm-skyler',
    name: 'Ray-Ban Meta Skyler',
    price: 2599,
    originalPrice: 3099,
    image: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=600&h=400&fit=crop',
    description: 'Estilo oversized com tecnologia de ponta para criadores de conteúdo.',
  },
  {
    id: 'rbm-transitions',
    name: 'Ray-Ban Meta Transitions',
    price: 2799,
    originalPrice: 3299,
    image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&h=400&fit=crop',
    description: 'Lentes fotossensíveis que se adaptam à luz ambiente.',
  },
];

export const RayBanMetaPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-20">
      {/* Header Navigation */}
      <div className="bg-white border-b border-[#eceef0] py-4 px-4 sm:px-8 md:px-12 sticky top-[4rem] z-30">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-[#4156b8] hover:text-[#061748] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            <span>Início</span>
          </button>
          <span className="text-[#c6c5d0]">/</span>
          <h1 className="text-xl font-bold text-[#061748]">Ray-Ban Meta</h1>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#061748] to-[#1a2d6e] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1600&h=600&fit=crop"
            alt="Ray-Ban Meta Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-8 md:px-12 py-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-[#C4D600] text-[#061748] text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Nova Coleção
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4">Ray-Ban Meta Smart Glasses</h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl">
            Óculos inteligentes que combinam estilo icônico com tecnologia de ponta. Capture momentos, ouça música e fique conectado sem abrir mão do design.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {RAYBAN_META_PRODUCTS.map((product) => {
            const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
            const pixPrice = Math.round(product.price * 0.9);
            const installment = (product.price / 10).toFixed(2).replace('.', ',');

            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col cursor-pointer"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative">
                  <span className="absolute top-3 right-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                    -{discountPercent}%
                  </span>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[10px] text-[#45464f] mb-1 uppercase tracking-wide">Ray-Ban</p>
                  <h3 className="text-base font-bold text-[#061748] mb-2 truncate">{product.name}</h3>
                  <p className="text-xs text-[#767680] mb-3 line-clamp-2">{product.description}</p>
                  <div className="mt-auto space-y-2">
                    <p className="text-xs text-[#8a8d96] line-through">De R$ {product.originalPrice.toFixed(2).replace('.', ',')}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-[#061748]">R$ {pixPrice.toFixed(2).replace('.', ',')}</span>
                      <span className="text-[11px] text-[#45464f]">à vista no PIX</span>
                    </div>
                    <p className="text-xs text-[#4156b8] font-semibold">
                      ou 10x de R$ {installment} sem juros
                    </p>
                    <button
                      type="button"
                      className="w-full mt-3 bg-[#061748] text-white text-sm font-bold py-3 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
                    >
                      Comprar Agora
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};