import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { AppPage } from '../types';
import { TextMarquee } from './TextMarquee';
import { useWishlist } from './WishlistContext';
import { SITE_CONFIG, useSiteData } from '../lib/siteStore';

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
  onOpenWishlist?: () => void;
  activeCategory?: CatalogCategory | null;
  isStoresActive?: boolean;
  heroTheme?: 'default' | 'blackfriday';
  userName?: string | null;
  onLogout?: () => void;
}

const isHome = (page: AppPage) => page === 'home';

type NavKey = 'home' | 'produtos' | 'lojas' | 'quem-somos';

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenCatalog,
  onOpenStores,
  onOpenSearch,
  cartCount,
  onOpenCart,
  onOpenProfile,
  onOpenWishlist,
  activeCategory,
  isStoresActive,
  heroTheme = 'default',
  userName,
  onLogout,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [bannerRotationIndex, setBannerRotationIndex] = useState(0);
  const isBannerRotation = SITE_CONFIG.activeBannerId === '__rotation__';
  const activeCustomBanner = SITE_CONFIG.customBanners.find((banner) => banner.id === SITE_CONFIG.activeBannerId)
    ?? (isBannerRotation ? SITE_CONFIG.customBanners[bannerRotationIndex % Math.max(1, SITE_CONFIG.customBanners.length)] : undefined);
  const isBlackFriday = activeCustomBanner
    ? activeCustomBanner.theme === 'blackfriday'
    : SITE_CONFIG.activeBannerId === 'blackfriday' || (SITE_CONFIG.activeBannerId === null && heroTheme === 'blackfriday');
  const announcements = activeCustomBanner?.announcements
    ?? SITE_CONFIG.announcements[isBlackFriday ? 'blackfriday' : 'default'];
  const wishlistCount = useWishlist().ids.length;
  useSiteData();

  useEffect(() => {
    if (!isBannerRotation || SITE_CONFIG.customBanners.length < 2) return;
    const timer = window.setInterval(() => {
      setBannerRotationIndex((index) => (index + 1) % SITE_CONFIG.customBanners.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [isBannerRotation, SITE_CONFIG.customBanners.length]);

  const navRefs = useRef<Record<string, HTMLElement | null>>({});
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [hoveringTop, setHoveringTop] = useState(false);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

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
        : currentPage === 'about'
          ? 'quem-somos'
          : activeCategory || currentPage === 'allProducts'
          ? 'produtos'
          : null;

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
    `relative text-sm font-semibold transition-colors py-1 cursor-pointer flex items-center gap-1.5 ${
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
        className={`fixed top-0 left-0 w-full z-50 transition-none xl:transition-all duration-300 ${
          isHome(currentPage) && !navVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto xl:opacity-0 xl:pointer-events-none xl:-translate-y-full'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        } ${!isHome(currentPage) || scrolledPastHero ? 'bg-white' : ''}`}
        onMouseEnter={() => setHoveringTop(true)}
        onMouseLeave={() => setHoveringTop(false)}
      >
        {/* Top Bar Announcement */}
      <div className={`text-[11px] font-bold tracking-wider uppercase py-2 px-4 sm:px-8 text-center select-none transition-colors duration-300 ${isBlackFriday ? 'bg-black text-[#C4D600]' : isHome(currentPage) ? 'bg-[#061748]/80 backdrop-blur-md text-white' : 'bg-[#061748] text-[#ffffff]'}`}>
        <TextMarquee
          items={announcements}
          speed={30}
          direction="left"
          separator="|"
          className="w-full"
        />
      </div>

      {/* Main Header Navigation Bar */}
      <div className={`h-22 transition-all duration-300 ${isHome(currentPage) ? 'bg-white border-b border-[#eceef0]' : 'bg-white border-b border-[#c6c5d0]/30 shadow-[0_4px_12px_rgba(5,22,71,0.06)]'}`}>
        <div className="max-w-[1440px] h-full mx-auto px-3 sm:px-5 lg:px-8 xl:px-12 flex items-center justify-between gap-2 sm:gap-4 xl:gap-6">

          {/* Logo Branding */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <img
              alt="Óticas Brasil Logo"
              className="h-8 max-w-[108px] sm:h-10 sm:max-w-none md:h-11 w-auto object-contain transition-transform group-hover:scale-105"
              src="/logos/logo-blue.png"
            />
          </div>

          {/* Nav Links */}
          <nav className="hidden xl:flex items-center gap-4 2xl:gap-8 relative">
            <button
              ref={(el) => { navRefs.current['home'] = el; }}
              onClick={() => onNavigate('home')}
              className={getNavClass(currentPage === 'home')}
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              Início
            </button>
            <div
              ref={(el) => { navRefs.current['produtos'] = el; }}
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={productsOpen}
                onClick={() => setProductsOpen((o) => !o)}
                className={getNavClass(activeKey === 'produtos')}
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                Produtos
                <span className={`material-symbols-outlined text-[18px] transition-transform ${productsOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {productsOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
                  <div role="menu" className="min-w-[210px] bg-white border border-[#eceef0] rounded-2xl shadow-xl p-2 animate-fadeIn">
                    {[
                      { label: 'Todos os produtos', icon: 'grid_view', action: () => onNavigate('allProducts'), active: currentPage === 'allProducts' },
                      { label: 'Armações', icon: 'eyeglasses', action: () => onOpenCatalog?.('armacoes'), active: activeCategory === 'armacoes' },
                      { label: 'Óculos de Sol', icon: 'sunny', action: () => onOpenCatalog?.('oculos-de-sol'), active: activeCategory === 'oculos-de-sol' },
                      { label: 'Lentes de Grau', icon: 'lens_blur', action: () => onOpenCatalog?.('lentes-de-grau'), active: activeCategory === 'lentes-de-grau' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => { setProductsOpen(false); item.action(); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors cursor-pointer ${
                          item.active ? 'bg-[#061748] text-white' : 'text-[#45464f] hover:bg-[#f2f4f6] hover:text-[#061748]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              ref={(el) => { navRefs.current['lojas'] = el; }}
              onClick={() => onOpenStores && onOpenStores()}
              className={getNavClass(!!isStoresActive)}
            >
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              Lojas
            </button>
            <button
              ref={(el) => { navRefs.current['quem-somos'] = el; }}
              onClick={() => onNavigate('about')}
              className={getNavClass(currentPage === 'about')}
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              Quem somos
            </button>
            {indicator && (
              <span
                className="absolute bottom-0 h-[2px] bg-[#061748] transition-all duration-300 ease-out"
                style={{ left: indicator.left, width: indicator.width }}
              />
            )}
          </nav>

          {/* Quick Actions */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex xl:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full items-center justify-center text-[#45464f] hover:bg-[#eceef0] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
            <button
              onClick={onOpenSearch}
              aria-label="Buscar"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#45464f] hover:text-[#191c1e] hover:bg-[#eceef0] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>

            <button
              aria-label="Lista de Desejos"
              onClick={onOpenWishlist}
              className="relative hidden min-[380px]:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full items-center justify-center text-[#45464f] hover:text-[#191c1e] hover:bg-[#eceef0] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">favorite</span>
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#061748] text-white text-[10px] leading-none flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            </button>

            <button
              onClick={onOpenCart}
              aria-label="Sacola de Compras"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#45464f] hover:text-[#191c1e] hover:bg-[#eceef0] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#dbee2c] text-[#061748] text-[11px] font-bold leading-none flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            </button>

            <div ref={userMenuRef} className="relative hidden sm:flex items-center ml-1">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label="Menu do usuário"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-[#f2f4f6] transition-colors cursor-pointer"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#061748] text-xs font-bold text-white select-none">
                  {userName ? userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U' : <span className="material-symbols-outlined text-[18px]">person</span>}
                </span>
                {userName && (
                  <span className="max-w-[120px] truncate text-sm font-semibold text-[#061748]">{userName}</span>
                )}
                <span className={`material-symbols-outlined text-[16px] text-[#68748a] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-[60] min-w-[200px] origin-top-right animate-fadeIn">
                  <div role="menu" className="overflow-hidden rounded-xl border border-[#eceef0] bg-white shadow-xl">
                    {userName && (
                      <div className="border-b border-[#eceef0] px-4 py-3">
                        <p className="truncate text-sm font-bold text-[#061748]">{userName}</p>
                      </div>
                    )}
                    <div className="p-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setUserMenuOpen(false); onOpenProfile?.(); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#45464f] hover:bg-[#f2f4f6] hover:text-[#061748] transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        Minha Conta
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setUserMenuOpen(false); onOpenWishlist?.(); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#45464f] hover:bg-[#f2f4f6] hover:text-[#061748] transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">favorite</span>
                        Lista de Desejos
                      </button>
                      {onLogout && (
                        <>
                          <div className="my-1 border-t border-[#eceef0]" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setUserMenuOpen(false); onLogout(); }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#b91c1c] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Sair
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {mobileMenuOpen && (
        <nav aria-label="Menu principal" className="absolute inset-x-0 top-full z-[55] max-h-[calc(100dvh-7rem)] overflow-y-auto border-t border-[#eceef0] bg-white p-3 shadow-xl xl:hidden">
          <div className="mx-auto grid max-w-[1440px] gap-1 sm:grid-cols-2">
            <button type="button" onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#061748] hover:bg-[#f2f4f6]">
              <span className="material-symbols-outlined text-[20px]">home</span>Início
            </button>
            <button type="button" onClick={() => { onNavigate('allProducts'); setMobileMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#061748] hover:bg-[#f2f4f6]">
              <span className="material-symbols-outlined text-[20px]">grid_view</span>Todos os produtos
            </button>
            {[
              { label: 'Armações', category: 'armacoes' as const, icon: 'eyeglasses' },
              { label: 'Óculos de Sol', category: 'oculos-de-sol' as const, icon: 'sunny' },
              { label: 'Lentes de Grau', category: 'lentes-de-grau' as const, icon: 'lens_blur' },
            ].map((item) => (
              <button key={item.category} type="button" onClick={() => { onOpenCatalog?.(item.category); setMobileMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#061748] hover:bg-[#f2f4f6]">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>{item.label}
              </button>
            ))}
            <button type="button" onClick={() => { onOpenStores?.(); setMobileMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#061748] hover:bg-[#f2f4f6]">
              <span className="material-symbols-outlined text-[20px]">location_on</span>Lojas
            </button>
            <button type="button" onClick={() => { onNavigate('about'); setMobileMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#061748] hover:bg-[#f2f4f6]">
              <span className="material-symbols-outlined text-[20px]">groups</span>Quem somos
            </button>
          </div>
        </nav>
      )}
    </header>
  </>
  );
};