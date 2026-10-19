import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { EyewearProduct } from '../types';
import { CoverflowCarousel } from './CoverflowCarousel';
import HeroBackground from './HeroBackground';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   HERO CAPA — divisão com parallax multicamada

   Estrutura idêntica ao Capa.jsx do projeto daps:
   - Metade esquerda: texto chapado sobre cor sólida
   - Metade direita: cena fotográfica com camadas independentes
   - Cada camada tem profundidade declarada (data-mov) que controla
     quanto se move no parallax do mouse e no scroll
   - As armações "balançam" sozinhas com CSS keyframes (como as folhas)
   - Uma armação "vaza" para fora da cena e costura com a seção seguinte

   Camadas (de trás para frente):
   1. glasses-tras (glasses2.png) — armação traseira, mov lento
   2. oculos-principal (glasses1.png) — produto central, mov médio
   3. glasses-vaza (glasses2.png) — armação frontal que atravessa a divisa
   ============================================================ */

interface HeroCapaProps {
  onSelectProduct?: (product: EyewearProduct) => void;
  onOpenCatalog?: (category: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau') => void;
}

const TARJA_ITEMS = [
  'Armações Premium',
  'Lentes de Alta Tecnologia',
  'Design Autoral',
  'Frete Grátis',
  '10x Sem Juros',
  'Curadoria Exclusiva',
];

export default function HeroCapa({ onSelectProduct, onOpenCatalog }: HeroCapaProps) {
  const root = useRef<HTMLElement>(null);
  const tocou = useRef(false);

  useGSAP(
    () => {
      if (prefersReduced()) return;

      /* ENTRADA — timeline única, protegida contra double-mount do StrictMode */
      if (!tocou.current) {
        tocou.current = true;
        gsap
          .timeline({ delay: 0.3, defaults: { ease: 'power4.out' } })
          .from('.hc-brand-badge', { y: 20, opacity: 0, duration: 0.7 })
          .from('.hc-com', { x: -20, opacity: 0, duration: 0.6 }, 0.15)
          .from('.hc-percent', { scale: 0.85, opacity: 0, duration: 0.9, ease: 'back.out(1.7)' }, 0.2)
          .from('.hc-off', { y: 10, opacity: 0, duration: 0.5 }, 0.35)
          .from('.hc-sub, .hc-acoes, .hc-trust', { y: 18, opacity: 0, duration: 0.75, stagger: 0.08 }, 0.45)
          .from('.hc-tarja', { yPercent: -100, duration: 0.6 }, 0.1)
          .from('.hc-camada', { opacity: 0, scale: 1.06, duration: 1.1, stagger: 0.07 }, 0.15);
      }

      /* PARALLAX DO MOUSE — cada camada se move proporcional à sua profundidade */
      const camadas = gsap.utils.toArray<HTMLElement>('.hc-camada', root.current).map((el: HTMLElement) => ({
        el,
        mov: Number(el.dataset.mov),
        rol: Number(el.dataset.rol),
        armação: el.dataset.armacao === '1',
        x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 1.3, ease: 'power3.out' }),
        r: gsap.quickTo(el, 'rotation', { duration: 1.6, ease: 'power3.out' }),
      }));

      const colX = gsap.quickTo('.hc-texto', 'x', { duration: 1.2, ease: 'power3.out' });
      const colY = gsap.quickTo('.hc-texto', 'y', { duration: 1.4, ease: 'power3.out' });

      const mover = (e: PointerEvent) => {
        const r = root.current!.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        camadas.forEach((c: typeof camadas[number]) => {
          c.x(-dx * 34 * c.mov);
          c.y(-dy * 18 * c.mov);
          if (c.armação) c.r(dx * 2.6 * c.mov);
        });
        colX(-dx * 12);
        colY(-dy * 7);
      };

      const sair = () => {
        camadas.forEach((c: typeof camadas[number]) => (c.x(0), c.y(0), c.r(0)));
        colX(0);
        colY(0);
      };

      root.current!.addEventListener('pointermove', mover);
      root.current!.addEventListener('pointerleave', sair);

      /* PARALLAX DO SCROLL — mesma profundidade, eixo vertical */
      camadas.forEach((c: typeof camadas[number]) => {
        gsap.fromTo(
          c.el,
          { yPercent: 0 },
          {
            yPercent: -c.rol,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.5 + c.mov * 0.6,
            },
          }
        );
      });

      /* Texto some ao rolar */
      gsap.fromTo(
        '.hc-texto',
        { y: 0, opacity: 1 },
        {
          y: 70,
          opacity: 0,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 },
        }
      );

      const alvo = root.current;
      return () => {
        alvo?.removeEventListener('pointermove', mover);
        alvo?.removeEventListener('pointerleave', sair);
      };
    },
    { scope: root }
  );

  return (
    <section className="hc" id="topo" ref={root}>
      {/* Background geométrico — grafismos da marca Óticas Brasil */}
      <HeroBackground />

      {/* Tarja superior com texto correndo */}
      <div className="hc-tarja" aria-hidden="true">
        <div className="hc-trilho">
          {[0, 1].map((n) => (
            <span key={n}>
              {TARJA_ITEMS.map((t) => (
                <b key={t}>
                  {t}
                  <i>·</i>
                </b>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ---- metade chapada (texto) ---- */}
      <div className="hc-texto">
        <h1 className="hc-h1">
          <span className="hc-headline-top">
            <span className="hc-brand-badge">RAY-BAN META</span>
          </span>
          <span className="hc-headline-bottom">
            <span className="hc-com">COM</span>
            <span className="hc-percent-wrap">
              <span className="hc-percent">5%</span>
              <span className="hc-off">OFF</span>
            </span>
          </span>
        </h1>

        <p className="hc-sub">
          O óculos inteligente que une tecnologia, estilo e exclusividade agora com preço especial na Óticas Brasil.
        </p>

        <div className="hc-acoes">
          <button
            type="button"
            className="hc-btn hc-btn-primary"
            onClick={() => onOpenCatalog?.('oculos-de-sol')}
          >
            Quero o meu
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          <button
            type="button"
            className="hc-btn hc-btn-ghost"
            onClick={() => onOpenCatalog?.('armacoes')}
          >
            Explorar catálogo
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>

        <div className="hc-trust">
          <div className="hc-trust-stars">
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#C4D600"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ))}
          </div>
          <span>4.9</span>
          <span className="hc-trust-dot" />
          <span>+2.400 clientes satisfeitos</span>
        </div>
      </div>

      {/* ---- metade fotográfica (cena com camadas) ---- */}
      <div className="hc-cena" aria-hidden="true">
        {/* Camada 1: óculos de sol superior (glasses1) — inclinado à esquerda, balanço lento */}
        <span className="hc-pos hc-g2">
          <img
            className="hc-camada"
            data-mov="0.55"
            data-rol="9"
            data-armacao="1"
            src="/assets/glasses1.png"
            alt=""
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </span>

        {/* Camada 2: CoverflowCarousel — galeria coverflow de óculos */}
        <span className="hc-pos hc-g1">
          <div className="hc-spiral-wrapper">
            <CoverflowCarousel
              slides={[
                { src: '/assets/carroussel/1.jpg', alt: 'Óculos de sol 1' },
                { src: '/assets/carroussel/2.jpg', alt: 'Óculos de sol 2' },
                { src: '/assets/carroussel/3.jpg', alt: 'Óculos de sol 3' },
                { src: '/assets/carroussel/4.jpg', alt: 'Óculos de sol 4' },
                { src: '/assets/carroussel/5.jpg', alt: 'Óculos de sol 5' },
                { src: '/assets/carroussel/6.jpg', alt: 'Óculos de sol 6' },
              ]}
              loop
              autoPlayInterval={3000}
              gap={-0.15}
              depth={0.4}
              perspective={2.5}
              rotate={35}
              showNavigation={false}
              showPagination={false}
              showCaption={false}
              label="Galeria de óculos"
              className="h-full w-full"
            />
          </div>
        </span>
      </div>

      {/* Camada extra: Calvin Klein (glasses3) — canto esquerdo perto do CTA, inclinado */}
      <span className="hc-pos hc-g3" aria-hidden="true">
        <img
          className="hc-camada"
          data-mov="0.7"
          data-rol="6"
          data-armacao="1"
          src="/assets/glasses3.png"
          alt=""
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </span>

      {/* Camada 3: armação que "vaza" — atravessa a divisa entre hero e próxima seção */}
      <span className="hc-pos hc-vaza" aria-hidden="true">
        <img
          className="hc-camada"
          data-mov="1"
          data-rol="9"
          data-armacao="1"
          src="/assets/glasses2.png"
          alt=""
          draggable={false}
        />
      </span>
    </section>
  );
}