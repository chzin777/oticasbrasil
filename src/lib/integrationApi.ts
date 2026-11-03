import type { EyewearProduct } from '../types';

const API_BASE = '/api/integration';

interface OracleProduct {
  CATEGORIA: string;
  SUBCATEGORIA: string;
  MARCA: string;
  SKU: string;
  PRODUTO: string;
  LOJA: string;
  UNEM_NOME: string;
  PRC_VENDA_ATUAL: number;
  CUSTO_ULT_ENT: number;
  CUSTO_MD: number;
  MARKUP: number;
  MARKUP_CAD: number;
  QTDE_EST: number;
  QTDE_EST_DISP: number;
  UNIDADE_EMPRESARIAL_ID: string;
  SUBCATEGORIA_PRODUTO_ID: string;
  RN: number;
}

interface ProductsResponse {
  data: OracleProduct[];
  limit: number;
  offset: number;
}

function mapCategory(categoria: string): EyewearProduct['category'] {
  const cat = categoria.toUpperCase().trim();
  if (cat.includes('SOL') || cat.includes('OCULOS DE SOL')) return 'oculos-de-sol';
  if (cat.includes('LENTE')) return 'lentes-de-grau';
  if (cat.includes('RAYBAN META') || cat.includes('META')) return 'rayban-meta';
  return 'armacoes';
}

function extractColorFromName(produto: string): { name: string; hex: string } {
  const match = produto.match(/(\d{4,})\s*$/);
  const colorCode = match ? match[1] : '';
  return {
    name: colorCode || 'Padrão',
    hex: '#333333',
  };
}

function resolveProductImage(sku: string, brand: string, produto: string): string {
  const cleanBrand = brand.trim().replace(/\s+/g, '+');
  // Extrai referência do modelo (ex: "GU2876_54052", "GM50032")
  const refMatch = produto.match(/REF[-_\s]*([A-Z0-9][-_A-Z0-9]+)/i);
  const modelCode = refMatch ? refMatch[1].replace(/_/g, '-') : '';

  // Estratégia 1: Busca por Marca + Modelo no Unsplash (mais provável de achar óculos reais)
  if (modelCode) {
    return `https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80`;
    // Nota: Unsplash não suporta busca dinâmica via URL pública de forma confiável sem API key.
    // Usaremos um placeholder estilizado com a marca/modelo como fallback visual elegante.
  }

  // Estratégia 2: Placeholder visualmente rico com Brand + SKU
  const bg = encodeURIComponent('1e293b'); // Slate 800
  const fg = encodeURIComponent('f8fafc'); // Slate 50
  const text = encodeURIComponent(`${brand}\n${sku}`);
  return `https://placehold.co/600x600/${bg}/${fg}?text=${text}&font=montserrat`;
}

function mapOracleToEyewear(item: OracleProduct): EyewearProduct {
  const colorInfo = extractColorFromName(item.PRODUTO);
  const category = mapCategory(item.CATEGORIA);
  const sku = item.SKU.trim();
  const brand = item.MARCA.trim();
  const imageUrl = resolveProductImage(sku, brand, item.PRODUTO);

  return {
    id: sku,
    sku,
    name: item.PRODUTO.trim(),
    category,
    subcategory: item.SUBCATEGORIA?.trim() || undefined,
    brand,
    price: Number(item.PRC_VENDA_ATUAL) || 0,
    cost: Number(item.CUSTO_ULT_ENT) || undefined,
    stock: Number(item.QTDE_EST_DISP) || 0,
    originalPrice: undefined,
    rating: 0,
    reviewCount: 0,
    active: true,
    image: imageUrl,
    gallery: [imageUrl],
    colorName: colorInfo.name,
    colorHex: colorInfo.hex,
    availableColors: [{ name: colorInfo.name, hex: colorInfo.hex }],
    material: 'N/A',
    shape: 'N/A',
    calibre: 'N/A',
    availableCalibres: [],
    description: `${item.PRODUTO.trim()} - ${brand}`,
    specs: {
      lensWidth: 'N/A',
      bridgeWidth: 'N/A',
      templeLength: 'N/A',
      weight: 'N/A',
      hingeType: 'N/A',
      origin: 'Brasil',
    },
  };
}

export async function fetchProducts(): Promise<EyewearProduct[]> {
  const PAGE_SIZE = 500;
  const MAX_CONCURRENT = 4;

  try {
    // Busca primeira página para determinar se há dados
    const firstParams = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' });
    const firstCtrl = new AbortController();
    const firstTimeout = setTimeout(() => firstCtrl.abort(), 15000);
    const firstRes = await fetch(`${API_BASE}/products?${firstParams.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: firstCtrl.signal,
    });
    clearTimeout(firstTimeout);

    if (!firstRes.ok) throw new Error(`API error: ${firstRes.status}`);
    const firstJson: ProductsResponse = await firstRes.json();
    const firstItems = firstJson.data ?? [];
    if (firstItems.length === 0) return [];

    const allProducts = firstItems.map(mapOracleToEyewear);

    // Se a primeira página já retornou menos que PAGE_SIZE, não há mais páginas
    if (firstItems.length < PAGE_SIZE) return allProducts;

    // Busca páginas restantes em paralelo (lotes de MAX_CONCURRENT)
    const remainingPages: number[] = [];
    for (let page = 1; page < 50; page++) {
      remainingPages.push(page);
    }

    for (let i = 0; i < remainingPages.length; i += MAX_CONCURRENT) {
      const batch = remainingPages.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        batch.map(async (page) => {
          const offset = page * PAGE_SIZE;
          const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 15000);
          const res = await fetch(`${API_BASE}/products?${params.toString()}`, {
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
          });
          clearTimeout(tid);
          if (!res.ok) return [];
          const json: ProductsResponse = await res.json();
          return json.data ?? [];
        })
      );

      let hasMore = false;
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allProducts.push(...result.value.map(mapOracleToEyewear));
          if (result.value.length >= PAGE_SIZE) hasMore = true;
        }
      }
      if (!hasMore) break;
    }

    return allProducts;
  } catch (error) {
    console.error('[integrationApi] Falha ao buscar produtos da API:', error);
    return [];
  }
}

export async function fetchProductBySku(sku: string): Promise<EyewearProduct | null> {
  try {
    const products = await fetchProducts();
    return products.find((p) => p.id === sku) || null;
  } catch {
    return null;
  }
}