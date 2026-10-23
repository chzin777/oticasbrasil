import { useSyncExternalStore } from 'react';
import { AVAILABLE_COUPONS, CATALOG_PRODUCTS, Coupon } from '../data/mockData';
import { EyewearProduct } from '../types';

const STORAGE_KEY = 'oticas-admin-data-v1';
const PASSWORD_KEY = 'oticas-admin-password';
const SESSION_KEY = 'oticas-admin-session';
const DEFAULT_PASSWORD = 'admin123';

export type HeroTheme = 'default' | 'blackfriday';

export interface HeroTexts {
  brandBadge: string;
  headlineCom: string;
  headlinePercent: string;
  headlineOff: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
}

export interface BannerImages {
  background: string;
  brandLogo: string;
  partnerLogo: string;
}

export interface CustomBanner {
  id: string;
  name: string;
  theme: HeroTheme;
  announcements: string[];
  hero: Partial<HeroTexts>;
  images: BannerImages;
}

export interface SiteConfig {
  announcements: Record<HeroTheme, string[]>;
  hero: Record<HeroTheme, Partial<HeroTexts>>;
  images: Record<HeroTheme, BannerImages>;
  customBanners: CustomBanner[];
  activeBannerId: string | null;
}

interface StoredData {
  overrides: Record<string, EyewearProduct>;
  custom: EyewearProduct[];
  removed: string[];
  coupons: Record<string, Coupon> | null;
  config: SiteConfig;
}

const DEFAULT_CONFIG: SiteConfig = {
  announcements: {
    default: ['10x sem juros', 'Frete grátis acima de R$ 299,00'],
    blackfriday: ['BLACK FRIDAY', '10x sem juros', 'Frete grátis acima de R$ 299,00'],
  },
  hero: { default: {}, blackfriday: {} },
  images: {
    default: { background: '/hero-bg.jpg', brandLogo: '/logos/logo-green.png', partnerLogo: '/logos/meta.png' },
    blackfriday: { background: '/black-bg.jpg', brandLogo: '/logos/logo-green.png', partnerLogo: '' },
  },
  customBanners: [],
  activeBannerId: null,
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const ORIGINAL_PRODUCTS: EyewearProduct[] = clone(CATALOG_PRODUCTS);
const ORIGINAL_COUPONS: Record<string, Coupon> = clone(AVAILABLE_COUPONS);

const emptyData = (): StoredData => ({
  overrides: {},
  custom: [],
  removed: [],
  coupons: null,
  config: clone(DEFAULT_CONFIG),
});

let data: StoredData = emptyData();

/* Configuração viva lida por Header e HeroCapa */
export const SITE_CONFIG: SiteConfig = clone(DEFAULT_CONFIG);

let version = 0;
const listeners = new Set<() => void>();

const load = (): StoredData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    const base = emptyData();
    return {
      overrides: parsed.overrides ?? base.overrides,
      custom: parsed.custom ?? base.custom,
      removed: parsed.removed ?? base.removed,
      coupons: parsed.coupons ?? null,
      config: {
        announcements: { ...base.config.announcements, ...(parsed.config?.announcements ?? {}) },
        hero: { ...base.config.hero, ...(parsed.config?.hero ?? {}) },
        images: {
          default: { ...base.config.images.default, ...(parsed.config?.images?.default ?? {}) },
          blackfriday: { ...base.config.images.blackfriday, ...(parsed.config?.images?.blackfriday ?? {}) },
        },
        customBanners: Array.isArray(parsed.config?.customBanners) ? parsed.config.customBanners : [],
        activeBannerId: typeof parsed.config?.activeBannerId === 'string' ? parsed.config.activeBannerId : null,
      },
    };
  } catch {
    return emptyData();
  }
};

/* Aplica os dados salvos sobre os objetos de mockData, mutando-os in-place */
const apply = () => {
  const list = [
    ...ORIGINAL_PRODUCTS.filter((p) => !data.removed.includes(p.id)).map((p) => data.overrides[p.id] ?? p),
    ...data.custom,
  ];
  CATALOG_PRODUCTS.splice(0, CATALOG_PRODUCTS.length, ...clone(list));

  Object.keys(AVAILABLE_COUPONS).forEach((k) => delete AVAILABLE_COUPONS[k]);
  Object.assign(AVAILABLE_COUPONS, clone(data.coupons ?? ORIGINAL_COUPONS));

  SITE_CONFIG.announcements = clone(data.config.announcements);
  SITE_CONFIG.hero = clone(data.config.hero);
  SITE_CONFIG.images = clone(data.config.images);
  SITE_CONFIG.customBanners = clone(data.config.customBanners);
  SITE_CONFIG.activeBannerId = data.config.activeBannerId;
};

/* Retorna false se o navegador recusar gravar (ex.: fotos grandes demais) */
const commit = (): boolean => {
  apply();
  version++;
  listeners.forEach((l) => l());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

data = load();
apply();

export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const useSiteData = () => useSyncExternalStore(subscribe, () => version);

/* ---------- Produtos ---------- */

export const isCustomProduct = (id: string) => data.custom.some((p) => p.id === id);

export const saveProduct = (product: EyewearProduct): boolean => {
  if (isCustomProduct(product.id)) {
    data.custom = data.custom.map((p) => (p.id === product.id ? product : p));
  } else {
    data.overrides[product.id] = product;
  }
  return commit();
};

export const createProduct = (product: EyewearProduct): boolean => {
  data.custom = [...data.custom, product];
  return commit();
};

export const deleteProduct = (id: string): boolean => {
  if (isCustomProduct(id)) {
    data.custom = data.custom.filter((p) => p.id !== id);
  } else {
    data.removed = [...new Set([...data.removed, id])];
    delete data.overrides[id];
  }
  return commit();
};

export const restoreProduct = (id: string): boolean => {
  delete data.overrides[id];
  data.removed = data.removed.filter((r) => r !== id);
  return commit();
};

export const getRemovedProducts = (): EyewearProduct[] =>
  ORIGINAL_PRODUCTS.filter((p) => data.removed.includes(p.id));

export const applyBulkDiscount = (ids: string[], percent: number): boolean => {
  ids.forEach((id) => {
    const current = CATALOG_PRODUCTS.find((p) => p.id === id);
    if (!current) return;
    const base = current.originalPrice && current.originalPrice > current.price ? current.originalPrice : current.price;
    const next: EyewearProduct = {
      ...clone(current),
      originalPrice: base,
      price: Math.round(base * (1 - percent / 100) * 100) / 100,
    };
    if (isCustomProduct(id)) {
      data.custom = data.custom.map((p) => (p.id === id ? next : p));
    } else {
      data.overrides[id] = next;
    }
  });
  return commit();
};

export const clearBulkDiscount = (ids: string[]): boolean => {
  ids.forEach((id) => {
    const current = CATALOG_PRODUCTS.find((p) => p.id === id);
    if (!current || !current.originalPrice || current.originalPrice <= current.price) return;
    const next: EyewearProduct = { ...clone(current), price: current.originalPrice };
    delete next.originalPrice;
    if (isCustomProduct(id)) {
      data.custom = data.custom.map((p) => (p.id === id ? next : p));
    } else {
      data.overrides[id] = next;
    }
  });
  return commit();
};

/* ---------- Cupons ---------- */

export const saveCoupon = (code: string, coupon: Coupon, previousCode?: string): boolean => {
  const next = { ...clone(data.coupons ?? ORIGINAL_COUPONS) };
  if (previousCode && previousCode !== code) delete next[previousCode];
  next[code.trim().toUpperCase()] = coupon;
  data.coupons = next;
  return commit();
};

export const deleteCoupon = (code: string): boolean => {
  const next = { ...clone(data.coupons ?? ORIGINAL_COUPONS) };
  delete next[code];
  data.coupons = next;
  return commit();
};

/* ---------- Banners ---------- */

export const saveAnnouncements = (theme: HeroTheme, items: string[]): boolean => {
  data.config.announcements = { ...data.config.announcements, [theme]: items };
  return commit();
};

export const saveHero = (theme: HeroTheme, texts: Partial<HeroTexts>): boolean => {
  data.config.hero = { ...data.config.hero, [theme]: texts };
  return commit();
};

export const saveThemeBanner = (
  theme: HeroTheme,
  texts: Partial<HeroTexts>,
  announcements: string[],
  images: BannerImages,
): boolean => {
  data.config.hero = { ...data.config.hero, [theme]: clone(texts) };
  data.config.announcements = { ...data.config.announcements, [theme]: clone(announcements) };
  data.config.images = { ...data.config.images, [theme]: clone(images) };
  return commit();
};

export const saveBannerImages = (theme: HeroTheme, images: BannerImages): boolean => {
  data.config.images = { ...data.config.images, [theme]: images };
  return commit();
};

export const saveCustomBanner = (banner: CustomBanner): boolean => {
  const exists = data.config.customBanners.some((item) => item.id === banner.id);
  data.config.customBanners = exists
    ? data.config.customBanners.map((item) => (item.id === banner.id ? clone(banner) : item))
    : [...data.config.customBanners, clone(banner)];
  return commit();
};

export const deleteCustomBanner = (id: string): boolean => {
  data.config.customBanners = data.config.customBanners.filter((banner) => banner.id !== id);
  if (data.config.activeBannerId === id) data.config.activeBannerId = null;
  return commit();
};

export const setActiveBanner = (id: string | null): boolean => {
  data.config.activeBannerId = id;
  return commit();
};

/* ---------- Backup ---------- */

export const exportData = () => JSON.stringify(data, null, 2);

export const importData = (json: string): boolean => {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    data = load();
    return commit();
  } catch {
    return false;
  }
};

export const resetAll = () => {
  data = emptyData();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sem ação */
  }
  commit();
};

/* ---------- Acesso (apenas front-end, não é segurança real) ---------- */

const currentPassword = () => localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;

export const isAdminLoggedIn = () => sessionStorage.getItem(SESSION_KEY) === '1';

export const adminLogin = (password: string): boolean => {
  if (password !== currentPassword()) return false;
  sessionStorage.setItem(SESSION_KEY, '1');
  return true;
};

export const adminLogout = () => sessionStorage.removeItem(SESSION_KEY);

export const changeAdminPassword = (next: string) => localStorage.setItem(PASSWORD_KEY, next);

/* ---------- Imagens ---------- */

/* Reduz a foto para caber no armazenamento local */
export const fileToDataUrl = (file: File, maxSize = 1000): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas indisponível'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
