import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AVAILABLE_COUPONS, CATALOG_PRODUCTS } from '../src/data/mockData';

const outputPath = resolve('server/catalog-seed.json');
await writeFile(outputPath, JSON.stringify({
  products: CATALOG_PRODUCTS,
  coupons: AVAILABLE_COUPONS,
}), 'utf8');
