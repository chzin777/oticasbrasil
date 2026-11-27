import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
      <div className="christmas-snow-layer christmas-snow-layer-back" data-christmas-parallax="18" />
      <div className="christmas-snow-layer christmas-snow-layer-front" data-christmas-parallax="42" />
      <svg className="christmas-hero-bough" viewBox="0 0 640 190" preserveAspectRatio="none" data-christmas-parallax="58">
        <path d="M642 8C508 100 380 36 228 121 152 163 73 154 0 111" fill="none" stroke="#174c35" strokeWidth="17" />
        <path d="M600 25 576 0m-16 36 1-30m-21 45-18-29m-12 44 7-30m-39 49-20-26m-10 42 13-27m-42 45-23-23m-6 39 16-25m-46 39-24-19m-4 36 18-21m-47 32-24-15m-4 30 18-17m-45 27-22-12m-5 25 17-13m-45 20-20-8m-6 20 17-9" fill="none" stroke="#2d7650" strokeWidth="8" strokeLinecap="round" />
        <circle cx="522" cy="68" r="5" fill="#e7c56e" />
        <circle cx="405" cy="102" r="5" fill="#b8323c" />
        <circle cx="278" cy="132" r="5" fill="#e7c56e" />
      </svg>
    </div>
  );
}

export function ChristmasSurprise({
  enabled,
  onOpenCatalog,
}: {
  enabled: boolean;
  onOpenCatalog: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <div className="christmas-bar-easter-egg">
      <button
        type="button"
        className="christmas-bar-easter-egg-trigger"
        aria-label={open ? 'Fechar surpresa de Natal' : 'Descobrir surpresa de Natal'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2.8 14.3 8l5.7.7-4.2 3.9 1.1 5.6-4.9-2.8-4.9 2.8 1.1-5.6L4 8.7 9.7 8 12 2.8Z" fill="currentColor" />
          <path d="m18.7 16.8.8 1.7 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2.8-1.7Z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="christmas-bar-easter-egg-note" role="status">
          <p>Você encontrou um brilho escondido. Que seu Natal venha cheio de bons olhares.</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenCatalog();
            }}
          >
            Descobrir armações
          </button>
        </div>
      )}
    </div>
  );
}
