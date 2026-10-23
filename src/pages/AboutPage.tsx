import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AboutPageProps {
  onOpenStores: () => void;
}

const STATS = [
  { value: '1998', label: 'Fundação' },
  { value: '+25', label: 'Anos de tradição' },
  { value: '10x', label: 'Sem juros' },
  { value: '100%', label: 'Foco no cliente' },
];

const VALUES = [
  { icon: 'visibility', title: 'Precisão', text: 'Tecnologia oftálmica avançada para que cada lente seja feita sob medida para o seu olhar.' },
  { icon: 'diamond', title: 'Curadoria', text: 'Seleção cuidadosa de marcas e modelos que unem design atemporal e as últimas tendências.' },
  { icon: 'favorite', title: 'Cuidado', text: 'Atendimento humano e próximo, do primeiro contato ao pós-venda.' },
  { icon: 'verified', title: 'Confiança', text: 'Produtos originais, garantia e transparência em cada etapa da sua compra.' },
];

const STEPS = [
  { icon: 'search', title: 'Escolha', text: 'Explore armações e óculos de sol com filtros e provador virtual.' },
  { icon: 'medical_information', title: 'Receita', text: 'Envie sua receita e personalize as lentes ideais para você.' },
  { icon: 'local_shipping', title: 'Entrega', text: 'Receba em casa com frete grátis acima de R$ 299,00 ou retire em loja.' },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onOpenStores }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#061748] via-[#0a2060] to-[#4156b8] text-white px-6 sm:px-12 py-14 sm:py-20 shadow-lg">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#C4D600]/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#061748] bg-[#dbee2c] px-3 py-1 rounded-full">
            Quem somos
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mt-5 leading-tight">
            Enxergar bem é <span className="text-[#dbee2c]">viver melhor</span>.
          </h1>
          <p className="text-base sm:text-lg text-white/75 mt-5 leading-relaxed">
            Excelência em óptica de precisão e curadoria de alta moda desde 1998. Unimos tecnologia, design e atendimento
            próximo para transformar a forma como você enxerga o mundo.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              onClick={() => navigate('/todos-os-produtos')}
              className="px-6 py-3 rounded-full bg-[#dbee2c] text-[#061748] text-sm font-bold hover:brightness-95 active:scale-95 transition-all cursor-pointer"
            >
              Ver produtos
            </button>
            <button
              onClick={onOpenStores}
              className="px-6 py-3 rounded-full border border-white/30 text-white text-sm font-bold hover:bg-white/10 transition-colors cursor-pointer"
            >
              Nossas lojas
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-8 relative z-10 px-0 sm:px-6">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#eceef0] shadow-sm p-5 text-center">
            <p className="text-3xl font-black text-[#061748]">{s.value}</p>
            <p className="text-xs text-[#767680] mt-1 uppercase tracking-wide font-semibold">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Story */}
      <section className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center mt-16">
        <div className="relative">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-[#eceef0] shadow-sm border border-[#eceef0]">
            <img src="/assets/women1.jpg" alt="Cliente Óticas Brasil" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-5 -right-2 sm:right-6 bg-white rounded-2xl shadow-xl border border-[#eceef0] px-5 py-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#061748] text-[#dbee2c] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">eyeglasses</span>
            </span>
            <div>
              <p className="text-sm font-bold text-[#061748] leading-tight">Óticas Brasil</p>
              <p className="text-[11px] text-[#767680]">Desde 1998</p>
            </div>
          </div>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#4156b8]">Nossa história</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight mt-2">
            Mais de duas décadas cuidando da sua visão
          </h2>
          <p className="text-[#45464f] mt-4 leading-relaxed">
            A Óticas Brasil nasceu com o propósito de oferecer óptica de qualidade com atendimento verdadeiramente humano.
            Ao longo dos anos, crescemos acompanhando as necessidades dos nossos clientes, sempre investindo em tecnologia
            e em marcas que valorizam estilo e conforto.
          </p>
          <p className="text-[#45464f] mt-4 leading-relaxed">
            Hoje, levamos essa experiência também para o ambiente digital, com provador virtual, personalização de lentes
            e uma compra simples e segura, sem abrir mão do cuidado de uma ótica de bairro.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mt-20">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4156b8]">Nossos valores</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight mt-2">O que nos guia</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="group bg-white rounded-2xl border border-[#eceef0] p-6 hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300"
            >
              <span className="w-12 h-12 rounded-xl bg-[#f2f4f6] text-[#061748] group-hover:bg-[#061748] group-hover:text-[#dbee2c] transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">{v.icon}</span>
              </span>
              <h3 className="text-lg font-bold text-[#061748] mt-4">{v.title}</h3>
              <p className="text-sm text-[#45464f] mt-2 leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-20 bg-white rounded-3xl border border-[#eceef0] shadow-sm p-6 sm:p-10">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#4156b8]">Como funciona</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#061748] tracking-tight mt-2">Comprar é simples</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative flex flex-col items-center text-center px-4">
              <span className="w-14 h-14 rounded-full bg-[#061748] text-[#dbee2c] flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[26px]">{s.icon}</span>
              </span>
              <span className="text-[11px] font-black text-[#4156b8] mt-3">PASSO {i + 1}</span>
              <h3 className="text-lg font-bold text-[#061748]">{s.title}</h3>
              <p className="text-sm text-[#45464f] mt-1 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 relative overflow-hidden rounded-3xl bg-[#061748] text-white p-6 sm:p-12 text-center">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#C4D600]/20 blur-3xl" aria-hidden="true" />
        <h2 className="relative text-2xl sm:text-3xl font-bold tracking-tight">Pronto para encontrar o seu estilo?</h2>
        <p className="relative text-white/70 mt-3 max-w-lg mx-auto">
          Conheça nossa coleção ou visite uma de nossas lojas e fale com um especialista.
        </p>
        <div className="relative flex flex-wrap justify-center gap-3 mt-7">
          <button
            onClick={() => navigate('/armacoes')}
            className="px-6 py-3 rounded-full bg-[#dbee2c] text-[#061748] text-sm font-bold hover:brightness-95 active:scale-95 transition-all cursor-pointer"
          >
            Explorar armações
          </button>
          <button
            onClick={onOpenStores}
            className="px-6 py-3 rounded-full border border-white/30 text-sm font-bold hover:bg-white/10 transition-colors cursor-pointer"
          >
            Encontrar uma loja
          </button>
        </div>
      </section>
    </div>
  );
};
