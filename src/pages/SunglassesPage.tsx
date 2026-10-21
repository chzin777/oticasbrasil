import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SunglassProduct {
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

const SUNGLASS_PRODUCTS: SunglassProduct[] = [
 {
 id: 'sg-rayban-aviator',
 name: 'Ray-Ban Aviator Classic',
 brand: 'Ray-Ban',
 price: 899,
 originalPrice: 1099,
 image: '/assets/glasses-aviator.png',
 description: 'O clássico atemporal com lentes em formato aviador.',
 features: ['Proteção UV400', 'Lente polarizada', 'Armação metálica', 'Estojo incluso'],
 type: 'Aviador',
 },
 {
 id: 'sg-oakley-holbrook',
 name: 'Oakley Holbrook',
 brand: 'Oakley',
 price: 749,
 originalPrice: 899,
 image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=450&fit=crop',
 description: 'Estilo urbano com tecnologia Prizm para cores vibrantes.',
 features: ['Prizm Lens', 'Proteção UV', 'Armação O Matter', 'Leve e resistente'],
 type: 'Esportivo',
 },
 {
 id: 'sg-gucci-gg0061s',
 name: 'Gucci GG0061S',
 brand: 'Gucci',
 price: 1899,
 originalPrice: 2299,
 image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=450&fit=crop',
 description: 'Design sofisticado com detalhes icônicos da marca.',
 features: ['Acetato italiano', 'Proteção UV', 'Design exclusivo', 'Certificado de autenticidade'],
 type: 'Luxo',
 },
 {
 id: 'sg-prada-pr17ws',
 name: 'Prada PR17WS',
 brand: 'Prada',
 price: 1599,
 originalPrice: 1999,
 image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&h=450&fit=crop',
 description: 'Elegância italiana com linhas modernas.',
 features: ['Armação leve', 'Lentes CR-39', 'Hastes decoradas', 'Estojo premium'],
 type: 'Fashion',
 },
 {
 id: 'sg-dior-diorso1',
 name: 'Dior DiorSo1',
 brand: 'Dior',
 price: 1799,
 originalPrice: 2199,
 image: 'https://images.unsplash.com/photo-1509646938384-ccd6dde6cdfc?w=600&h=450&fit=crop',
 description: 'Sofisticação francesa em cada detalhe.',
 features: ['Design cat-eye', 'Proteção UV', 'Acetato premium', 'Edição limitada'],
 type: 'Fashion',
 },
 {
 id: 'sg-tomford-tf237',
 name: 'Tom Ford FT0237',
 brand: 'Tom Ford',
 price: 1699,
 originalPrice: 2099,
 image: 'https://images.unsplash.com/photo-1574689049767-4a132d5e7dca?w=600&h=450&fit=crop',
 description: 'Clássico americano com toque de luxo.',
 features: ['Armação acetato', 'Lentes polarizadas', 'Logo T discreto', 'Qualidade superior'],
 type: 'Clássico',
 },
 {
 id: 'sg-versace-ve2150q',
 name: 'Versace VE2150Q',
 brand: 'Versace',
 price: 1499,
 originalPrice: 1899,
 image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600&h=450&fit=crop',
 description: 'Bold e ousado com a assinatura Versace.',
 features: ['Medusa logo', 'Armação bold', 'Lentes coloridas', 'Estilo statement'],
 type: 'Luxo',
 },
 {
 id: 'sg-burberry-be4233',
 name: 'Burberry BE4233',
 brand: 'Burberry',
 price: 1299,
 originalPrice: 1599,
 image: 'https://images.unsplash.com/photo-1585671962217-e38b68dd7eb7?w=600&h=450&fit=crop',
 description: 'Herança britânica em design moderno.',
 features: ['Padrão check', 'Armação leve', 'Proteção UV', 'Elegância clássica'],
 type: 'Clássico',
 },
];

export const SunglassesPage: React.FC = () => {
 const navigate = useNavigate();
 const [selectedType, setSelectedType] = useState<string>('all');

 const types = ['all', ...Array.from(new Set(SUNGLASS_PRODUCTS.map((p) => p.type)))];

 const filteredProducts = selectedType === 'all'
 ? SUNGLASS_PRODUCTS
 : SUNGLASS_PRODUCTS.filter((p) => p.type === selectedType);

 return (
 <div className="min-h-screen bg-white">
 {/* Hero */}
 <section className="relative py-20 px-4 bg-gradient-to-b from-[#061748] to-[#0a2060] text-white">
 <div className="max-w-6xl mx-auto text-center">
 <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
 Óculos de Sol
 </h1>
 <p className="text-lg text-white/80 max-w-2xl mx-auto">
 Proteja seus olhos com estilo. As melhores marcas e designs para todos os gostos.
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