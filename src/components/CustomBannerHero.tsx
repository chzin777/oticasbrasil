import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomBanner, HeroTexts } from '../lib/siteStore';

interface CustomBannerHeroProps {
  banner: CustomBanner;
  onOpenCatalog: (category: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau') => void;
}

const CustomBannerHero: React.FC<CustomBannerHeroProps> = ({ banner, onOpenCatalog }) => {
  const navigate = useNavigate();
  const isBlackFriday = banner.theme === 'blackfriday';
  const config: HeroTexts = {
    brandBadge: 'RAY-BAN META',
    headlineCom: 'COM',
    headlinePercent: '5%',
    headlineOff: 'OFF',
    subtitle: '',
    primaryCta: 'Quero o meu',
    secondaryCta: 'Explorar catálogo',
    ...banner.hero,
  };
  const goTo = (url?: string) => {
    if (!url) {
      onOpenCatalog('armacoes');
    } else if (url.startsWith('/')) {
      navigate(url);
    } else {
      try {
        const target = new URL(url);
        if (target.protocol === 'https:' || target.protocol === 'http:') {
          window.open(target.href, '_blank', 'noopener,noreferrer');
        }
      } catch {
        return;
      }
    }
  };
  const elements = banner.elements ?? [];

  if (elements.length > 0) {
    return (
      <section
        className="relative isolate w-full overflow-hidden"
        style={{ aspectRatio: '16 / 9', backgroundColor: banner.canvasBackgroundColor || '#061748', containerType: 'inline-size' }}
      >
        {banner.images.background && (
          <img src={banner.images.background} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />
        )}
        {elements.map((element, index) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            zIndex: index + 1,
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            transform: `rotate(${element.rotation ?? 0}deg)`,
            color: element.color || '#ffffff',
            backgroundColor: element.type === 'shape' || element.type === 'button' ? element.backgroundColor : undefined,
            borderRadius: element.type === 'shape' && element.shape === 'circle'
              ? '9999px'
              : `${element.borderRadius ?? 0}px`,
            fontSize: `${((element.fontSize ?? 24) / 1440) * 100}cqw`,
            fontWeight: element.fontWeight ?? 700,
          };

          if (element.type === 'image' || element.type === 'logo') {
            return element.src ? (
              <img key={element.id} src={element.src} alt={element.alt || ''} style={{ ...style, objectFit: 'contain' }} />
            ) : null;
          }

          if (element.type === 'button') {
            return (
              <button
                key={element.id}
                type="button"
                onClick={() => goTo(element.url)}
                style={style}
                className="flex items-center justify-center overflow-hidden px-3 text-center"
              >
                {element.text}
              </button>
            );
          }

          if (element.type === 'shape') {
            return <div key={element.id} aria-hidden="true" style={style} />;
          }

          return (
            <div key={element.id} style={{ ...style, overflow: 'hidden', whiteSpace: 'pre-wrap', lineHeight: 1.15 }}>
              {element.text}
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className={`relative isolate flex min-h-screen items-center overflow-hidden text-white ${isBlackFriday ? 'justify-center text-center' : ''}`}>
      <img src={banner.images.background} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className={`absolute inset-0 -z-10 ${isBlackFriday ? 'bg-black/55' : 'bg-gradient-to-r from-black via-black/80 to-black/20'}`} />

      {isBlackFriday ? (
        <div className="relative z-10 w-full max-w-3xl px-5 py-24 sm:px-10">
          <p className="inline-block rounded-md bg-[#C4D600] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#061748]">{config.brandBadge} É NA</p>
          <img src={banner.images.brandLogo} alt="Óticas Brasil" className="mx-auto my-3 h-20 w-auto sm:h-28" />
          {banner.images.partnerLogo && <img src={banner.images.partnerLogo} alt="Marca parceira" className="mx-auto mb-3 h-10 w-auto" />}
          <p className="text-lg font-black uppercase sm:text-2xl">{config.headlineCom}</p>
          <p className="text-6xl font-black leading-none text-[#C4D600] sm:text-8xl">
            {config.headlinePercent} <span className="text-2xl text-white sm:text-3xl">{config.headlineOff}</span>
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 sm:text-lg">{config.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => navigate('/rayban-meta')} className="rounded-xl bg-[#C4D600] px-5 py-3 text-sm font-bold text-[#061748] hover:bg-[#dbee2c]">{config.primaryCta}</button>
            <button type="button" onClick={() => onOpenCatalog('armacoes')} className="rounded-xl border border-white/50 px-5 py-3 text-sm font-bold hover:bg-white/10">{config.secondaryCta}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute left-5 top-16 z-10 flex h-14 items-center gap-2 sm:left-8 sm:top-20 sm:h-20">
            <img src={banner.images.brandLogo} alt="Óticas Brasil" className="h-full w-auto" />
            {banner.images.partnerLogo && (
              <>
                <span className="h-10 w-px bg-white/40" />
                <img src={banner.images.partnerLogo} alt="Marca parceira" className="h-full w-auto" />
              </>
            )}
          </div>
          <div className="relative z-10 max-w-3xl px-5 pb-12 pt-36 sm:px-12 sm:pt-40">
            <p className="mb-3 inline-block rounded bg-[#C4D600] px-3 py-1 text-sm font-black uppercase text-[#061748]">{config.brandBadge}</p>
            <p className="text-xl font-black uppercase sm:text-3xl">{config.headlineCom}</p>
            <p className="text-7xl font-black leading-none text-[#C4D600] sm:text-9xl">
              {config.headlinePercent} <span className="text-3xl text-white sm:text-4xl">{config.headlineOff}</span>
            </p>
            <p className="mt-5 max-w-xl text-base text-white/90 sm:text-xl">{config.subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate('/rayban-meta')} className="rounded-xl bg-[#C4D600] px-5 py-3 text-sm font-bold text-[#061748] hover:bg-[#dbee2c]">{config.primaryCta}</button>
              <button type="button" onClick={() => onOpenCatalog('armacoes')} className="rounded-xl border border-white/50 px-5 py-3 text-sm font-bold hover:bg-white/10">{config.secondaryCta}</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default CustomBannerHero;
