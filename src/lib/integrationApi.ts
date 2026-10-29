import type { EyewearProduct } from '../types';
import { CATALOG_PRODUCTS } from '../data/mockData';

const API_URL = import.meta.env.VITE_INTEGRATION_API_URL || 'http://172.30.20.15:4000';
const API_KEY = import.meta.env.VITE_INTEGRATION_API_KEY || 'otk_int_9f3a7c2e1b8d4f6a0c5e2d9b7a1f4e8c3d6b0a5f2e9c7d1b4a8f6e3c0d5b2a9';

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

function mapOracleToEyewear(item: OracleProduct): EyewearProduct {
  const colorInfo = extractColorFromName(item.PRODUTO);
  const category = mapCategory(item.CATEGORIA);
  const sku = item.SKU.trim();

  return {
    id: sku,
    name: item.PRODUTO.trim(),
    category,
    brand: item.MARCA.trim(),
    price: Number(item.PRC_VENDA_ATUAL) || 0,
    originalPrice: undefined,
    rating: 0,
    reviewCount: 0,
    image: `https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(sku)}`,
    gallery: [`https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(sku)}`],
    colorName: colorInfo.name,
    colorHex: colorInfo.hex,
    availableColors: [{ name: colorInfo.name, hex: colorInfo.hex }],
    material: 'N/A',
    shape: 'N/A',
    calibre: 'N/A',
    availableCalibres: [],
    description: `${item.PRODUTO.trim()} - ${item.MARCA.trim()}`,
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
  try {
    const response = await fetch(`${API_URL}/v1/products`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json: ProductsResponse = await response.json();
    return json.data.map(mapOracleToEyewear);
  } catch (error) {
    console.warn('[integrationApi] Falha ao buscar produtos da API, usando fallback mock:', error);
    return CATALOG_PRODUCTS;
  }
}

export async function fetchProductBySku(sku: string): Promise<EyewearProduct | null> {
  try {
    const products = await fetchProducts();
    return products.find((p) => p.id === sku) || null;
  } catch {
    return CATALOG_PRODUCTS.find((p) => p.id === sku) || null;
  }
}