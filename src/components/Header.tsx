import React, { useRef, useLayoutEffect, useState } from 'react';
import { AppPage } from '../types';
import { TextMarquee } from './TextMarquee';

type CatalogCategory = 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau';

interface HeaderProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onOpenCatalog?: (category: CatalogCategory) => void;
  onOpenStores?: () => void;
  onOpenSearch?: () => void;
  cartCount: number;
  onOpenCart?: () => void;
  onOpenProfile?: () => void;
  activeCategory?: CatalogCategory | null;
  isStoresActive?: boolean;
  heroTheme?: 'default' | 'blackfriday';
}

const isHome = (page: AppPage) => page === 'home';

type NavKey = 'home' | 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau' | 'lojas';

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenCatalog,
  onOpenStores,
  onOpenSearch,
  cartCount,
  onOpenCart,
  onOpenProfile,
  activeCategory,
  isStoresActive,
  heroTheme = 'default'
}) => {
  const isBlackFriday = heroTheme === 'blackfriday';
  const navRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [hoveringTop, setHoveringTop] = useState(false);

  useLayoutEffect(() => {
    if (!isHome(currentPage)) {
      setScrolledPastHero(true);
      return;
    }
    const onScroll = () => {
      setScrolledPastHero(window.scrollY > window.innerHeight * 0.85);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [currentPage]);

  /* Zona de hover no topo — revela a navbar quando o mouse entra nos primeiros 120px */
  const navVisible = scrolledPastHero || hoveringTop;

  const activeKey: NavKey | null =
    currentPage === 'home'
      ? 'home'
      : isStoresActive
        ? 'lojas'
        : activeCategory ?? null;

  useLayoutEffect(() => {
    if (!activeKey) {
      setIndicator(null);
      return;
    }
    const el = navRefs.current[activeKey];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeKey]);

  const getNavClass = (isActive: boolean) =>
    `relative text-sm font-semibold transition-colors py-1 cursor-pointer ${
      isActive ? 'text-[#061748]' : 'text-[#45464f] hover:text-[#061748]'
    }`;
  return (
    <>
      {/* Zona de hover invisível no topo — revela a navbar ao passar o mouse nos primeiros 120px */}
      {isHome(currentPage) && !scrolledPastHero && (
        <div
          className="fixed top-0 left-0 w-full h-[120px] z-40"
          onMouseEnter={() => setHoveringTop(true)}
          onMouseLeave={() => setHoveringTop(false)}
          aria-hidden="true"
        />
      )}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          isHome(currentPage) && !navVisible
            ? 'opacity-0 pointer-events-none -translate-y-full'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        } ${!isHome(currentPage) || scrolledPastHero ? 'bg-white' : ''}`}
        onMouseEnter={() => setHoveringTop(true)}
        onMouseLeave={() => setHoveringTop(false)}
      >
        {/* Top Bar Announcement */}
      <div className={`text-[11px] font-bold tracking-wider uppercase py-2 px-4 sm:px-8 text-center select-none transition-colors duration-300 ${isBlackFriday ? 'bg-black text-[#C4D600]' : isHome(currentPage) ? 'bg-[#061748]/80 backdrop-blur-md text-white' : 'bg-[#061748] text-[#ffffff]'}`}>
        <TextMarquee
          items={isBlackFriday ? ['BLACK FRIDAY', '10x sem juros', 'Frete grátis acima de R$ 299,00'] : ['10x sem juros', 'Frete grátis acima de R$ 299,00']}
          speed={30}
          direction="left"
          separator="|"
          className="w-full"
        />
      </div>

      {/* Main Header Navigation Bar */}
      <div className={`h-22 transition-all duration-300 ${isHome(currentPage) ? 'bg-white border-b border-[#eceef0]' : 'bg-white border-b border-[#c6c5d0]/30 shadow-[0_4px_12px_rgba(5,22,71,0.06)]'}`}>
        <div className="max-w-[1440px] h-full mx-auto px-4 sm:px-8 md:px-12 flex items-center justify-between gap-4 md:gap-6">

          {/* Logo Branding */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <img
              alt="Óticas Brasil Logo"
              className="h-10 md:h-11 w-auto object-contain transition-transform group-hover:scale-105"
              src="/logos/logo-blue.png"
            />
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 relative">
            <button
              ref={(el) => { navRefs.current['home'] = el; }}
              onClick={() => onNavigate('home')}
              className={getNavClass(currentPage === 'home')}
            >
              Início
            </button>
            <button
              ref={(el) => { navRefs.current['armacoes'] = el; }}
              onClick={() => onOpenCatalog && onOpenCatalog('armacoes')}
              className={getNavClass(activeCategory === 'armacoes')}
            >
              Armações
            </button>
            <button
              ref={(el) => { navRefs.current['oculos-de-sol'] = el; }}
              onClick={() => onOpenCatalog && onOpenCatalog('oculos-de-sol')}
              className={getNavClass(activeCategory === 'oculos-de-sol')}
            >
              Óculos de Sol
            </button>
            <button
              ref={(el) => { navRefs.current['lentes-de-grau'] = el; }}
              onClick={() => onOpenCatalog && onOpenCatalog('lentes-de-grau')}
              className={getNavClass(activeCategory === 'lentes-de-grau')}
            >
              Lentes de Grau
            </button>
            <button
              ref={(el) => { navRefs.current['lojas'] = el; }}
              onClick={() => onOpenStores && onOpenStores()}
              className={getNavClass(!!isStoresActive)}
            >
              Lojas
            </button>
            {indicator && (
              <span
                className="absolute bottom-0 h-[2px] bg-[#061748] transition-all duration-300 ease-out"
                style={{ left: indicator.left, width: indicator.width }}
              />
            )}
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSearch}
              aria-label="Buscar"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#45464f] hover:text-[#191c1e] hover:bg-[#eceef0] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>

            <button
              aria-label="Lista de Desejos"
              onClick={() => alert('Sua Lista de Desejos está vazia no momento.')}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#45464f] hover:text-[#191c1e] hover:bg-[#eceef0] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">favorite</span>
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#061748] text-white text-[10px] leading-none flex items-center justify-center font-bold">
                0
              </span>
            </button>

            <button
              onClick={onOpenCart}
              aria-label="Sacola de Compras"
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#45464f] hover:text-[#191c1e] hover:bg-[#eceef0] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#dbee2c] text-[#061748] text-[11px] font-bold leading-none flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            </button>

            <button
              onClick={onOpenProfile}
              aria-label="Minha Conta"
              className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer ml-1"
            >
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  </>
  );
};