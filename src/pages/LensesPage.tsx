import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LensProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  image: string;
  description: string;
  features: string[];
  type: string;
}

const LENS_PRODUCTS: LensProduct[] = [
  {
    id: 'ln-varilux-x',
    name: 'Varilux X Series',
    brand: 'Essilor',
    price: 1299,
    originalPrice: 1599,
    image: 'https://images.unsplash.com/photo-1570222094114-28a9d886f27b?w=600&h=450&fit=crop',
    description: 'Lente multifocal premium com tecnologia Xtend para visão nítida em todas as distâncias.',
    features: ['Multifocal', 'Antirreflexo', 'Proteção UV', 'Blue Light Filter'],
    type: 'Multifocal',
  },
  {
    id: 'ln-crizal-sapphire',
    name: 'Crizal Sapphire HR',
    brand: 'Essilor',
    price: 899,
    originalPrice: 1099,
    image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600&h=450&fit=crop',
    description: 'Tratamento antirreflexo premium que reduz reflexos e melhora a transparência.',
    features: ['Antirreflexo Premium', 'Resistente a riscos', 'Fácil limpeza', 'UV Protection'],
    type: 'Tratamento',
  },
  {
    id: 'ln-eyezen-start',
    name: 'Eyezen Start',
    brand: 'Essilor',
    price: 699,
    originalPrice: 849,
    image: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=600&h=450&fit=crop',
    description: 'Lente monofocal com alívio digital para reduzir fadiga ocular em telas.',
    features: ['Monofocal Digital', 'Blue Light', 'Conforto visual', 'Leve'],
    type: 'Monofocal',
  },
  {
    id: 'ln-hoya-lensync',
    name: 'Hoya Lensync 3D',
    brand: 'Hoya',
    price: 1199,
    originalPrice: 1499,
    image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&h=450&fit=crop',
    description: 'Tecnologia binocular harmonizada para adaptação rápida e confortável.',
    features: ['Multifocal 3D', 'Adaptação rápida', 'Alta definição', 'Durabilidade'],
    type: 'Multifocal',
  },
  {
    id: 'ln-zeiss-smartlife',
    name: 'Zeiss SmartLife Individual',
    brand: 'Zeiss',
    price: 1899,
    originalPrice: 2299,
    image: 'https://images.unsplash.com/photo-1550966871-3ed3c622763b?w=600&h=450&fit=crop',
    description: 'Lente personalizada para estilo de vida digital com precisão máxima.',
    features: ['Personalizada', 'SmartLife Tech', 'PureVision', 'Premium Coating'],
    type: 'Multifocal',
  },
  {
    id: 'ln-transitions-gen8',
    name: 'Transitions Gen 8',
    brand: 'Transitions',
    price: 599,
    originalPrice: 749,
    image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&h=450&fit=crop',
    description: 'Lente fotossensível que escurece automaticamente sob luz solar.',
    features: ['Fotossensível', 'Escurecimento rápido', 'UV + Blue Light', 'Várias cores'],
    type: 'Fotossensível',
  },
  {
    id: 'ln-nikon-seemax',
    name: 'Nikon SeeMax Ultimate',
    brand: 'Nikon',
    price: 1699,
    originalPrice: 2099,
    image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600&h=450&fit=crop',
    description: 'Campo de visão amplo com tecnologia de superfície dupla.',
    features: ['Superfície Dupla', 'Campo Amplo', 'Alta Precisão', 'Ultra Fina'],
    type: 'Multifocal',
  },
  {
    id: 'ln-blue-control',
    name: 'Blue Control Hoya',
    brand: 'Hoya',
    price: 499,
    originalPrice: 649,
    image: 'https://images.unsplash.com/photo-1585671962217-e38b68dd7eb7?w=600&h=450&fit=crop',
    description: 'Proteção contra luz azul nociva de dispositivos digitais.',
    features: ['Blue Light Filter', 'Conforto Digital', 'Antirreflexo', 'Durável'],
    type: 'Tratamento',
  },
];

export const LensesPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string>('all');

  const types = ['all', ...Array.from(new Set(LENS_PRODUCTS.map((p) => p.type)))];

  const filteredProducts = selectedType === 'all'
    ? LENS_PRODUCTS
    : LENS_PRODUCTS.filter((p) => p.type === selectedType);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-[#061748] to-[#0a2060] text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Lentes de Grau
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Tecnologia e conforto para sua visão. Encontre a lente ideal para o seu dia a dia.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <section className="py-8 px-4 border-b border-[#eceef0]">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 justify-center">
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                selectedType === type
                  ? 'bg-[#061748] text-white shadow-md'
                  : 'bg-[#f5f5f5] text-[#45464f] hover:bg-[#eceef0]'
              }`}
            >
              {type === 'all' ? 'Todos' : type}
            </button>
          ))}
        </div>
      </section>

      {/* Grid de Produtos */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => {
            const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
            const pixPrice = Math.round(product.price * 0.9);
            const installment = (product.price / 10).toFixed(2).replace('.', ',');

            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative">
                  {discount > 0 && (
                    <span className="absolute top-3 left-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                      -{discount}%
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
                  <h3 className="text-base font-bold text-[#061748] mb-2 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#8a8d96] mb-3 line-clamp-2">{product.description}</p>

                  <div className="mt-auto space-y-2">
                    {discount > 0 && (
                      <p className="text-xs text-[#8a8d96] line-through">
                        De R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-[#061748]">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[11px] text-[#45464f]">à vista no PIX</span>
                    </div>
                    <p className="text-xs text-[#4156b8] font-semibold">
                      ou 10x de R$ {installment} sem juros
                    </p>

                    <button
                      type="button"
                      onClick={() => navigate('/checkout')}
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
      </section>
    </div>
  );
};