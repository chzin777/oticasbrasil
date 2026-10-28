import React from 'react';
import { CATALOG_PRODUCTS } from '../data/mockData';
import SectionShapes from './SectionShapes';

/**
 * Previews estáticas das seções nativas para o canvas do Puck.
 * Renderizam HTML fiel à HomePage sem dependências de runtime (GSAP, router, estado).
 */

export const HomeHeroPreview: React.FC = () => (
  <section className="relative w-full overflow-hidden bg-[#061748] text-white" style={{ minHeight: 420 }}>
    <div className="absolute inset-0 bg-gradient-to-br from-[#061748] via-[#0a2366] to-[#142344]" />
    <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-start justify-center px-4 py-20 sm:px-8 md:px-12" style={{ minHeight: 420 }}>
      <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#C4D600]">
        Ray-Ban Meta
      </span>
      <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
        COM <span className="text-[#C4D600]">5%</span> OFF
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
        O óculos inteligente que une tecnologia, estilo e exclusividade agora com preço especial na Óticas Brasil.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <span className="inline-block rounded-full bg-[#C4D600] px-6 py-3 text-sm font-black text-[#061748]">
          Quero o meu
        </span>
        <span className="inline-block rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white">
          Explorar catálogo
        </span>
      </div>
    </div>
  </section>
);

const ProductCardPreview: React.FC<{ product: typeof CATALOG_PRODUCTS[number] }> = ({ product }) => {
  const original = product.originalPrice || Math.round(product.price * 1.25);
  return (
    <div className="flex-none snap-start overflow-hidden rounded-2xl border border-[#eceef0] bg-white" style={{ width: 260 }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eceef0]">
        <img src={product.image} alt={product.name} className="h-full w-full object-contain p-2" loading="lazy" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-[#45464f]">{product.brand}</p>
        <h3 className="mb-2 truncate text-sm font-bold text-[#061748]">{product.name}</h3>
        <div className="mt-auto space-y-1">
          {original > product.price && (
            <p className="text-[11px] text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-[#061748]">R$ {product.price.toFixed(2).replace('.', ',')}</span>
            <span className="text-[10px] text-[#45464f]">à vista</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HomeFeaturedPreview: React.FC = () => (
  <section className="relative bg-white py-16">
    <SectionShapes variant="diamonds" bg="white" />
    <div className="mx-auto max-w-[1440px] px-4 sm:px-8 md:px-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-[#061748] sm:text-3xl">Os Mais Desejados do Momento</h2>
        <p className="mt-2 text-xs text-[#45464f]">As peças que estão conquistando nossos clientes.</p>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {CATALOG_PRODUCTS.slice(0, 5).map((product) => (
          <ProductCardPreview key={product.id} product={product} />
        ))}
      </div>
    </div>
  </section>
);

export const HomeBenefitsPreview: React.FC = () => (
  <section className="relative w-full bg-[#061748] py-20">
    <SectionShapes variant="arcs" bg="navy" />
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-8 md:px-12">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Por que escolher a gente?</h2>
        <p className="mt-2 text-xs font-medium text-white/80">Mais do que óculos, entregamos uma experiência completa.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: 'verified', title: 'Autenticidade Garantida' },
          { icon: 'local_shipping', title: 'Entrega Rápida e Segura' },
          { icon: 'support_agent', title: 'Atendimento Especializado' },
          { icon: 'autorenew', title: 'Troca Fácil em 30 Dias' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#C4D600] text-[#061748]">
              <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-white">{item.title}</h3>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const HomeExclusivePreview: React.FC = () => (
  <section className="relative bg-white py-16">
    <SectionShapes variant="circles" bg="white" />
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-8 md:px-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-[#061748] sm:text-3xl">Conheça a Linha Exclusiva</h2>
        <p className="mt-2 text-xs text-[#45464f]">Peças selecionadas com design autoral e acabamento premium.</p>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {CATALOG_PRODUCTS.slice(5, 10).map((product) => (
          <ProductCardPreview key={product.id} product={product} />
        ))}
      </div>
    </div>
  </section>
);

export const HomeNewsletterPreview: React.FC = () => (
  <section className="relative w-full overflow-hidden bg-[#061748] py-16">
    <SectionShapes variant="mixed" bg="navy" />
    <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-[#C4D600]/10 blur-[80px]" />
    <div className="relative z-10 mx-auto max-w-xl px-4 text-center">
      <h2 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
        Fique por dentro das <span className="text-[#C4D600]">novidades</span>
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#b6c4fe]">
        Receba em primeira mão lançamentos exclusivos e dicas de especialistas.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          readOnly
          placeholder="Seu melhor e-mail"
          className="w-full rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm text-white placeholder:text-white/50"
        />
        <span className="whitespace-nowrap rounded-full bg-[#C4D600] px-8 py-3 text-sm font-black text-[#061748]">
          Inscrever-se
        </span>
      </div>
    </div>
  </section>
);

export const HomeCollectionPreview: React.FC = () => (
  <section className="relative bg-white py-16">
    <SectionShapes variant="mixed" bg="white" />
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-8 md:px-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-[#061748] sm:text-3xl">Explore Nossa Coleção Completa</h2>
        <p className="mt-2 text-xs text-[#45464f]">Descubra mais modelos exclusivos com design premium.</p>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {CATALOG_PRODUCTS.slice(10, 15).map((product) => (
          <ProductCardPreview key={product.id} product={product} />
        ))}
      </div>
    </div>
  </section>
);

export const ProductDescriptionPreview: React.FC = () => (
  <section className="bg-white py-12">
    <div className="mx-auto max-w-3xl px-4">
      <h2 className="mb-4 text-2xl font-bold text-[#061748]">Sobre o produto</h2>
      <p className="leading-relaxed text-[#34415a]">
        Descrição detalhada do produto aparece aqui, com informações sobre materiais, design e diferenciais.
      </p>
    </div>
  </section>
);

export const ProductSpecificationsPreview: React.FC = () => (
  <section className="bg-[#f7f8fb] py-12">
    <div className="mx-auto max-w-3xl px-4">
      <h2 className="mb-6 text-xl font-bold text-[#061748]">Ficha técnica</h2>
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#e2e6ee] bg-white p-6">
        {[
          ['Marca', 'Ray-Ban'],
          ['Modelo', 'RB3025'],
          ['Material', 'Metal'],
          ['Cor', 'Dourado'],
          ['Ponte', '14mm'],
          ['Lente', '58mm'],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-[#edf0f5] pb-2 last:border-0">
            <p className="text-[10px] uppercase tracking-wide text-[#68748a]">{label}</p>
            <p className="font-semibold text-[#142344]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const ProductSimilarPreview: React.FC = () => (
  <section className="bg-white py-12">
    <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
      <h2 className="mb-6 text-xl font-bold text-[#061748]">Produtos similares</h2>
      <div className="flex gap-4 overflow-hidden">
        {CATALOG_PRODUCTS.slice(0, 4).map((product) => (
          <ProductCardPreview key={product.id} product={product} />
        ))}
      </div>
    </div>
  </section>
);