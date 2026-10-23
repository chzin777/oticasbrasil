import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { EyewearProduct } from '../types';
import HeroBackground from './HeroBackground';
import CountUp from './CountUp';
import BFConfetti from './BFConfetti';
import FoldText from './FoldText';
import { SITE_CONFIG, useSiteData } from '../lib/siteStore';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   HERO CAPA — modo padrão com parallax no background (estilo 21st.dev)
   e modo Black Friday com layout centralizado.

   Modo padrão:
   - Background: hero-bg.jpg com parallax via GSAP ScrollTrigger
   - Logo verde + Meta no canto superior esquerdo
   - Texto à esquerda, CTAs, sem carrossel/estrelas/imagens de óculos

   Modo Black Friday:
   - Background: black-bg.jpg
   - Layout centralizado com confete, contagem animada
   ============================================================ */

export type HeroTheme = 'default' | 'blackfriday';

interface HeroCapaProps {
  onSelectProduct?: (product: EyewearProduct) => void;
  onOpenCatalog?: (category: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau') => void;
  theme?: HeroTheme;
}

export const THEME_CONFIG = {
  default: {
    brandBadge: 'RAY-BAN META',
    headlineCom: 'COM',
    headlinePercent: '5%',
    headlineOff: 'OFF',
    subtitle: 'O óculos inteligente que une tecnologia, estilo e exclusividade agora com preço especial na Óticas Brasil.',
    primaryCta: 'Quero o meu',
    secondaryCta: 'Explorar catálogo',
    trustRating: '4.9',
    trustCustomers: '+2.400 clientes satisfeitos',
  },
  blackfriday: {
    brandBadge: 'BLACK FRIDAY',
    headlineCom: 'PRODUTOS COM ATÉ',
    headlinePercent: '50%',
    headlineOff: 'OFF',
    subtitle: 'As melhores marcas com descontos imperdíveis. Aproveite as ofertas mais agressivas do ano na Óticas Brasil.',
    primaryCta: 'Ver Ofertas',
    secondaryCta: 'Explorar tudo',
    trustRating: '4.9',
    trustCustomers: '+2.400 clientes satisfeitos',
  },
};

export default function HeroCapa({ onSelectProduct, onOpenCatalog, theme = 'default' }: HeroCapaProps) {
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const tocou = useRef(false);
  const prevTheme = useRef(theme);
  const [discountUnlocked, setDiscountUnlocked] = useState(false);
  const isBlackFriday = theme === 'blackfriday';
  const config = { ...THEME_CONFIG[theme], ...SITE_CONFIG.hero[theme] };
  useSiteData();

  useGSAP(
    () => {
      if (prefersReduced()) return;

      /* RESET AO TROCAR DE TEMA */
      if (prevTheme.current !== theme) {
        prevTheme.current = theme;
        tocou.current = false;
        gsap.killTweensOf('.hc-brand-badge, .hc-com, .hc-percent, .hc-off, .hc-sub, .hc-acoes, .hc-trust, .hc-texto, .hc-parallax-layer');
        ScrollTrigger.getAll().forEach(st => st.kill());
        root.current?.querySelectorAll('.hc-brand-badge, .hc-com, .hc-percent, .hc-off, .hc-sub, .hc-acoes, .hc-trust, .hc-texto').forEach(el => {
          gsap.set(el, { clearProps: 'transform,opacity' });
        });
      }

      /* ENTRADA — timeline única por tema */
      if (!tocou.current) {
        tocou.current = true;
        gsap
          .timeline({ delay: 0.3, defaults: { ease: 'power4.out' } })
          .from('.hc-brand-badge', { y: 20, opacity: 0, duration: 0.7 })
          .from('.hc-com', { x: -20, opacity: 0, duration: 0.6 }, 0.18)
          .from('.hc-percent', { scale: 0.85, opacity: 0, duration: 0.9, ease: 'back.out(1.7)' }, 0.28)
          .from('.hc-off', { y: 10, opacity: 0, duration: 0.5 }, 0.42)
          .from('.hc-sub', { y: 18, opacity: 0, duration: 0.7 }, 0.55)
          .from('.hc-acoes', { y: 18, opacity: 0, duration: 0.7 }, 0.68);
      }

      /* PARALLAX DO SCROLL — background multicamada estilo 21st.dev (ambos os temas) */
      const parallaxContainer = root.current?.querySelector('[data-parallax-layers]');
      if (parallaxContainer) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0,
          },
        });
        const layers = [
          { layer: '1', yPercent: 70 },
          { layer: '2', yPercent: 55 },
          { layer: '3', yPercent: 40 },
          { layer: '4', yPercent: 10 },
        ];
        layers.forEach((layerObj, idx) => {
          tl.to(
            parallaxContainer.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
            {
              yPercent: layerObj.yPercent,
              ease: 'none',
            },
            idx === 0 ? undefined : '<'
          );
        });
      }

      /* Texto some ao rolar — apenas no modo padrão; Black Friday mantém fixo */
      if (!isBlackFriday) {
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
      }
    },
    { scope: root, dependencies: [theme] }
  );

  return (
    <section className={`hc hc-theme-${theme}`} id="topo" ref={root}>
      {/* Background geométrico — apenas no tema Black Friday */}
      {isBlackFriday && <HeroBackground theme={theme} backgroundImage={SITE_CONFIG.images[theme].background} />}

      {/* ============================================================
          LAYOUT BLACK FRIDAY — texto centralizado
          ============================================================ */}
      {isBlackFriday ? (
        <>
          <BFConfetti />

          <div className="hc-texto hc-texto-center">
            <h1 className="hc-h1">
              <span className="hc-headline-top">
                <span className="hc-brand-badge">{config.brandBadge} É NA</span>
              </span>
              <img
                src={SITE_CONFIG.images[theme].brandLogo}
                alt="Óticas Brasil"
                className="mx-auto h-52 sm:h-64 md:h-80 lg:h-96 w-auto object-contain -mt-35 -mb-35 scale-125 origin-center hc-logo-bf"
              />
              <span className="hc-headline-bottom">
                <FoldText
                  text={config.headlineCom}
                  foldStyle="paper"
                  splitBy="char"
                  hinge="top"
                  trigger="mount"
                  foldAngle={92}
                  duration={0.65}
                  stagger={0.045}
                  staggerFrom="start"
                  ease="power3.out"
                  loopDelay={1.4}
                  hoverRefold
                  refoldRadius={140}
                  refoldAngle={45}
                  perspective={700}
                  creaseShading={0.55}
                  className="hc-com"
                />
                <span className="hc-percent-wrap">
                  <span className="hc-percent">
                    <CountUp
                      from={0}
                      to={parseInt(config.headlinePercent)}
                      mode="count"
                      easing="easeOut"
                      format="standard"
                      direction="up"
                      duration={1.2}
                      delay={0.3}
                      trigger="load"
                      suffix="%"
                    />
                  </span>
                  <span className="hc-off">{config.headlineOff}</span>
                </span>
              </span>
            </h1>

            <p className="hc-sub">{config.subtitle}</p>

            <div className="hc-acoes">
              <button
                type="button"
                className="hc-btn hc-btn-primary"
                onClick={() => navigate('/rayban-meta')}
              >
                {config.primaryCta}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              <button
                type="button"
                className="hc-btn hc-btn-ghost"
                onClick={() => onOpenCatalog?.('armacoes')}
              >
                {config.secondaryCta}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </div>

          </>
      ) : (
        /* ============================================================
           LAYOUT DEFAULT — parallax no background hero-bg.jpg
           ============================================================ */
        <>
          {/* Logos Óticas Brasil + Meta — modo padrão */}
          <div className="absolute top-6 left-6 z-30 flex items-center gap-1 sm:gap-2">
            <img
              src={SITE_CONFIG.images[theme].brandLogo}
              alt="Óticas Brasil"
              className="h-20 sm:h-24 md:h-28 w-auto"
            />
            <span className="hidden sm:block h-10 md:h-12 w-px bg-white/30" aria-hidden="true" />
            <img
              src={SITE_CONFIG.images[theme].partnerLogo}
              alt="Meta"
              className="h-24 sm:h-28 md:h-32 w-auto opacity-90 -ml-2 sm:-ml-3"
            />
          </div>

          {/* Camadas parallax do background — controladas pelo GSAP ScrollTrigger */}
          <div className="hc-parallax-container" data-parallax-layers aria-hidden="true">
            <div className="hc-parallax-layer" data-parallax-layer="1" style={{ backgroundImage: `url("${SITE_CONFIG.images[theme].background}")` }} />
            <div className="hc-parallax-layer" data-parallax-layer="2" style={{ backgroundImage: `url("${SITE_CONFIG.images[theme].background}")` }} />
            <div className="hc-parallax-layer" data-parallax-layer="3" style={{ backgroundImage: `url("${SITE_CONFIG.images[theme].background}")` }} />
            <div className="hc-parallax-layer" data-parallax-layer="4" style={{ backgroundImage: `url("${SITE_CONFIG.images[theme].background}")` }} />
          </div>

          {/* Texto */}
          <div className="hc-texto">
            <h1 className="hc-h1">
              <span className="hc-headline-top">
                <span className="hc-brand-badge">{config.brandBadge}</span>
              </span>
              <span className="hc-headline-bottom">
                <span className="hc-com">{config.headlineCom}</span>
                <span className="hc-percent-wrap">
                  <span className="hc-percent">{config.headlinePercent}</span>
                  <span className="hc-off">{config.headlineOff}</span>
                </span>
              </span>
            </h1>

            <p className="hc-sub">{config.subtitle}</p>

            <div className="hc-acoes">
              <button
                type="button"
                className="hc-btn hc-btn-primary"
                onClick={() => navigate('/rayban-meta')}
              >
                {config.primaryCta}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              <button
                type="button"
                className="hc-btn hc-btn-ghost"
                onClick={() => onOpenCatalog?.('armacoes')}
              >
                {config.secondaryCta}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </>
      )}

      
      {/* Seta de scroll */}
      <div className="hc-scroll-hint" aria-hidden="true">
        <span>Role para baixo</span>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}