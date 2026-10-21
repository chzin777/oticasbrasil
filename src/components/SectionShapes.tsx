import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

interface SectionShapesProps {
  /** Qual conjunto de formas renderizar — varia por seção para evitar repetição */
  variant: 'circles' | 'diamonds' | 'arcs' | 'mixed';
  /** Cor de fundo da seção (para combinar opacidade) */
  bg?: 'white' | 'navy';
  className?: string;
}

/* ============================================================
   SECTION SHAPES — Formas geométricas sutis baseadas no manual
   da marca Óticas Brasil (pág 15-17). Espalhadas como elementos
   decorativos de fundo com parallax via GSAP ScrollTrigger.

   Paleta: Verde-limão #C4D600, Azul-marinho #061748,
           Azul-médio #002cdb, Bege #d4dfa0
   ============================================================ */

const SectionShapes = ({ variant, bg = 'white', className = '' }: SectionShapesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const shapes = containerRef.current.querySelectorAll('[data-shape]');
    if (!shapes.length) return;

    shapes.forEach((shape) => {
      const speed = parseFloat(shape.getAttribute('data-speed') || '0.3');
      const distance = 120 * speed;
      gsap.fromTo(
        shape,
        { y: -distance },
        {
          y: distance,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        },
      );
    });
  }, { scope: containerRef });

  const isNavy = bg === 'navy';

  /* Cores adaptadas ao fundo da seção */
  const primary = isNavy ? '#C4D600' : '#061748';
  const secondary = isNavy ? '#002cdb' : '#C4D600';
  const tertiary = isNavy ? '#d4dfa0' : '#002cdb';

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {variant === 'circles' && (
          <>
            {/* Círculo grande cortado no canto superior-direito */}
            <circle data-shape data-speed="-0.15" cx="1350" cy="-80" r="280" fill={secondary} opacity="0.07" />
            {/* Círculo médio no canto inferior-esquerdo */}
            <circle data-shape data-speed="0.25" cx="120" cy="720" r="180" fill={primary} opacity="0.06" />
            {/* Círculo pequeno flutuante centro-direita */}
            <circle data-shape data-speed="-0.35" cx="980" cy="450" r="60" fill={tertiary} opacity="0.1" />
            {/* Círculo extra topo-esquerda */}
            <circle data-shape data-speed="0.18" cx="280" cy="120" r="100" fill={primary} opacity="0.05" />
            {/* Círculo extra base-direita */}
            <circle data-shape data-speed="-0.22" cx="1180" cy="680" r="140" fill={secondary} opacity="0.06" />
            {/* Anel fino centro-esquerda */}
            <circle data-shape data-speed="0.3" cx="480" cy="500" r="90" fill="none" stroke={tertiary} strokeWidth="3" opacity="0.08" />
          </>
        )}

        {variant === 'diamonds' && (
          <>
            {/* Diamante grande no canto superior-esquerdo */}
            <rect data-shape data-speed="0.2" x="-100" y="-100" width="400" height="400" fill={primary} opacity="0.05" transform="rotate(45 100 100)" />
            {/* Diamante médio no canto inferior-direito */}
            <rect data-shape data-speed="-0.3" x="1100" y="500" width="300" height="300" fill={secondary} opacity="0.07" transform="rotate(45 1250 650)" />
            {/* Círculo pequeno de contraste */}
            <circle data-shape data-speed="0.15" cx="750" cy="200" r="45" fill={tertiary} opacity="0.09" />
            {/* Diamante pequeno topo-direita */}
            <rect data-shape data-speed="-0.25" x="1280" y="-60" width="180" height="180" fill={primary} opacity="0.04" transform="rotate(45 1370 30)" />
            {/* Diamante extra base-esquerda */}
            <rect data-shape data-speed="0.35" x="60" y="550" width="200" height="200" fill={secondary} opacity="0.05" transform="rotate(45 160 650)" />
            {/* Anel quadrado centro */}
            <rect data-shape data-speed="-0.18" x="620" y="340" width="160" height="160" fill="none" stroke={tertiary} strokeWidth="3" opacity="0.07" transform="rotate(45 700 420)" />
          </>
        )}

        {variant === 'arcs' && (
          <>
            {/* Semi-círculo grande no topo direito */}
            <path data-shape data-speed="-0.2" d="M 1100 0 A 300 300 0 0 1 1400 0 Z" fill={secondary} opacity="0.06" />
            {/* Semi-círculo invertido na base esquerda */}
            <path data-shape data-speed="0.3" d="M 0 800 A 250 250 0 0 0 500 800 Z" fill={primary} opacity="0.05" />
            {/* Círculo flutuante centro */}
            <circle data-shape data-speed="-0.1" cx="720" cy="400" r="70" fill={tertiary} opacity="0.08" />
            {/* Arco extra topo-esquerda */}
            <path data-shape data-speed="0.22" d="M 0 0 A 200 200 0 0 1 400 0 Z" fill={primary} opacity="0.04" />
            {/* Arco extra base-direita */}
            <path data-shape data-speed="-0.28" d="M 1000 800 A 220 220 0 0 0 1440 800 Z" fill={secondary} opacity="0.05" />
            {/* Semi-círculo lateral centro-esquerda */}
            <path data-shape data-speed="0.15" d="M 0 300 A 150 150 0 0 1 0 600 Z" fill={tertiary} opacity="0.06" />
          </>
        )}

        {variant === 'mixed' && (
          <>
            {/* Triângulo no canto superior-esquerdo */}
            <polygon data-shape data-speed="0.25" points="0,0 350,0 0,300" fill={secondary} opacity="0.06" />
            {/* Círculo grande no canto inferior-direito */}
            <circle data-shape data-speed="-0.2" cx="1300" cy="700" r="220" fill={primary} opacity="0.05" />
            {/* Diamante pequeno centro-esquerda */}
            <rect data-shape data-speed="0.35" x="300" y="350" width="120" height="120" fill={tertiary} opacity="0.08" transform="rotate(45 360 410)" />
            {/* Triângulo invertido topo-direita */}
            <polygon data-shape data-speed="-0.18" points="1200,0 1440,0 1440,250" fill={primary} opacity="0.04" />
            {/* Círculo médio base-esquerda */}
            <circle data-shape data-speed="0.28" cx="200" cy="650" r="130" fill={secondary} opacity="0.05" />
            {/* Diamante extra centro-direita */}
            <rect data-shape data-speed="-0.32" x="900" y="250" width="100" height="100" fill={primary} opacity="0.06" transform="rotate(45 950 300)" />
          </>
        )}
      </svg>
    </div>
  );
};

export default SectionShapes;