import { useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import type { Data } from '@puckeditor/core';
import { AVAILABLE_COUPONS, CATALOG_PRODUCTS, Coupon } from '../data/mockData';
import { EyewearProduct } from '../types';
import type { AdminUser } from './adminApi';
import { fetchProducts } from './integrationApi';
import { emptyPageBuilderData, hasNativeSectionLayout, NATIVE_SECTIONS, nativeSectionTypes, type PageBuilderData } from './pageBuilder';

const STORAGE_KEY = 'oticas-admin-data-v1';

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

export type BannerCanvasElementType = 'text' | 'image' | 'logo' | 'button' | 'shape';

export interface BannerCanvasElement {
  id: string;
  type: BannerCanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  text?: string;
  src?: string;
  alt?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: number;
  borderRadius?: number;
  shape?: 'rectangle' | 'circle';
  url?: string;
}

export interface CustomBanner {
  id: string;
  name: string;
  theme: HeroTheme;
  announcements: string[];
  hero: Partial<HeroTexts>;
  images: BannerImages;
  elements?: BannerCanvasElement[];
  canvasBackgroundColor?: string;
}

export interface SiteConfig {
  announcements: Record<HeroTheme, string[]>;
  hero: Record<HeroTheme, Partial<HeroTexts>>;
  images: Record<HeroTheme, BannerImages>;
  customBanners: CustomBanner[];
  activeBannerId: string | null;
}

export type EditableLayoutPage = 'home' | 'product';
export type EditableFilterKey = 'brand' | 'frameColor' | 'shape' | 'material' | 'bridgeSize';

export type PageBuilderBlockType = 'heading' | 'text' | 'image' | 'button' | 'spacer';

export interface PageBuilderBlock {
  id: string;
  type: PageBuilderBlockType;
  content: string;
  src: string;
  url: string;
  backgroundColor: string;
  textColor: string;
  align: 'left' | 'center' | 'right';
  width: 'full' | 'half';
  height: number;
}

export interface VisualPageElement {
  id: string;
  selector: string;
  content?: string;
  src?: string;
  alt?: string;
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  hidden: boolean;
}

export interface PageEditorConfig {
  layouts: Record<EditableLayoutPage, { order: string[]; hidden: string[] }>;
  blocks: Record<EditableLayoutPage, PageBuilderBlock[]>;
  puck: Record<EditableLayoutPage, PageBuilderData>;
  visualElements: Record<EditableLayoutPage, VisualPageElement[]>;
  filterOptions: Record<EditableFilterKey, { added: string[]; hidden: string[] }>;
}

export const PAGE_EDITOR_SECTIONS: Record<EditableLayoutPage, { id: string; label: string }[]> = {
  home: [
    { id: 'hero', label: 'Banner principal' },
    { id: 'featured', label: 'Os mais desejados' },
    { id: 'benefits', label: 'Benefícios da loja' },
    { id: 'exclusive', label: 'Linha exclusiva' },
    { id: 'newsletter', label: 'Newsletter' },
    { id: 'collection', label: 'Explore a coleção' },
  ],
  product: [
    { id: 'description', label: 'Sobre o produto' },
    { id: 'specifications', label: 'Ficha técnica' },
    { id: 'similar', label: 'Produtos similares' },
  ],
};

export const EDITABLE_FILTERS: { key: EditableFilterKey; label: string }[] = [
  { key: 'brand', label: 'Marca' },
  { key: 'frameColor', label: 'Cor da armação' },
  { key: 'shape', label: 'Formato' },
  { key: 'material', label: 'Material' },
  { key: 'bridgeSize', label: 'Tamanho da ponte' },
];

const defaultPageEditorConfig = (): PageEditorConfig => ({
  layouts: {
    home: { order: PAGE_EDITOR_SECTIONS.home.map(({ id }) => id), hidden: [] },
    product: { order: PAGE_EDITOR_SECTIONS.product.map(({ id }) => id), hidden: [] },
  },
  blocks: { home: [], product: [] },
  puck: {
    home: normalizePageBuilderData(undefined, [], 'home'),
    product: normalizePageBuilderData(undefined, [], 'product'),
  },
  visualElements: { home: [], product: [] },
  filterOptions: {
    brand: { added: [], hidden: [] },
    frameColor: { added: [], hidden: [] },
    shape: { added: [], hidden: [] },
    material: { added: [], hidden: [] },
    bridgeSize: { added: [], hidden: [] },
  },
});

export interface ProductTag {
  id: string;
  name: string;
  color: string;
  assignedProductIds?: string[];
}

export type DiscountPolicyTrigger =
  | 'first_purchase'
  | 'new_customer'
  | 'returning_customer'
  | 'birthday'
  | 'cart_value'
  | 'item_quantity'
  | 'abandoned_cart'
  | 'progressive_time';

export type DiscountTimeUnit = 'hours' | 'days';

export interface DiscountPolicy {
  id: string;
  name: string;
  trigger: DiscountPolicyTrigger;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  active: boolean;
  allProducts: boolean;
  productIds: string[];
  duration: { value: number; unit: DiscountTimeUnit } | null;
  valueOperator?: 'minimum' | 'maximum' | 'between';
  minCartValue?: number;
  maxCartValue?: number;
  quantityOperator?: 'minimum' | 'maximum' | 'between';
  minItems?: number;
  maxItems?: number;
  idleDuration?: { value: number; unit: DiscountTimeUnit };
  channels: ('email' | 'whatsapp')[];
  progressionSteps: { after: number; unit: DiscountTimeUnit; discountValue: number }[];
  createdAt: string;
}

interface StoredData {
  overrides: Record<string, EyewearProduct>;
  custom: EyewearProduct[];
  removed: string[];
  tags: ProductTag[];
  discountPolicies: DiscountPolicy[];
  coupons: Record<string, Coupon> | null;
  pageEditor: PageEditorConfig;
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
  tags: [],
  discountPolicies: [],
  coupons: null,
  pageEditor: defaultPageEditorConfig(),
  config: clone(DEFAULT_CONFIG),
});

const normalizeStringList = (value: unknown) =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : [];

const normalizePageBuilderBlocks = (value: unknown): PageBuilderBlock[] => {
  if (!Array.isArray(value)) return [];
  const allowedTypes: PageBuilderBlockType[] = ['heading', 'text', 'image', 'button', 'spacer'];
  const allowedAlignments = ['left', 'center', 'right'] as const;
  const blocks = value.filter((item): item is Partial<PageBuilderBlock> =>
    typeof item === 'object' && item !== null &&
    typeof (item as PageBuilderBlock).id === 'string' &&
    allowedTypes.includes((item as PageBuilderBlock).type),
  );
  const ids = new Set<string>();
  return blocks.flatMap((block) => {
    if (!block.id || ids.has(block.id)) return [];
    ids.add(block.id);
    const safeUrl = (input: unknown) => {
      if (typeof input !== 'string') return '';
      const url = input.trim().slice(0, 2048);
      return /^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : '';
    };
    const safeColor = (input: unknown, fallback: string) =>
      typeof input === 'string' && /^#[\da-f]{3,8}$/i.test(input) ? input : fallback;
    return [{
      id: block.id.slice(0, 100),
      type: block.type!,
      content: typeof block.content === 'string' ? block.content.slice(0, 5000) : '',
      src: safeUrl(block.src),
      url: safeUrl(block.url),
      backgroundColor: safeColor(block.backgroundColor, '#ffffff'),
      textColor: safeColor(block.textColor, '#142344'),
      align: allowedAlignments.includes(block.align as typeof allowedAlignments[number])
        ? block.align as PageBuilderBlock['align']
        : 'left',
      width: block.width === 'half' ? 'half' : 'full',
      height: typeof block.height === 'number' && Number.isFinite(block.height)
        ? Math.min(400, Math.max(8, Math.round(block.height)))
        : 48,
    }];
  });
};

const normalizeVisualPageElements = (value: unknown): VisualPageElement[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const element = item as Partial<VisualPageElement>;
    if (typeof element.id !== 'string' || typeof element.selector !== 'string') return [];
    const id = element.id.slice(0, 120);
    const selector = element.selector.slice(0, 2000);
    if (!id || !selector || seen.has(id)) return [];
    seen.add(id);
    const safeColor = (input: unknown) =>
      typeof input === 'string' && /^#[\da-f]{3,8}$/i.test(input) ? input : undefined;
    return [{
      id,
      selector,
      content: typeof element.content === 'string' ? element.content.slice(0, 5000) : undefined,
      src: typeof element.src === 'string' && /^(https?:|\/)/i.test(element.src) ? element.src.slice(0, 2048) : undefined,
      alt: typeof element.alt === 'string' ? element.alt.slice(0, 500) : undefined,
      offsetX: typeof element.offsetX === 'number' && Number.isFinite(element.offsetX) ? Math.max(-3000, Math.min(3000, Math.round(element.offsetX))) : 0,
      offsetY: typeof element.offsetY === 'number' && Number.isFinite(element.offsetY) ? Math.max(-3000, Math.min(3000, Math.round(element.offsetY))) : 0,
      width: typeof element.width === 'number' && Number.isFinite(element.width) ? Math.max(24, Math.min(4000, Math.round(element.width))) : undefined,
      height: typeof element.height === 'number' && Number.isFinite(element.height) ? Math.max(16, Math.min(4000, Math.round(element.height))) : undefined,
      fontSize: typeof element.fontSize === 'number' && Number.isFinite(element.fontSize) ? Math.max(8, Math.min(160, Math.round(element.fontSize))) : undefined,
      color: safeColor(element.color),
      backgroundColor: safeColor(element.backgroundColor),
      hidden: element.hidden === true,
    }];
  });
};

const normalizePageBuilderData = (
  value: unknown,
  legacyBlocks: PageBuilderBlock[],
  page: EditableLayoutPage,
  legacyLayout?: { order: string[]; hidden: string[] },
  explicitSections = false,
): PageBuilderData => {
  const nativeTypes = nativeSectionTypes(page);
  // Dados salvos antes das seções nativas não têm a marca; elas entram na ordem/visibilidade antigas.
  const finalize = (content: Data['content'], explicit: boolean): PageBuilderData => {
    const seen = new Set<string>();
    const unique = content.filter((item) => {
      if (!nativeTypes.includes(item.type)) return true;
      if (seen.has(item.type)) return false;
      seen.add(item.type);
      return true;
    });
    let result = unique;
    if (!explicit) {
      const hidden = legacyLayout?.hidden ?? [];
      const order = legacyLayout?.order ?? [];
      const missing = NATIVE_SECTIONS
        .filter((section) => section.page === page && !seen.has(section.type) && !hidden.includes(section.sectionId))
        .sort((a, b) => {
          const left = order.indexOf(a.sectionId);
          const right = order.indexOf(b.sectionId);
          return (left < 0 ? 999 : left) - (right < 0 ? 999 : right);
        })
        .map((section) => ({ type: section.type, props: { id: `native-${page}-${section.sectionId}` } }));
      result = [...missing, ...unique] as Data['content'];
    }
    return { root: { props: { nativeSections: true } }, content: result } as PageBuilderData;
  };

  if (value && typeof value === 'object' && Array.isArray((value as Partial<Data>).content)) {
    const data = value as PageBuilderData;
    const explicit = explicitSections || hasNativeSectionLayout(data);
    const safeColor = (input: unknown, fallback: string) =>
      typeof input === 'string' && (/^#[\da-f]{3,8}$/i.test(input) || input === 'transparent')
        ? input
        : fallback;
    const safeLink = (input: unknown) => {
      if (typeof input !== 'string') return '';
      const link = input.trim().slice(0, 2048);
      return /^(https?:|mailto:|tel:|\/|#)/i.test(link) ? link : '';
    };
    const safeNumber = (input: unknown, fallback: number, min: number, max: number) =>
      typeof input === 'number' && Number.isFinite(input)
        ? Math.max(min, Math.min(max, Math.round(input)))
        : fallback;
    const content: Data['content'] = [];
    for (const item of data.content) {
      if (!item || typeof item !== 'object' || !['Heading', 'Text', 'Image', 'Button', 'Spacer', ...nativeTypes].includes(item.type)) continue;
      const props = item.props;
      if (!props || typeof props !== 'object' || typeof props.id !== 'string') continue;
      const alignment = ['left', 'center', 'right'].includes(props.align) ? props.align : 'left';
      const width = ['full', 'threeQuarter', 'half', 'third'].includes(props.width) ? props.width : 'full';
      const id = props.id.slice(0, 100);
      if (!id) continue;
      if (nativeTypes.includes(item.type)) {
        content.push({ type: item.type, props: { id } } as Data['content'][number]);
      } else if (item.type === 'Heading' || item.type === 'Text') {
        content.push({
          type: item.type,
          props: {
            id,
            text: typeof props.text === 'string' ? props.text.slice(0, 5000) : '',
            color: safeColor(props.color, '#142344'),
            fontSize: safeNumber(props.fontSize, item.type === 'Heading' ? 36 : 16, 8, 120),
            align: alignment,
            width,
            backgroundColor: safeColor(props.backgroundColor, 'transparent'),
            padding: safeNumber(props.padding, 16, 0, 200),
          },
        });
      } else if (item.type === 'Image') {
        const src = safeLink(props.src);
        content.push({
          type: item.type,
          props: {
            id,
            src: src.slice(0, 2048),
            alt: typeof props.alt === 'string' ? props.alt.slice(0, 500) : '',
            width: safeNumber(props.width, 800, 24, 4000),
            height: safeNumber(props.height, 450, 16, 4000),
          },
        });
      } else if (item.type === 'Button') {
        content.push({
          type: item.type,
          props: {
            id,
            label: typeof props.label === 'string' ? props.label.slice(0, 500) : '',
            href: safeLink(props.href),
            backgroundColor: safeColor(props.backgroundColor, '#061748'),
            color: safeColor(props.color, '#ffffff'),
            align: alignment,
          },
        });
      } else {
        content.push({
          type: 'Spacer',
          props: { id, height: safeNumber(props.height, 48, 0, 1000) },
        });
      }
    }
    return finalize(content, explicit);
  }

  const content: Data['content'] = legacyBlocks.map((block) => {
    const shared = {
      id: block.id,
      align: block.align,
      backgroundColor: block.backgroundColor,
      color: block.textColor,
      width: block.width === 'half' ? 'half' : 'full',
      padding: 16,
    };
    if (block.type === 'heading') {
      return { type: 'Heading', props: { ...shared, text: block.content, fontSize: 36 } };
    }
    if (block.type === 'text') {
      return { type: 'Text', props: { ...shared, text: block.content, fontSize: 16 } };
    }
    if (block.type === 'image') {
      return { type: 'Image', props: { id: block.id, src: block.src, alt: block.content, width: 800, height: 450 } };
    }
    if (block.type === 'button') {
      return { type: 'Button', props: { id: block.id, label: block.content, href: block.url, backgroundColor: block.textColor, color: block.backgroundColor, align: block.align } };
    }
    return { type: 'Spacer', props: { id: block.id, height: block.height } };
  }) as Data['content'];
  return finalize(content, explicitSections);
};

const normalizedLegacyLayout = (saved: unknown): { order: string[]; hidden: string[] } | undefined => {
  if (!saved || typeof saved !== 'object') return undefined;
  const layout = saved as { order?: unknown; hidden?: unknown };
  return { order: normalizeStringList(layout.order), hidden: normalizeStringList(layout.hidden) };
};

const normalizePageEditorConfig = (value: unknown): PageEditorConfig => {
  const defaults = defaultPageEditorConfig();
  if (!value || typeof value !== 'object') return defaults;
  const parsed = value as Partial<PageEditorConfig>;
  const blocks = {
    home: normalizePageBuilderBlocks(parsed.blocks?.home),
    product: normalizePageBuilderBlocks(parsed.blocks?.product),
  };
  const puck = {
    home: normalizePageBuilderData(parsed.puck?.home, blocks.home, 'home', parsed.layouts?.home && normalizedLegacyLayout(parsed.layouts.home)),
    product: normalizePageBuilderData(parsed.puck?.product, blocks.product, 'product', parsed.layouts?.product && normalizedLegacyLayout(parsed.layouts.product)),
  };
  const visualElements = {
    home: normalizeVisualPageElements(parsed.visualElements?.home),
    product: normalizeVisualPageElements(parsed.visualElements?.product),
  };
  const layouts = { ...defaults.layouts };
  for (const page of ['home', 'product'] as const) {
    const saved = parsed.layouts?.[page];
    if (!saved || typeof saved !== 'object') continue;
    const validIds = [
      ...PAGE_EDITOR_SECTIONS[page].map(({ id }) => id),
      ...blocks[page].map(({ id }) => id),
    ];
    const requestedOrder = normalizeStringList(saved.order).filter((id) => validIds.includes(id));
    layouts[page] = {
      order: [...requestedOrder, ...validIds.filter((id) => !requestedOrder.includes(id))],
      hidden: normalizeStringList(saved.hidden).filter((id) => validIds.includes(id)),
    };
  }
  const filterOptions = { ...defaults.filterOptions };
  for (const { key } of EDITABLE_FILTERS) {
    const saved = parsed.filterOptions?.[key];
    if (!saved || typeof saved !== 'object') continue;
    filterOptions[key] = {
      added: normalizeStringList(saved.added),
      hidden: normalizeStringList(saved.hidden),
    };
  }
  return { layouts, blocks, puck, visualElements, filterOptions };
};

let data: StoredData = emptyData();

/* Configuração viva lida por Header e HeroCapa */
export const SITE_CONFIG: SiteConfig = clone(DEFAULT_CONFIG);

let version = 0;
const listeners = new Set<() => void>();
let remoteAdminAuthenticated = false;
let remoteSaveQueue: Promise<void> = Promise.resolve();

const notifyStoreChanged = () => {
  version++;
  listeners.forEach((listener) => listener());
};

const setStoreData = (next: unknown) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    data = load();
    apply();
    notifyStoreChanged();
  } catch (error) {
    console.error('Não foi possível atualizar os dados locais da loja.', error);
  }
};

const loadAdminStoreState = async () => {
  const response = await fetch('/api/admin/state', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Não foi possível carregar os dados do painel.');
  const result = await response.json() as { state: unknown | null };
  if (result.state) {
    setStoreData(result.state);
    return;
  }

  const saveResponse = await fetch('/api/admin/state', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (saveResponse.status === 403) return; // perfis sem acesso ao catálogo apenas leem os dados
  if (!saveResponse.ok) throw new Error('Não foi possível inicializar os dados da loja.');
};

const hydratePublicStoreState = async () => {
  try {
    const response = await fetch('/api/store/state');
    if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
    const result = await response.json() as { state: unknown | null };
    if (result.state) setStoreData(result.state);
  } catch (error) {
    console.error('Não foi possível carregar os dados públicos persistidos da loja.', error);
  }
};

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
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter(
            (tag: unknown): tag is ProductTag =>
              typeof tag === 'object' &&
              tag !== null &&
              typeof (tag as ProductTag).id === 'string' &&
              typeof (tag as ProductTag).name === 'string' &&
              typeof (tag as ProductTag).color === 'string',
          ).map((tag: ProductTag) => ({
            ...tag,
            assignedProductIds: Array.isArray(tag.assignedProductIds)
              ? tag.assignedProductIds.filter((id): id is string => typeof id === 'string')
              : [],
          }))
        : base.tags,
      discountPolicies: Array.isArray(parsed.discountPolicies)
        ? parsed.discountPolicies.filter(
            (policy: unknown): policy is DiscountPolicy =>
              typeof policy === 'object' &&
              policy !== null &&
              typeof (policy as DiscountPolicy).id === 'string' &&
              typeof (policy as DiscountPolicy).name === 'string' &&
              typeof (policy as DiscountPolicy).trigger === 'string' &&
              Array.isArray((policy as DiscountPolicy).productIds),
          ).map((policy: DiscountPolicy) => ({
            ...policy,
            productIds: policy.productIds.filter((id): id is string => typeof id === 'string'),
            allProducts: typeof policy.allProducts === 'boolean' ? policy.allProducts : policy.productIds.length === 0,
            channels: Array.isArray(policy.channels) ? policy.channels : [],
            progressionSteps: Array.isArray(policy.progressionSteps) ? policy.progressionSteps : [],
          }))
        : base.discountPolicies,
      coupons: parsed.coupons ?? null,
      pageEditor: normalizePageEditorConfig(parsed.pageEditor),
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
  notifyStoreChanged();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (remoteAdminAuthenticated) {
      const snapshot = clone(data);
      remoteSaveQueue = remoteSaveQueue.then(async () => {
        const response = await fetch('/api/admin/state', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
        });
        if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
      }).catch((error: unknown) => {
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
          remoteAdminAuthenticated = false;
        }
        window.dispatchEvent(new CustomEvent('site-admin-sync-error', {
          detail: error instanceof Error ? error.message : 'Falha ao sincronizar os dados do painel.',
        }));
      });
    }
    return true;
  } catch {
    return false;
  }
};

data = load();
apply();
void hydratePublicStoreState();

export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const useSiteData = () => useSyncExternalStore(subscribe, () => version);

export const getPageEditorConfig = (): PageEditorConfig => data.pageEditor;

export const getEditableFilterOptions = (key: EditableFilterKey, available: string[]): string[] => {
  const customization = data.pageEditor.filterOptions[key];
  return [
    ...available.filter((value) => !customization.hidden.includes(value)),
    ...customization.added.filter((value) => !available.includes(value)),
  ];
};

export const savePageEditorLayout = (
  page: EditableLayoutPage,
  order: string[],
  hidden: string[],
): boolean => {
  const validIds = [
    ...PAGE_EDITOR_SECTIONS[page].map(({ id }) => id),
    ...data.pageEditor.blocks[page].map(({ id }) => id),
  ];
  const normalizedOrder = [...new Set(order.filter((id) => validIds.includes(id)))];
  data.pageEditor.layouts[page] = {
    order: [...normalizedOrder, ...validIds.filter((id) => !normalizedOrder.includes(id))],
    hidden: [...new Set(hidden.filter((id) => validIds.includes(id)))],
  };
  return commit();
};

export const savePageEditorCanvas = (
  page: EditableLayoutPage,
  order: string[],
  hidden: string[],
  blocks: PageBuilderBlock[],
): boolean => {
  data.pageEditor.blocks[page] = normalizePageBuilderBlocks(blocks);
  const validIds = [
    ...PAGE_EDITOR_SECTIONS[page].map(({ id }) => id),
    ...data.pageEditor.blocks[page].map(({ id }) => id),
  ];
  const normalizedOrder = [...new Set(order.filter((id) => validIds.includes(id)))];
  data.pageEditor.layouts[page] = {
    order: [...normalizedOrder, ...validIds.filter((id) => !normalizedOrder.includes(id))],
    hidden: [...new Set(hidden.filter((id) => validIds.includes(id)))],
  };
  return commit();
};

export const savePageBuilderData = (page: EditableLayoutPage, pageData: PageBuilderData): boolean => {
  data.pageEditor.puck[page] = normalizePageBuilderData(pageData, [], page, undefined, true);
  return commit();
};

export const saveVisualPageElement = (
  page: EditableLayoutPage,
  element: VisualPageElement,
): boolean => {
  const normalized = normalizeVisualPageElements([element])[0];
  if (!normalized) return false;
  const current = data.pageEditor.visualElements[page];
  return saveVisualPageElements(page, current.some(({ id }) => id === normalized.id)
    ? current.map((item) => item.id === normalized.id ? normalized : item)
    : [...current, normalized]);
};

export const saveVisualPageElements = (
  page: EditableLayoutPage,
  elements: VisualPageElement[],
): boolean => {
  data.pageEditor.visualElements[page] = normalizeVisualPageElements(elements);
  return commit();
};

export const saveEditableFilterOptions = (
  key: EditableFilterKey,
  available: string[],
  selected: string[],
): boolean => {
  const availableSet = new Set(available);
  const selectedSet = new Set(selected);
  data.pageEditor.filterOptions[key] = {
    added: [...new Set(selected.filter((value) => !availableSet.has(value)))],
    hidden: [...new Set(available.filter((value) => !selectedSet.has(value)))],
  };
  return commit();
};

/* ---------- Políticas de desconto ---------- */

export const getDiscountPolicies = (): DiscountPolicy[] => data.discountPolicies;

export const saveDiscountPolicy = (policy: DiscountPolicy): boolean => {
  const exists = data.discountPolicies.some((item) => item.id === policy.id);
  data.discountPolicies = exists
    ? data.discountPolicies.map((item) => (item.id === policy.id ? clone(policy) : item))
    : [...data.discountPolicies, clone(policy)];
  return commit();
};

export const deleteDiscountPolicy = (id: string): boolean => {
  data.discountPolicies = data.discountPolicies.filter((policy) => policy.id !== id);
  return commit();
};

/* ---------- Tags ---------- */

export const getProductTags = (): ProductTag[] => data.tags;

export const createProductTag = (tag: ProductTag): boolean => {
  data.tags = [...data.tags, { ...tag, assignedProductIds: tag.assignedProductIds ?? [] }];
  return commit();
};

export const assignProductsToTag = (tagId: string, productIds: string[]): boolean => {
  data.tags = data.tags.map((tag) => (
    tag.id === tagId ? { ...tag, assignedProductIds: [...new Set(productIds)] } : tag
  ));
  return commit();
};

export const deleteProductTag = (id: string): boolean => {
  data.tags = data.tags.filter((tag) => tag.id !== id);
  return commit();
};

/* ---------- Produtos ---------- */

export const isCustomProduct = (id: string) => data.custom.some((p) => p.id === id);

const syncProductTags = (productId: string, tagIds: string[]) => {
  const selected = new Set(tagIds);
  data.tags = data.tags.map((tag) => {
    const assignedProductIds = tag.assignedProductIds ?? [];
    const hasProduct = assignedProductIds.includes(productId);
    const shouldHaveProduct = selected.has(tag.id);
    if (hasProduct === shouldHaveProduct) return tag;
    return {
      ...tag,
      assignedProductIds: shouldHaveProduct
        ? [...assignedProductIds, productId]
        : assignedProductIds.filter((id) => id !== productId),
    };
  });
};

export const saveProduct = (product: EyewearProduct, tagIds?: string[]): boolean => {
  if (isCustomProduct(product.id)) {
    data.custom = data.custom.map((p) => (p.id === product.id ? product : p));
  } else {
    data.overrides[product.id] = product;
  }
  if (tagIds) syncProductTags(product.id, tagIds);
  return commit();
};

export const createProduct = (product: EyewearProduct, tagIds?: string[]): boolean => {
  data.custom = [...data.custom, product];
  if (tagIds) syncProductTags(product.id, tagIds);
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

/* ---------- Acesso ao painel ---------- */

let currentAdmin: AdminUser | null = null;

export const getAdminUser = () => currentAdmin;

export const setAdminUserName = (name: string) => {
  if (currentAdmin) currentAdmin = { ...currentAdmin, name };
};

export const checkAdminSession = async (): Promise<boolean> => {
  const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Não foi possível verificar a sessão administrativa.');
  const result = await response.json() as { authenticated: boolean; user?: AdminUser };
  remoteAdminAuthenticated = result.authenticated;
  currentAdmin = result.authenticated ? result.user ?? null : null;
  if (remoteAdminAuthenticated) await loadAdminStoreState();
  return remoteAdminAuthenticated;
};

export const adminLogin = async (email: string, password: string): Promise<boolean> => {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 401) return false;
  if (!response.ok) throw new Error('Não foi possível entrar no painel administrativo.');
  const result = await response.json() as { user?: AdminUser };
  remoteAdminAuthenticated = true;
  currentAdmin = result.user ?? null;
  try {
    await loadAdminStoreState();
    return true;
  } catch (error) {
    remoteAdminAuthenticated = false;
    currentAdmin = null;
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    throw error;
  }
};

export const adminLogout = async () => {
  remoteAdminAuthenticated = false;
  currentAdmin = null;
  const response = await fetch('/api/admin/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Não foi possível encerrar a sessão administrativa.');
};

export const changeAdminPassword = async (currentPassword: string, next: string) => {
  const response = await fetch('/api/admin/password', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword: next }),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || 'Não foi possível alterar a senha.');
};

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

/* ---------- Catálogo via API de Integração ---------- */

let catalogCache: EyewearProduct[] | null = null;
let catalogLoading = false;
let catalogError = false;

const hydrateCatalogFromApi = async (): Promise<void> => {
  if (catalogCache || catalogLoading) return;
  catalogLoading = true;
  try {
    const products = await fetchProducts();
    catalogCache = products;
    // Mescla produtos da API com overrides/custom locais já persistidos
    const merged = [
      ...products.filter((p) => !data.removed.includes(p.id)).map((p) => data.overrides[p.id] ?? p),
      ...data.custom,
    ];
    CATALOG_PRODUCTS.splice(0, CATALOG_PRODUCTS.length, ...clone(merged));
    notifyStoreChanged();
  } catch {
    catalogError = true;
  } finally {
    catalogLoading = false;
  }
};

void hydrateCatalogFromApi();

export const useCatalogProducts = (): { products: EyewearProduct[]; loading: boolean; error: boolean } => {
  useSiteData();
  const [state, setState] = useState<{ products: EyewearProduct[]; loading: boolean; error: boolean }>({
    products: catalogCache ?? [],
    loading: !catalogCache && catalogLoading,
    error: catalogError,
  });

  useEffect(() => {
    if (catalogCache) {
      setState({ products: catalogCache, loading: false, error: false });
      return;
    }
    void hydrateCatalogFromApi().then(() => {
      setState({
        products: catalogCache ?? [],
        loading: false,
        error: catalogError,
      });
    });
  }, []);

  return state;
};
