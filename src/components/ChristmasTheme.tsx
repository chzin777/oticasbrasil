import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import './ChristmasTheme.css';

gsap.registerPlugin(ScrollTrigger);

export function ChristmasHeroDecorations({ enabled }: { enabled: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const scene = root.current;
    if (!enabled || !scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = scene.parentElement;
    if (!section) return;

    scene.querySelectorAll<HTMLElement>('[data-christmas-parallax]').forEach((element) => {
      gsap.to(element, {
        yPercent: Number(element.dataset.christmasParallax),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  }, { dependencies: [enabled], revertOnUpdate: true });

  if (!enabled) return null;

  return (
    <div ref={root} className="christmas-hero-effects" aria-hidden="true">
      <div className="christmas-snow" />
      <div className="christmas-ornament christmas-ornament-red" data-christmas-parallax="26">
        <span />
      </div>
      <div className="christmas-ornament christmas-ornament-gold" data-christmas-parallax="44">
        <span />
      </div>
      <div className="christmas-ornament christmas-ornament-green" data-christmas-parallax="62">
        <span />
      </div>
      <div className="christmas-ornament christmas-ornament-pearl" data-christmas-parallax="34">
        <span />
      </div>
      <svg className="christmas-garland" viewBox="0 0 900 150" preserveAspectRatio="none">
        <path d="M-20 8 C150 115 260 25 420 75 S700 130 920 20" fill="none" stroke="#174c35" strokeWidth="18" />
        <path d="M-20 8 C150 115 260 25 420 75 S700 130 920 20" fill="none" stroke="#2d7650" strokeWidth="8" strokeDasharray="2 18" />
      </svg>
      <div className="christmas-gifts" data-christmas-parallax="72">
        <svg viewBox="0 0 170 120">
          <g className="christmas-gift-small">
            <path d="M12 55h58v48H12z" fill="#b8323c" />
            <path d="M7 46h68v16H7z" fill="#df5260" />
            <path d="M35 46h13v57H35z" fill="#f3c96a" />
            <path d="M41 47c-31-1-25-30-10-25 9 3 10 25 10 25Zm0 0c31-1 25-30 10-25-9 3-10 25-10 25Z" fill="none" stroke="#f3c96a" strokeWidth="6" />
          </g>
          <g className="christmas-gift-large">
            <path d="M83 43h70v64H83z" fill="#176143" />
            <path d="M77 31h82v19H77z" fill="#26835a" />
            <path d="M111 31h14v76h-14z" fill="#d94a55" />
            <path d="M118 32c-36-2-29-34-12-29 10 3 12 29 12 29Zm0 0c36-2 29-34 12-29-10 3-12 29-12 29Z" fill="none" stroke="#d94a55" strokeWidth="6" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export function ChristmasSurprise({ enabled }: { enabled: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <div className="christmas-surprise">
      {open && (
        <div className="christmas-surprise-card" role="status">
          <button type="button" className="christmas-surprise-close" aria-label="Fechar surpresa" onClick={() => setOpen(false)}>
            ×
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b8323c]">Você encontrou um mimo!</p>
          <p className="mt-1 text-sm leading-relaxed text-[#26334d]">Que seu Natal seja cheio de brilho — por dentro e por fora.</p>
          <button
            type="button"
            className="mt-3 text-xs font-bold text-[#176143] underline underline-offset-4"
            onClick={() => {
              setOpen(false);
              navigate('/armacoes');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Descobrir armações
          </button>
        </div>
      )}
      <button
        type="button"
        className="christmas-surprise-trigger"
        aria-label={open ? 'Fechar surpresa de Natal' : 'Abrir surpresa de Natal'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 10h16v10H4zM3 7h18v4H3zM12 7v13M12 7H8.5a2.5 2.5 0 1 1 2.4-3.2L12 7Zm0 0h3.5a2.5 2.5 0 1 0-2.4-3.2L12 7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
