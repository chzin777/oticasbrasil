import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import pg from 'pg';
import { createClient } from 'redis';
import { Resend } from 'resend';
import { registerAdminRoutes, loadPoliciesWithProducts } from './admin.js';
import { loadSettings } from './settings.js';
import {
  enqueueIntegrationEvent,
  enqueueHistoricalSync,
  integrationConfigured,
  integrationSecretMatches,
  startIntegrationWorker,
  validateIntegrationConfig,
} from './integration.js';

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 3000);
const sessionCookieName = 'oticas_session';
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;
const isCookieSecure = process.env.COOKIE_SECURE === 'true';
const accessoryProduct = {
  id: 'accessory-zeiss-lens-care',
  name: 'Kit Zeiss Lens Care',
  category: 'acessorios',
  price: 39,
  image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
};

if (!process.env.DATABASE_URL || !process.env.MIGRATION_DATABASE_URL) {
  throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL são obrigatórias.');
}
if (!process.env.REDIS_PASSWORD) {
  throw new Error('REDIS_PASSWORD é obrigatória.');
}
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error('Configure ADMIN_EMAIL e uma ADMIN_PASSWORD com pelo menos 12 caracteres.');
}
validateIntegrationConfig();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const migrationPool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL, max: 2 });
const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on('error', (error) => {
  console.error('Falha na conexão Redis:', error.message);
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

const jsonError = (res, status, message) => res.status(status).json({ error: message });
const hashPassword = async (password) => {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
};

const verifyPassword = async (password, storedHash) => {
  const [saltHex, keyHex] = String(storedHash).split(':');
  if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(keyHex)) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const cookieOptions = (maxAge) => [
  `${sessionCookieName}=`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  ...(isCookieSecure ? ['Secure'] : []),
  ...(maxAge === undefined ? [] : [`Max-Age=${maxAge}`]),
].join('; ');

const readSessionToken = (req) => {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));
  return cookie?.slice(sessionCookieName.length + 1) || '';
};

const getSession = async (req) => {
  const token = readSessionToken(req);
  if (!token) return null;
  const raw = await redis.get(`session:${token}`);
  if (!raw) return null;
  return { token, ...JSON.parse(raw) };
};

const createSession = async (res, user) => {
  const token = randomBytes(32).toString('hex');
  await redis.set(`session:${token}`, JSON.stringify(user), { EX: sessionLifetimeSeconds });
  res.setHeader('Set-Cookie', cookieOptions(sessionLifetimeSeconds).replace(`${sessionCookieName}=`, `${sessionCookieName}=${token}`));
};

const destroySession = async (req, res) => {
  const token = readSessionToken(req);
  if (token) await redis.del(`session:${token}`);
  res.setHeader('Set-Cookie', cookieOptions(0));
};

const requireCustomer = async (req, res, next) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'customer') return jsonError(res, 401, 'Entre na sua conta para continuar.');
    const { rows } = await pool.query('SELECT blocked FROM customers WHERE id = $1', [session.id]);
    if (!rows[0] || rows[0].blocked) {
      await destroySession(req, res);
      return jsonError(res, 401, 'Sua conta não está disponível. Entre em contato com a loja.');
    }
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

const requireSameOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) return jsonError(res, 403, 'Origem da solicitação inválida.');
    } catch {
      return jsonError(res, 403, 'Origem da solicitação inválida.');
    }
  }
  next();
};

const limitAttempts = async (req, res, next) => {
  try {
    const identity = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
    const address = String(req.ip || 'unknown').replace(/[^a-z0-9:._-]/gi, '').slice(0, 64);
    const key = `login-attempts:${address}:${identity}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) await redis.expire(key, 600);
    if (attempts > 12) return jsonError(res, 429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    req.resetLoginAttempts = () => redis.del(key);
    next();
  } catch (error) {
    next(error);
  }
};

const readSeed = async () => {
  const raw = await readFile(path.join(root, 'server', 'catalog-seed.json'), 'utf8');
  const seed = JSON.parse(raw);
  if (!Array.isArray(seed.products) || !seed.coupons || typeof seed.coupons !== 'object') {
    throw new Error('O catálogo inicial está inválido.');
  }
  return seed;
};

let seed;
let seedProducts;
let seedCoupons;

const loadStoreState = async () => {
  const { rows } = await pool.query('SELECT data FROM store_state WHERE id = 1');
  return rows[0]?.data ?? null;
};

const currentProducts = (state) => {
  const removed = new Set(Array.isArray(state?.removed) ? state.removed : []);
  const overrides = state?.overrides && typeof state.overrides === 'object' ? state.overrides : {};
  const custom = Array.isArray(state?.custom) ? state.custom : [];
  return [
    ...seedProducts
      .filter((product) => !removed.has(product.id))
      .map((product) => overrides[product.id] || product),
    ...custom,
    accessoryProduct,
  ];
};

const normalizeCouponCode = (value) => String(value || '').trim().toUpperCase().slice(0, 40);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

const enqueueCustomer = (queryable, customer) => enqueueIntegrationEvent(queryable, 'customer.upsert', {
  customerId: customer.id,
  sourceUpdatedAt: customer.updated_at,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  cpf: customer.cpf,
  address: customer.address || {},
});

const enqueueOrder = async (queryable, orderId) => {
  if (!integrationConfigured) return;
  const { rows } = await queryable.query(
    `SELECT o.id, o.customer_id, o.status, o.payment_status, o.payment_method, o.delivery_method,
            o.address, o.subtotal, o.discount, o.total, o.coupon_code, o.tracking_code, o.created_at, o.updated_at,
            c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.cpf AS customer_cpf,
            c.address AS customer_address, c.updated_at AS customer_updated_at,
            COALESCE(json_agg(json_build_object(
              'productId', i.product_id,
              'product', json_build_object(
                'name', i.product_snapshot->>'name',
                'image', CASE WHEN i.product_snapshot->>'image' LIKE 'data:%' THEN '' ELSE i.product_snapshot->>'image' END,
                'category', i.product_snapshot->>'category',
                'selectedOptions', COALESCE(i.product_snapshot->'selectedOptions', '{}'::json)
              ),
              'quantity', i.quantity,
              'unitPrice', i.unit_price
            )) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     LEFT JOIN order_items i ON i.order_id = o.id
     WHERE o.id = $1
     GROUP BY o.id, c.name, c.email, c.phone, c.cpf, c.address, c.updated_at`,
    [orderId],
  );
  const order = rows[0];
  if (!order) throw new Error('Pedido não encontrado para sincronização.');
  await enqueueIntegrationEvent(queryable, 'order.upsert', {
    order: {
      id: order.id,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      deliveryMethod: order.delivery_method,
      address: order.address,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      couponCode: order.coupon_code,
      trackingCode: order.tracking_code,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: order.items,
    },
    customer: {
      customerId: order.customer_id,
      sourceUpdatedAt: order.customer_updated_at,
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      cpf: order.customer_cpf,
      address: order.customer_address || {},
    },
  });
};

app.get('/api/health', async (_req, res, next) => {
  try {
    await Promise.all([pool.query('SELECT 1'), redis.ping()]);
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/store/state', async (_req, res, next) => {
  try {
    res.json({ state: await loadStoreState() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/store/settings', async (_req, res, next) => {
  try {
    res.json({ settings: await loadSettings(pool) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/store/products', async (_req, res, next) => {
  try {
    const state = await loadStoreState();
    res.json({ products: currentProducts(state) });
  } catch (error) {
    next(error);
  }
});

/* ---------- Dados Promocionais Públicos (Tags + Políticas Ativas) ---------- */

app.get('/api/store/promotions', async (_req, res, next) => {
  try {
    const [tagsResult, policiesResult] = await Promise.all([
      pool.query(
        `SELECT t.id::text, t.name, t.color,
                COALESCE((SELECT json_agg(product_id) FROM (SELECT DISTINCT a2.product_id FROM product_tag_assignments a2 WHERE a2.tag_id = t.id) sub_a), '[]'::json) AS assigned_product_ids,
                COALESCE((SELECT json_agg(rule_obj) FROM (SELECT DISTINCT json_build_object('attribute', r2.attribute, 'value', r2.value)::text AS rule_obj FROM product_tag_rules r2 WHERE r2.tag_id = t.id) sub_r), '[]'::json) AS rules
         FROM product_tags t
         ORDER BY t.created_at DESC`,
      ),
      pool.query(
        `SELECT p.id::text, p.name, p.trigger_type, p.discount_type, p.discount_value, p.all_products,
                p.value_operator, p.min_cart_value, p.max_cart_value,
                p.quantity_operator, p.min_items, p.max_items,
                p.progression_steps,
                COALESCE((SELECT json_agg(product_id) FROM (SELECT DISTINCT dp2.product_id FROM discount_policy_products dp2 WHERE dp2.policy_id = p.id) sub_dp), '[]'::json) AS product_ids
         FROM discount_policies p
         WHERE p.active = TRUE
           AND (p.duration_value IS NULL OR p.created_at + (p.duration_value || ' ' || p.duration_unit)::interval > NOW())
         ORDER BY p.created_at DESC`,
      ),
    ]);

    const tags = tagsResult.rows.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      assignedProductIds: t.assigned_product_ids || [],
      rules: (t.rules || []).map((r) => ({ attribute: r.attribute, value: r.value })),
    }));

    const policies = policiesResult.rows.map((p) => ({
      id: p.id,
      name: p.name,
      trigger: p.trigger_type,
      discountType: p.discount_type,
      discountValue: Number(p.discount_value),
      allProducts: p.all_products,
      valueOperator: p.value_operator,
      minCartValue: p.min_cart_value ? Number(p.min_cart_value) : null,
      maxCartValue: p.max_cart_value ? Number(p.max_cart_value) : null,
      quantityOperator: p.quantity_operator,
      minItems: p.min_items,
      maxItems: p.max_items,
      progressionSteps: p.progression_steps || [],
      productIds: p.product_ids || [],
    }));

    res.json({ tags, policies });
  } catch (error) {
    next(error);
  }
});

const INTEGRATION_API_URL = process.env.INTEGRATION_API_URL || 'http://oticas-integration-api:4000';
const INTEGRATION_API_KEY = process.env.INTEGRATION_API_KEY || '';

const PRODUCTS_CACHE_TTL_SECONDS = 300; // 5 minutos

app.get('/api/integration/products', async (req, res, next) => {
  if (!INTEGRATION_API_KEY) return jsonError(res, 503, 'Chave da API de integração não configurada.');
  try {
    const limit = String(req.query.limit || '1000');
    const offset = String(req.query.offset || '0');
    const cacheKey = `integration:products:v2:${limit}:${offset}`;

    // Tenta servir do cache Redis primeiro
    let cached = null;
    try {
      const raw = await redis.get(cacheKey);
      if (raw) cached = JSON.parse(raw);
    } catch (cacheErr) {
      console.warn('[products-cache] Falha ao ler cache Redis:', cacheErr.message);
    }

    if (cached && typeof cached === 'object') {
      return res.json(cached);
    }

    // Cache miss: busca na API externa
    const url = new URL('/v1/products', INTEGRATION_API_URL);
    url.searchParams.set('limit', limit);
    url.searchParams.set('offset', offset);
    const response = await fetch(url.toString(), {
      headers: { 'x-api-key': INTEGRATION_API_KEY },
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`API respondeu HTTP ${response.status}`);
    const data = await response.json();

    // Popula cache para próximas requisições
    try {
      await redis.set(cacheKey, JSON.stringify(data), { EX: PRODUCTS_CACHE_TTL_SECONDS });
    } catch (cacheErr) {
      console.warn('[products-cache] Falha ao escrever cache Redis:', cacheErr.message);
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

/* Rota otimizada: retorna TODOS os produtos de uma vez, com cache Redis do catálogo completo */
const ALL_PRODUCTS_CACHE_KEY = 'integration:products:all:v4';
const ALL_PRODUCTS_CACHE_TTL = 600; // 10 minutos
const INTERNAL_PAGE_SIZE = 500;

app.get('/api/integration/products/all', async (req, res, next) => {
  if (!INTEGRATION_API_KEY) return jsonError(res, 503, 'Chave da API de integração não configurada.');
  try {
    // Tenta servir do cache Redis primeiro
    let cached = null;
    try {
      const raw = await redis.get(ALL_PRODUCTS_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (cacheErr) {
      console.warn('[products-all-cache] Falha ao ler cache Redis:', cacheErr.message);
    }

    if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
      return res.json(cached);
    }

    // Cache miss: busca primeira página para validar conectividade, depois lotes paralelos controlados
    const allItems = [];
    const BATCH_SIZE = 3; // 3 páginas paralelas por lote (API externa degrada sob alta concorrência)
    const MAX_PAGES = 20; // Safety cap: 10k produtos

    // Primeira página obrigatória (valida auth e conectividade)
    const firstUrl = new URL('/v1/products', INTEGRATION_API_URL);
    firstUrl.searchParams.set('limit', String(INTERNAL_PAGE_SIZE));
    firstUrl.searchParams.set('offset', '0');
    const firstRes = await fetch(firstUrl.toString(), {
      headers: { 'x-api-key': INTEGRATION_API_KEY },
      signal: AbortSignal.timeout(45000),
    });
    if (!firstRes.ok) throw new Error(`API respondeu HTTP ${firstRes.status} na primeira página`);
    const firstJson = await firstRes.json();
    const firstItems = firstJson.data ?? [];
    allItems.push(...firstItems);

    // Páginas restantes em lotes paralelos controlados
    if (firstItems.length >= INTERNAL_PAGE_SIZE) {
      for (let batchStart = 1; batchStart < MAX_PAGES; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, MAX_PAGES);
        const batchPromises = [];
        for (let page = batchStart; page < batchEnd; page++) {
          const offset = page * INTERNAL_PAGE_SIZE;
          const url = new URL('/v1/products', INTEGRATION_API_URL);
          url.searchParams.set('limit', String(INTERNAL_PAGE_SIZE));
          url.searchParams.set('offset', String(offset));
          batchPromises.push(
            fetch(url.toString(), {
              headers: { 'x-api-key': INTEGRATION_API_KEY },
              signal: AbortSignal.timeout(45000),
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((j) => j?.data ?? [])
              .catch((err) => {
                console.error(`[products-all] Página ${page} falhou:`, err.message);
                return [];
              })
          );
        }
        const batchResults = await Promise.all(batchPromises);
        let batchComplete = true;
        for (const items of batchResults) {
          allItems.push(...items);
          if (items.length < INTERNAL_PAGE_SIZE) {
            batchComplete = false;
            break;
          }
        }
        if (!batchComplete) break;
      }
    }

    const result = { data: allItems, total: allItems.length };

    // Cacheia resultado completo
    try {
      await redis.set(ALL_PRODUCTS_CACHE_KEY, JSON.stringify(result), { EX: ALL_PRODUCTS_CACHE_TTL });
    } catch (cacheErr) {
      console.warn('[products-all-cache] Falha ao escrever cache Redis:', cacheErr.message);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/crm/events', async (req, res, next) => {
  if (!integrationSecretMatches(req.get('authorization'))) {
    return jsonError(res, integrationConfigured ? 401 : 503, 'Integração não autenticada ou não configurada.');
  }
  const { eventId, type, data } = req.body || {};
  if (!UUID.test(String(eventId)) || !data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonError(res, 400, 'Evento de integração inválido.');
  }
  if (!['contact.upsert', 'promotion.upsert'].includes(type)) {
    return jsonError(res, 400, 'Tipo de evento de integração não suportado.');
  }

  const client = await pool.connect().catch(next);
  if (!client) return;
  try {
    await client.query('BEGIN');
    const { rows: received } = await client.query(
      `INSERT INTO integration_inbox (event_id) VALUES ($1)
       ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [eventId],
    );
    if (!received[0]) {
      await client.query('COMMIT');
      return res.json({ accepted: true, duplicate: true });
    }

    if (type === 'contact.upsert') {
      const customerId = String(data.customerId || '');
      const name = typeof data.name === 'string' ? data.name.trim().slice(0, 160) : '';
      const email = typeof data.email === 'string' ? data.email.trim().toLowerCase().slice(0, 254) : '';
      const phone = typeof data.phone === 'string' ? data.phone.trim().slice(0, 40) : '';
      const sourceUpdatedAt = data.sourceUpdatedAt;
      const address = data.address && typeof data.address === 'object' && !Array.isArray(data.address)
        ? data.address
        : {};
      if (!UUID.test(customerId) || name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validDate(sourceUpdatedAt)) {
        await client.query('ROLLBACK');
        return jsonError(res, 400, 'Dados de contato do CRM inválidos.');
      }
      const { rows } = await client.query(
        `UPDATE customers
         SET name = $1, email = $2, phone = $3,
             address = jsonb_set(
               CASE WHEN $4 <> '' THEN jsonb_set(address, '{city}', to_jsonb($4::text), true) ELSE address END,
               '{state}',
               CASE WHEN $5 <> '' THEN to_jsonb($5::text) ELSE COALESCE(address->'state', '""'::jsonb) END,
               true
             ),
             updated_at = $6
         WHERE id = $7 AND updated_at <= $6
         RETURNING id`,
        [
          name,
          email,
          phone || null,
          String(address.city || '').slice(0, 120),
          String(address.state || '').slice(0, 2).toUpperCase(),
          new Date(sourceUpdatedAt),
          customerId,
        ],
      );
      if (!rows[0]) {
        const { rows: existing } = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
        if (!existing[0]) {
          await client.query('ROLLBACK');
          return jsonError(res, 404, 'A conta correspondente não existe na loja.');
        }
      }
    } else {
      const code = normalizeCouponCode(data.code);
      const campaignId = typeof data.campaignId === 'string' ? data.campaignId.trim().slice(0, 120) : '';
      const discountPercent = Number(data.discountPercent);
      const discountAmount = Number(data.discountAmount);
      const hasPercent = Number.isFinite(discountPercent) && discountPercent > 0;
      const hasAmount = Number.isFinite(discountAmount) && discountAmount > 0;
      const minSubtotal = data.minSubtotal === undefined ? undefined : Number(data.minSubtotal);
      const active = data.active === true;
      const expiresAt = data.expiresAt ? String(data.expiresAt).slice(0, 10) : undefined;
      if (
        !/^[A-Z0-9_-]{3,40}$/.test(code) ||
        !campaignId ||
        hasPercent === hasAmount ||
        (hasPercent && discountPercent > 100) ||
        (hasAmount && discountAmount > 100000) ||
        (minSubtotal !== undefined && (!Number.isFinite(minSubtotal) || minSubtotal < 0)) ||
        (expiresAt && !validDate(expiresAt))
      ) {
        await client.query('ROLLBACK');
        return jsonError(res, 400, 'A promoção enviada pelo CRM é inválida.');
      }
      const { rows } = await client.query('SELECT data FROM store_state WHERE id = 1 FOR UPDATE');
      const state = rows[0]?.data || {};
      const coupons = { ...(state.coupons || seedCoupons) };
      const existingCoupon = coupons[code];
      if (existingCoupon && existingCoupon.crmCampaignId !== campaignId) {
        await client.query('ROLLBACK');
        return jsonError(res, 409, 'Este código já está em uso por outro cupom da loja.');
      }
      coupons[code] = {
        ...(hasPercent ? { discountPercent } : { discountAmount }),
        desc: String(data.description || `Promoção ${code}`).trim().slice(0, 120),
        active,
        crmCampaignId: campaignId,
        ...(minSubtotal === undefined ? {} : { minSubtotal }),
        ...(expiresAt ? { expiresAt } : {}),
      };
      await client.query(
        `INSERT INTO store_state (id, data, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify({ ...state, coupons })],
      );
    }

    await client.query('COMMIT');
    res.json({ accepted: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error?.code === '23505') return jsonError(res, 409, 'O e-mail já está associado a outra conta da loja.');
    next(error);
  } finally {
    client.release();
  }
});

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_TTL_MS = 10 * 60 * 1000;

const sendOtpEmail = async (email, code) => {
  if (!resend) {
    console.warn('RESEND_API_KEY não configurada; OTP não enviado para', email);
    return;
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Óticas Brasil <no-reply@oticasbrasil.com.br>',
      to: email,
      subject: 'Seu código de verificação - Óticas Brasil',
      html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f7f9fb;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fb;padding:40px 16px;"><tr><td align="center"><table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(5,22,71,0.08);"><tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f0f1f5;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABFgAAAB6CAYAAACLKOeLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAEieSURBVHhe7d13eNRWuj/wrb+7e+/du3dvdpf0ZNNoIYQ0IA1SFhIS0guEVBJSIITeCb2HGjoEAqH30HsvxoCpBndjgws2uIBtwJTn/Z13/DjxaL5jSzOaIun945MnyDqvdI6ORqN3pHN+Q0RCCCGEEEIIIYQQwg9woRBCCCGEEEIIIYTQDy4UQgghhBDCaQ4cTqHd+xLV/+K/CyGEEOWBC4UQQgghhHCKvQeS6dnXhtP/3Pk1DRmzRi3C6wkhhBDlgQuFEEIIIYSwu4wz+dSi7UxXYqXU0O/Xqj/h9YUQQojywIVCCCGEEELY1ZHo0/RJ6x/dEiul5AkWIYQQvoILhRBCCCGEsJudEfH02gfjYGKllDzBIoQQwldwoRBCCCGEEHaRejqHXv9wPEyoaEmCRQghhK/gQiGEEEIIIazuXG4Bde23BCZSvJEEixBCCF/BhUIIIYQQQlhVWkYuteu5gCpVbQ+TKOWRBIsQQghfwYVCCCGEEEJYVfNv8AC2ekiCRQghhK/gQiGEEEIIIaxKEixCCCFCAS4UQgghhBDCqiTBIoQQIhTgQiGEEEIIIaxKEixCCGFPXfouIl9ln7ugQuC4ZoELhRBCCCGEsCpJsAghhD399Y5W5Ku4xDMqBI5rFrhQhK+LxfGUW7CGMnLGUNKZ1nT8VCM6crI2HUyqTvsT7qC9cTfQnpg/0a4Tv6GI2L/SvvhbKCqxMh1OfpiOpTxD8ekf0emzA+js+QVUcCmKrl0vUGHxtoQQQgghrEgSLEIIYU8ocaKXJFjEb4qvplFm7kQ6fuol2hPzZ1fixGyHkmtSSnYPunAxQm0S74cQQgghhFVIgkUIIewJJU70kgSLQ124uIdSsru7Eh8oIRJIkXH/oPj0D+ns+YV07fp5tTt4H4UQQgghwpUkWIQQwp5Q4kQvSbBYWF5+EcUn6T+AxVczKT1nlOtVHpT4CAVOtvBrSAUX96ldxPsthB3tiUyEH8rIqbQcVQTHEUIIERqSYBFCCHtC38f1kgSLBZzJPk9bd8bSuKmbqWXHWfTsK8OoUuW2VPOp3hSxL1Gtgsuxa9cLKSt/BkWnPk+7TvzOI8ERTqISq9DpswPp0pVkteu4PkLYhSRYhBDC2iTBIoQQwbMzIp58pY1VEfR9XC9JsISZw8dO0dzFe6l7/yX02vtj6Y4HOsED17XvYrU6jlHqfNFOik79N0xmhLP9CbdRRu44VQVcLyHsQBIsQghhbZJgEUKI4OCpj9F3ZL208SqCYuglCZYQizqcQiPGr6eXm4yBB0jrtvs70oatx1VRHI/lFW6goylPw+SFleyLv5HScoYTP4WjraMQVicJFiGEsDZJsAghRHBIgsUdXOhUp9Nz6YdZO+iDL6e6kiXooHjz5IuDKeXUORUGx750JYliTr8BkxVWxq8O5RbIFxFhL5JgEUIIa5MEixBCBIckWNzBhU6SnHKWho9bR/UbD4UHQY+vOsxSoXD8a9cv0MmszrQn5j9ggsIujp96gS4Wx6gq43YQwkokwSKEENYmCRYhhAgOSbC4gwvt7kj0aRo0chXVbTgQNrwRE6ZtUSHxdgouHaADiXfDhIQd7Y75I6XnjFRVx+0hhFXYJcHC+8ZjQumhLSuEEFYmCRYhhAgOSbC4gwvtKCE5iwaPWk2PPdcfNrZRt1bvQNt3x6nQeHvpOSNcCQeUiLC76NQGdOVq4DuvEIFilwTLvoPJcJ8RbVkhhLAySbAIIURwSILFHVxoF2kZua7Xf55qNBg2sK9urtaeDhxOUZvw3CYnFjjBgBIPThIZX4l4piRt+whhBZJgEUIIa5MEixBCBIckWNzBhVa3duNReueTibBR/VXpvra0OzJBbcZzu5eKE1zTGKOEgzP9ljJzJ6im8WwrIcKZJFiEEMLaJMEihBDBIQkWd3ChFWVm5dOQ0WuoWp2esDHNsmn7CbU5z+0XXT5KkfH/BEkGcfrcYNVEnm0mRLiSBIsQQlibJFiEECI4JMHiDi60kqST2a5ZfFADmm3ZqoNqk577UHAxkvbG/S9MLogSKVldVVN5tp0Q4UgSLEIIYW2SYBFCiOCQBIs7uNAKjsek08etpsGGC4RxUzerzXruR37RFoqI/S+YVBDuEjO/Uk3m2YbCvoqKiikjM494kOnomDTaf+gk7dobT5FRyXTsRJpreeaZfLUqLh8qkmARQghrkwSLEEIEhyRY3MGF4Yxv0pp8Ngk2WKB06bNIbdpzXwou7qOI2L/AZILAUrK6qKbzbEthfekZeTRrwR5q0WaGawp0HgwanU/eVKndg/iJNG3cUJAEixBCWJskWIQQIjgkweIOLgxHWWcvUMuOwXkVqKx/vz5cbd5zfy5dSaK9cTfAJIIoX3rOKNWEnm0qrCdiXyJ177+EHqrfB54/RvFTLdpthIIkWIQQwtokwSKEEMEhCRZ3cGG4GTxqNd1UtR1spED614OdiRM72v0pvppOBxLugskDocfvKDt/lke7CmuITzrjeqrr3oe7wvPGH5JgMZckWIQQTiUJFiGECA5JsLiDC8PFmg1HqfJj3WHjBMO2XbFqN9z36dr1C3QwqTpIGggjdsf8gfIL8bg2Ijxt3x0XsOnPS0mCxXz55y+SHtpyQghhZZJgEUKI4NkZEU++0saqCPo+rpdjEyzncgroo5Y/wEYJli598bgr8ekfwYSBMC4yvhJduRr4Ti78w1OT12kwEJ4nZpMEixBCCDNIgkUIIewJfR/Xy5EJlnlLIunOmp1ggwQLD7ZZWHhZ7Y77vmXl/wgTBcJ3x1Ke8WhnER54BqCvO8+G50igSIJFCCGEGSTBIoQQ9oS+j+vlqAQLv7v1bvPAvn6g14atx9Uuue/fxcsnaE/sf8IkgfBPanZvj/YWocWP61Wr0xOeH4EkCRYhhBBmkASLEELYE/o+rpdjEiyr1h8J+VMrpT74cqraJff9u3otj6KSqsLkgDDD7yi/aItHu4vQyMsvgudGWQ8+3ZveazGZBgxfST+vPkiRUckUE5dBaRm5dP5CyXgeuXlFrmmXow6n0LrNx2j8D5upQ88F9Nr7Y72e75JgEUIIYQZJsAghhD2h7+N62T7Bwq/hfNUh+FMvlwfdLPG0wjgx4Ax7Yv6DDic/TPHpH1JKVjdKO/cdpWT3oPiMT+jIybrq73+G5Yw4crK2R7uL0DibU+BxXtxSrYNrXKS5i/f+kkDxV2JyNvErga27zHHN2MXbkQSLEEIIM0iCxdoys/Jp74EkWrvpGM1fuo8m/biNhoxeQ937L3GNk2gHU2ZuV1XF9a/I91M2qxiLw1qvwT/TiPHraca83bR4xQHavCOGDh87pXYf1ykcxcRl0LJVB4lntEXH0I6GWeDzD30f18vWCZYDh1Po/se/hRUPla7qw0C7n1eunaWI2L/ApIDd7Y75f5SS3Z145iRtu2hx0sXfdsrMnahC4fgieMomWJp/PZ14kFvtOoHAT8Hwq4La5aEgCRYhhLC2T9vMgMkTPV5qOoYGjFhF/YavpD7DVlDvoctdN4vfDlpGPQYupW7qJr9rvyXUuc8i6thrIXVQ2vVcQG26z6Nvus2j1l3m0tdd5lDLTrPpyw6z6Iv2P1GLtjOJ94kTPx+ra+uHLafRB1/9QM2+nErNvphKTVtMoXc/nUTvNJ9Eb30ykd74aAK9/uF4evX9cdS42Vh6+b3vqVGTMa5943K8vUHqpm/qTzvo5zWH6ODRVFVtz3awEn5Fn2/watXrA6+3dvPSu6NVtXFbVOTJl4bAvmsVz78xgoaNXRd2CRcef3DmvN30arPv4TFzAn5KXdsu4Qbtt162TbCMm7oZVjiQ7n24Kz3VaDA1eme0h0ee6Uf3PNQVTlXq1FmD9ifcQYWXDnu0R3kuX0mhQ8k1YTw9IuP+QVeuZatQOL4IDr64LFdf1goKL6l/4nXsThIsQghhbf48wWJVt9fs7ErczJy/h/jHEm2bhCN+lbhFmxlUqXJbeI21M38SLE+9PBT2ASuqUqcnDRmzRlUL1zUY+K0KfkLq1uod4LFyEl8TLNqpl43QxqoI2m+9bJdg4bEdAjmQbT31YdOy4yz6fvIm10C10TFpdCb7vNo03p+KFFzcBxMBdncs9Vm6eu2cagLcLhWJTXsXxtUjMfMLFQLHFSJYJMEihBDW5sQEi9Yzr37nerpF2zbhgO8Jgj1TYbhx8hMsyJ21utBkP16b8tW2XbF03yPd4DFyIl8SLDzuIoqllzZeRVAMvWyVYDkRm07V65o3K8ntNTrSGx+Mc70Tt313nNoE3q4/jqXUg0kAO9sd80fixJK2LYy4dCWZ9sb9DcavyO6YP9DFYuOZTCHMJAkWIYSwNkmw/OqJRkNoq7qJ1LZRqCxZGUV3q5tpdE11EnmCBWvw1khKPR2c71b9v1sBj42TSYLFf3Ch2TgBYsYjV3UbDqRREza4ZivRbsNs+UVbYQLA7lKyuqrq4zYxIjN3EoyvB7+WpY0nwg+Pl8KD0vLTYnMW76VJM7a5BjPrqy5W3Qcsdb2/PmrSRtf74Qt/3u9KhPKHGnoVL9xIgiXweABDfvcaPSpqB9r6+gp9+Qw3dz3U1TVWBI9XsWLdYUrPzFO7jusTbvYdTKZ56vNr6Jg11KrTbNcsZ+hVYjvQ1t3uJMHiicdzCcbNRXm+aDcTXkudSBIs3t1UrQOt3xKtqorrbwYeGwkdF6eTBIv/4EIz8RcXVDm9eHaRXoOXUWxCpgqHtxEITnx6ZW/cDXTtuu+vVGkdTLofbqci/BRL8dXAJ9GEMYkns10j3vNAfLfc3xFeEPXi921bdZ7tGlWeP5S12wo1IwmWQLq5Wnu1O3gfrYTH9eFR+Nv3mE9PvzQE1tVuzpk0/gE6f6yg/ivfuRKr2vqEGh8X1+fYZ5Pppqrt4LGzK21b2J0kWLBKVdvTqg1HVBPhdgsUPvf+/fpw2DedShIsFRs5YYOqLm4Df7TpNhceEyEJFjPAhWYZNHIVrJge/CHMU8JqYwaDU59eScz4XFUft4kvTp8bArejR/KZNioEjiuCh5/O4FHeH31+ALzwmYVnR/hpQQQVFF5Wm8X7EkxWTrBcKLjkmhFND21Zsx2JPk2ftJoG62Z3Tk+wlOJk6pgpm6iwKPTn9vQ5O+nOmp3g8XICbXvYnSRYysfnpbbNAoVvvh59th/sl04mCRZ9eBYvbf39wVN+o+MhSkiCxX9woRn4l0pUqYo0+3wKHTwS2qnmnPj0Cjt3wdwbrovFMXA7euyJ+bM8xRJCG7cdp4ZvjYIXukDjRzZPp+eq3cD7FgxWTrDwwN4oFqIta5aY+Ex65T3nTnHIJMHi7l+1utLsRaH50SQmLoPqNx4Kj5OTaNvF7iTBUjGe5lnbbmbj14IfbzgI9kmnkwSLfj0HLlPVxm1hRHzSGXgsxK8kweI/uNBf/B4zqlB5+J1M7vTaWMF25WqWa6BXdNNvd0WXj6smwO3iq10nfgu3pUd6zigVAscVgbHv4MmQJVa02vVcQDzOi3Yfg0ESLL7r3n8J3JbTSIIFa6RuKII5fSyPsSLTbpbQto3dSYJFn4EjA5tkafjWSNgfhSRYjOJx/rTtYBSP54mOhfiVJFj8Bxf646OWP8DKePPhVz9QYnK2KorjBVtm7kR4s28FayP/RIs2/5Wm//xPmrL4Jpq77v9oxa7/pG1Hfw/X1/JnamZvdp/Qt23kyMnaKgSOK8yVkJzlGlsFXdBCid8V7z98JfEYHtp9DiRJsBiXkZlHz74yDG7HiSTB4t29j3anA4dTVPVwnc3C53Glym3h8XEibfvYnSRY9Ptx7i7VZLgd/cFPpaO+KEpIgsW4uUsiVfVxm1REZgzSRxIs/oMLfWVkZPCXm4whfj9fGyPUrPR60MJNf6WuQ2vQ82+9TP+49wvYzqUerN+EWnSuQ5MX3UQ7ovFTJcVX01QT4Hbx1a4Tv4Pb0ue3dKk4QYXBsYX/8vKL6Jtu8+BFLJzc/XA31xgt2v0PFEmwGBOlbpZ5QHK0DaeSBEv5OHnKs5Bp62uWvQeS4HFxMm0b2Z0kWIzZvCNGNRtuS19MnL4V9kPxK0mwGPfPyu18ukHmMugYCE+SYPEfXOiLdt3nwUpo8QBz8/zIPgbSpStJrpt6fLMfPhZs/F96ocmLsH31qFz7Axo65W7aedw9bmBeEXLfhlGp2cZPcqEP/4LMA1CiC1i4evPjCXT+QuCneZYEi36rNxyBsZ1OEiwVu7NWl4B80eHE8X2PdIPHxcm07WR3kmAxhn/I4JskbTv6Qsa50EcSLL6p+8Jg1QS4Xbz5urPx4SucShIs/oMLjRozaSOsgNYHX0417UtnIPDNPLrJDxerI/5M77WqR/9311ewfY16rMFbNG1ZpV/iZ+ZOUM2A28YX+UXb3PbfF1GJlVUoHN/qLl855UogpeeMUP/E6wTKuB+2wIuWFVR7/FuKjk1X1cB1M4MkWPTZGREP4wpJsOj1wNN9TJ+q/Z1PJsJj4nTadrI7SbAYx22mbUdfyLgr+kiCxXeTZ25XzYDbRovH/ULtLzBJsPgPLjRi8YoDcOfLqnRfW1qyMkqtjmOEixOnX4U3+eFgyda/UPUn34Pt648b7v6S+o+/z7WNoylPq2bAbeOLhIxPPeph3O/o6rUcFQ5vw8oOJdf6pZ5XrwVv1pwvO8yCFysrqVSlnemPM5clCZaKxSZk0o3qOKC4QhIsRvA07dp6+2r2wgh4PIQkWIQ+/o6PtEVdm1H/E54kweK7Ox7srHt8vt5DfobtLzBJsPgPLtSLp1NGO17WA0/2Iv4iri0bjvbG/W+ZG/vwMW7ObXRrjU9h+5rl0451XWOzXLhozjSaPMUyT7WM6mPUuQvmTM0WTs4X7fylfnti/qQW4fXM9t7ngR3Ilqdird1goGsmooee6af6bSe4nlnmL9unqoXr6g9JsFSsjjrOKKZRt93fkWrV60MN3xxBjd4ZbRtmvcrG06iGq469FtL7X/1Az7z6HTw/jRgyZo2qLm4DIyo/2h32MyPurtWFnnxxMDyuVqZtK7uTBItvXmk2VjUfblM96qkbf3Re+eOOBzrR2x9PoNZd5tCA4StpsPr8sYM5i3wfW65117muWdnCGX8XrP5EL9jPzDBywgbVFLh9yuL+g/qVL/j1047fLoDH0y54/CRtG1ZEEizu4EI90jPy6C71JQTteKm3PhpPBYWX1Oo4RjjJL9rqdlMfLng2oBvuNueVoLJ4LJza/x5ADd4YQQ/V70M3VW1HTb6qTydOvayaA7eREUlnWsP6+CIx8wsVEm/HqmJOv/5L/WLTmqhFeD0z8cUOXaB8wWO3tFcXmJXrj7gGquSbeu32yjqdnktRR1Jo5vw9rhsyMxMvP8zaoTaBt+srIwmWLn0XwQuUGYaPW6d2B++jN8FIsPg7En/9xkNp4rStIZuGWwQGT/Pe5LPJ8DzVY/+hkyoMjq3HouX7YX+rCCf5eg5cShu3mT8OmQidT9vMgP1Mj5eajoFJxXAwYMQq4pvrd5pPosq1e8D995ev5+LuyAR4jvnq3eYTafOOEyo03p6wjr0Hkl399+bqHWCf8wXPSKfdjtahoxU/DKAHv/a2a2+8Com343SSYHEHF+rxeMNBcKdL8c2Btkw4C8fxV5Zt/2+6/YHmsH199cp733t9oog/OEZNa0ynzw1R//T8u17nLixV++/P7EHu9ifcocLibVkRz4xUtn45BSvUYryuWd74aAK8OBlxi7oJ4RmHzJpedcXaw65Ba9G2jFq2+qAKibfjCyMJllNp4fUKW6ATLCdTz8JYejzyTD/iL+DamMJeduyJ9+lXy3qNh6niOKYeTzUaDPtdeXoNtt8TkqKEP0+wmPVEVTDs3pdIZr/6+0lr38ZiMWta5nse6kqr1h9RIfF2hHXxIOSd+yyC/c4XC3/er8LibTG944SW59Vm5r3GaleSYHEHF1akVafyR2Jetsrcm51giE5t4HbTG2pbDv+Baj3zLmxfX+l51zNL3ZzNXfMYpZ3z7Ytu9vk5rldeUJ38wa8cabdlVQkZzX+p1964v6lFeD2ztGg7E16U9OL3fGfM261C4fj+SsvIpX7DV9I9j3SD29drz/5EFQ5vwyhJsHjHg5WjWBUZNHKVKo5jCvspLLpMvrySuGLdYVUcxywP/+KO+l15xk7ZpIrieML6/EmwDP1+rQqB44YrvgbyoNGoPr7ggUG12ygP3zij88yoW6p1oBMBHshehF50TBrVrOd/f21cwSttb344HvYzvfi10wsF1ngbI5QkweIOLizP0pVRcGfZvx7sTFEm/bodbPyURNkb+lBr0+ch2Ma+4ncG9Q66eOxEoms8lti0d+jKtbNqEV6vrGvXCyjpzDewLmbgV7i027Siy1dS3eqVlNlSLcbrmoHfT0UXJD14ClWznwypSK/BP8N90YOfsOGnK7QxfSEJFoxfDUVxKjJktHV+DRbmMvrL+hONfHuCkvsY6nvefNxqmiqGYwl7cFqChWWcyTfttaGJP25TIfF2EH5dF51rRslrGM6RlJLtGrsP9T8j+OZeG7sUD4GA+plePOaPNqbwJAkWd3ChN8kpZ6lS5bZwZ3nEYf4lWlvGKnaf+L3bjW8o8XTMN1b5HLazr6bP2amqieuOLF7bw7UvEbF/odTsb+n8xV1qsed6BZcOUNq5oRQZ9w+PepgpM3ei2pzn9q0mMfNLt3pdLI5Vi/G6/uJfs9CFSA8eJ4V/jdLGDAYeq8XXQdH4aRttPF9IggX7dtAyGKc8PEaNNo5wFh40E52v3vArD9oYFeEnNFH/8yZUn28ieJyYYGF883DbA/6Pc9bgrZEqHN4G8nKTMfBcM+K7scbHHRPWFhmVDPufEeU9ZY36mRH7DiarMDi2+JUkWNzBhd7wwIRoRzm5kpGZp1bB5cLdxeJ4t5veUGvash5sZ38Yfbxtw9ZDtDHqj277tTvmD7Q/4U46crIuHUi8h/bE/Ifb3wMp+UwbtVt4X63iUnGiW534tTTtOmbJP3/RNRAtuhBVZPi49SoEjhssfPPj66C83QcsVSFwXL0kwYLVeKIXjOPN0y/5N56TsIeCwsuGkqa+jP+A+p837XvMV0VwHGEfTk2wMB7jDNXLKCOJyEr34R9g9Xr+teEqDI4t7K1Tb//GZOEnJbUxWaG69qC+ZoQ2psAkweIOLkR40Fq0kzWfsnZyheUVbnK78Q2lbUd/TzdVbQHb2ld/v/sbVU1cd29STp2jQRPvhfsYCtGpDdVu4X21imMp9d3qlFcYuF9q+AkUdBGqyLrN0ao4jhkKbbrPg/tZkW27/HsySBIsnmLiM2EMb/ixXLNe2RLWxzMMoXMVqVSlnSqC4yB8vUJ90Ju1m46pYjiWsA8nJ1iYP/UvtXlHjAqF45dl9PqA8Jgc2rjCGfh7yz8rt4N9UI9HnuuvwnjGzckthH1NLx4PSBtTYJJgcQcXah0+dgruICdXss5af5rNrPyZbje+oTTmp9thW/vD1wRL4w/CZ+DfA4l3q93C+2oF2fmz3OoTlVhZLcbr+mvt5mPwAlQefgf20NFTqjiOGUq+jCNTQ302aeMYIQkWTxOmbYExvBkxPvRPQonwYuSGj3+B15b35nhMOuyD3ugdj0xYm9MTLPz9HNXNiGE6X9lZvuYQPNf0evHtUSoMji38xz928Ks4qzYcoR/n7nK9iqWd/jvUajcYCPugXto6s8wz+bC/6cWzWWljCkwSLO7gQi2eWlO7c1Xr9CDuuNp1rSgzd5LbzW8oNfmqvkdbm4E7vrbe5Vmz4SjdXK0FbT9m3nTL/oiMr6R2C+9ruLt6Lc9jjJqsfN+mQKwIz9xhdDYeflc7PilLFccxw8GYKZvgvpen15DlqiiOVxFJsHh6r8VkGMMbo585wv54ph90riJGXvUzMoMQP1mlLS/syekJFubvLIKftpmhwuDYZY2buhmeb3pxgkYbU/iOnzzq0nex30kLK+EBnrXtwGODov6mlzzBop8kWNzBhWV1VSeodsfsNoVa2rnv3G5+Q+mBek092tsMP83fo6qK64+07jLHVW7Ztr/A/Qw2Hu9Fu49WkZDxqVtd9sXfpBbjdf3Fg5CiC095+OZEGycc8ZcFtP/l4YG5tXH0kASLpyq1e8AYyJftf1JFcBzhbHVfGAzPVa3n3xihVscxtHbsiYP9ELm7VhdVBMcR9uJPgmXIGHvMfGbk1Tyk4Vv6nizp1m8JPN/0KioqVmFwbKHP0lVR9E7zSa5XLNGxtLtjJzxfMeOpxlF/M0IbU2CSYHEHF5biHUA7tjsyQf0Zl7Gi1OzebjfAocRPjaA299djXt5PRHhMndLZomat+jvcz1DQ7qcVoPF9MnMnqD/h9f3Bg9EZvbCuXH9EFcXxwtHbzSfCenjTrucCVQzHKo8kWDyh8t7wDa+2vBCMXzlA56qWkXFY1m+Jhv0Que+RbqoIjiPsRZ5gKXHHg51hHfXgwam18RBOqqPzTY+Gb+pPpgpP/D2ubsNB8Pg5CZp9jif4QH3OCH4FVRtXeJIEizu4sBR/6Gl3au7ivepPeH2rOnmmg8dNcCjsPP5bj/Y2U8dv9d1slj3ukxfeDPc1FLT7Ge6uXDtLkXHuCSr+t3Y9s/DsP+ii482AEatUMRwrXPErUDXr9YH18caX6VglweLu/IWLsLw32vJClOJfGdF5imjLerN5xwnYDxH+8UBbXtiTJFhKfODjoPesUtX2KgSOW9Znqq3R+aZHu+7zVAgcV3i3c28CPfvacHjcnGjLTjwgM+pzRkyesU2F8Ywr3EmCxR1cyBavOOCxQ32H+j6mQThLOtPa7SY4VLYe+b1Hm5vtnU8mUmxCpqq2Zzvwk0lPvjjYbf1RM+6A+xoK2v0Nd9Gpz3nUIT1npPoTXt9fPFAtuuggj6vjrC1vFUbGcWA8eJo2RkUkweLOSMzGTceoIjiOMA+fB5NnbqevOs4iva/dWA33O229kYj9SbAveqMtL+xJEiwlBo9eA+uolzYe8lHLH+C5pseA4StVCBxXYO2/XQCPlZOt3nhUNY1nW6E+Z4R8p9FHEizu4EJW+dHubjvz9EtD1GK8rtWFyxMswUiwlHrw6d700rujXRq9M9r1XjpaTxIsvknPGe2x/4Ece4XfvUUXHG/4lw9tDCv5qNV0WC+kSp2eqgiO440kWNwZGSiu95CfVREcR/hnwbL99O6nk2A/t6PU0/rOraPHT8O+6E0EeJRc2I8kWEr8MGsHrKNe2niIPwkWnqFOG09gmVnnqf4r38Hj5HQ/exkouW7DgbDfGSGvCVVMEizu4MKhY9a47Uil+9oST/GlXc8uUrK6edwMh0KgXxHyhbwiZFzhpYNw/8+eD9xjsG99on9sEh7HRFveangacVQ3b7btilXFcCxEEizuuL1ReeT7yZtUERxH+GbJyii6/8lesG/bmd7ZzRKTs2Ff9Gb0xI2qGI4l7EMSLCX4xhPVUS9tPOTDr3xPsEycvlWFwHHFr6Jj0lw/GKFjJLwnWLr0XQT7nRH8Y7Q2rnAnCRZ3Hgv4XXuexrDsjkyfs1P9yX09O3HCILe+kkFujSm+mu6aUlq770dO1lZ/xmX8xaOko4uNN9E2mQHMyCOyX3aYpYrgOIgkWNxxgh2VR+w4TleonIjLcM3igfq0E+j9rCosvAz7ojf1Xh6qiuFYwj4kwVJi7eZjsI56aeMhkmAJLP6RyKmzA+nlLcGyZsNR2O+M4nGGss5eUCE9tyEkwaLlsaDX4GVuO/H6++PUYvd17MYJ0zT7SqZp1u/qtTyKSqwM97/wEv7gN8OUmdvhxQbhL5za8lbFiQRUR+Smah1UERwHkQSLOyMJlhVrA9fXnaT7gKWwLzuJkWRwnQbGHgOPicdjkQn7kARLCUmwWBtPtc2DDaNjI37lLcFixkxCZfHrcINHrQ5785ZEUtLJbNUEnm0SCJJgcef2j8ysfLcduOOBTo7I1mXmToI3xaHQ5Kv6bscglG6q2oK2H/sd3M9g46dCtMct3Bw5WQfue3z6x+rPuIwZ3jcwQ8DOiHhVBMexomZfToX1RA4cTlFFcBwtSbC4kwRL8JxOz6V6jYfBPuw0RhIs3fotgf3RGx57TBtD2IskWEpIgsW6jsdl0I3VJLmih7cEC3vlve9h33OCu2p1oWafTyEei6mg8JJqDtxG/pIEizu3f3TqtdBtB+Yv3acWuxewo6z8mfDGOBTG/HS72zEIpcYfNID7GAoHEu9Whwofv3Bw4tTLcL/3xv0f8XTN2vXNdNsDneDFRuvuh7up1XEMqzIyuO+oSfrHXZAEiztJsAQHX/T5PEX914mMJFg2bjsO+2N5Zi+MUEVxPGF9kmApIQkW63qwXl94TISn8hIsG7Yavz7YVatOsykjM081C24rX0mCxd0v/5OX794wnO0r/Zvd5RVugjfHobDt6O/DZhyWQRPvhfsYCtGpDdWhwscv1OLSmsJ9Ztn5xsb+MIpvQNCFBunUe5EqguNYGaor8ubHE9TqOIaWJFjcSYIl8PhcvrWGvmSpUxhJsLAqtXvAPlkeowNgC+uQBEsJSbBYU6vOs+HxEFh5CRZm9DVSuxs4YpVqFtxWvpAEi7tf/ue7set+2XClym2Jp+Us/ZvdXSyOhzfHodK0ZT23jhAKtz/QnDZG/RHuXygkn2mjDhU+fqF0Mqsz3F92NOVptQouZ5ZZCyPghQbZtP2EKoLjWNnrH46H9dW666GuanUcQ0sSLO4kwRJY/CruPY/IkytaRhMsY6dsgn2yIt37LyE+b7TxhLVJgqWEJFisZ2dEPDwWwruKEiw8AD/qf0727CvDTLv2SYLF3S//c4+6+Sjd8IDhK9Uiz5Xt6tr1Qtp94vfwJjkUVkf82TX+SdnOEGzdv7sf7luoZOaG39TC6Tmj4b6yiNi/0OUrp9RquKxZeg1ZDi80iLasXYyduhnWF+HBzrTlEUmwuJMES2DVfWEw7K9OZzTBwrMg8g9EqF/qwb9wfvDlVPp20DI4aGCojVOfdXx+HTqaSjm5harKuB1ECUmwlJAEi/XUeKo3PBbCu4oSLKxuQ3mKRatanZ4Um+D/oO+SYHHn+s/WnbG/bPS2+zsSf0kpu5IT7E+4A94oh0qbPg+5dYZgqvFUU9oR/Vu4X6GSXxReF+D0nBFwP0udPb9ArYbLmqlpiynwQqP1/Bsj1Oo4htVF7E+CdUYio5JVERynLEmwuJMES+B80f4n2FeN4AQNfxbwI+W9hy6nQepmPFz1G74S1gExmmBh2pkQ7ezeh7vSN13n0uIVB4i/3GrbwukkwVJCEizWMn7aFngczMAzKvK4Li+8PYoavTs67NzxYGe433roSbAkJmfTjVXawX7oZP9S7Z6c4t94kZJgcef6z4jx63/Z6OiJ+geCtJPo1PAZ0JVtOfx7eujZd9w6RLBMXngz3KdQKr6aoQ4TPnbBlpDRAu5jqbj099VquKzZHn1+ALzQaPGNl7asXfAvuajOyOxFe1URHKcsSbC4kwRLYMxftg/2Uz34lTdOViQkZ6lQOH64QvVBfEmwMKf+SslP3mjbwskkwVJCEizWUrl2D3gcfPXIc/1p5IQNxNdx7bbCzdvNJ8I66KEnwcIWqOsu6odOV+OJXnQup0A1EW63ikiCxZ3rPwePpLo2+FD9PuqfeEW7S83uDW+WQ2nZ9v92jYWi7RiBFG6vBjF+ukh7vELh+vUiOn7qRbiPpfYn3EnXrgdvanO9F2IjM+hY0e019f3qwclkbVlEEizuJMFiPh53xddBbb/uMsfST5qiOiG+Jljik85Qpft8f1XIyvhx71Xrj6hmwG3jJJJgKSEJFutYtPwAPAa+0vudJ1wEI8HCvu48G/ZFp3u1me8T3EiCxR1c6ET8Cgq6YQ61yYtuohvu/gp2ELM1+ao+3IdQi0//SB0ifNyC5fKVVDqUXBPuX1mFl4J7c8m/YqMLjRbPf68tayd1Gw6C9dbq0nexWh3HKEsSLO4kwWK+Fm1nwj5akfVbolVxHNMqUL0QXxMs7Mc5u2D/dAp5mkUSLKUkwWIdTT6bDI+BUfwqUNSRFBUSbydcvdN8EqyPHkYSLOzFt0fB/uh0Iyf4lpSTBIs7uNCp9sb9H7xpDrVxc24L+KC3n3asG3bjrpQ6e36eOjz4mAVDXuFGioj9K9y3ss7k/aBWxzEC5bYH9P0CPm32TrU6jmEHjZuNhfXW+rTNDLU6jlGWJFjcSYLFXKmnc2D/rMiy1QdVcRzTSlDdEH8SLOz7yb7NKmQXrTrZ99VQPSTBUkISLNZQWHQZtr9RN1ZrTwcOWy+5woL1BAvjSQ8avDEC9kmn23dQ33iFZUmCxR1c6FQnTr8Kb5zDwfz1f6PqT74HO4o/brj7S+o//j64zfDwW7p6LU8dHnzMAi01uxfYJ09xae+p1XGMQPr7vW3ghUbL7k+wfNhyGqy31hsfTVCr4xhlSYLFnSRYzNWu5wLYP8tjtUe9y4Pqh/ibYGGcXEb91Cm+aDdTNQNuG7uTBEsJSbBYAycIUPsbNX3OLhUObyPcBTPBUspJA6PrVaue8SFDJMHiDi50qvKm3Q0H6/f/B73f+mnYWXzxyPNv04zl/4DbCheHkh9UhwYfr0AqvppJR1OehvukdTTlSVUExwm0ex/tDi80WmOmbFKr4xh28O6n+h4rfe/zKWp1HKMsSbC4kwSLufgXRtQ/vXnu9eGqGI5lRaiOiBkJFsaz7NxSrQPsr04w1uaf/95IgqWEJFisoW2P+bD9jWjUZIwKheNbQTBfESprd2QCVandA/ZPp1q6Mko1DW4vRBIs7uBCp7p0JVndMIfnazJl8dMsz77ZGHYaPe6r/QENnnQP7TyO44cTHnxYe5wCLadgBe2N+1+4P1oHk+4P6qC2WjXr9YEXGq2BI1er1XEMO3jxndGw3lqft/tJrY5jlCUJFneSYDHP0lVRsG96w8mYtIxcVRTHsyJUT8SsBAs7m1NALdrMgH3WCY7HmNeWViEJlhKSYLEGnu0Htb8R0TFpKhSObwWheIKlrCGj19Ct1Z2bjC/r8YaDVJPgdkIkweIOLnSyYyn14I10OFq67S/UdWgNev6tl+kf934BO1GpB+s3oc861XVNwRyuY61o7Y75I12+Erz3SK9cO0vxGZ/AfUF4xqArVwN/kpbniUZD4IVGq0OvhWp1HMMOHvu3vumq9baDJFjcSYLFPEYHt+0/fKUqhmNZFaonYmaCpdSOPXH09scTYN+1s0ef7aeqj9vEriTBUkISLNaA2t4Iqz+9wkL1BEtZ+ecvUv/vVkiiRdm+O041CW4nLUmwuIMLnSwr/0d4M20FayP/RAs3/ZWm//xPmrr4Rpq3/m+0cvd/0rajv4frhzseE0d7fAIlPWek7qdWWGR8JbpYHK+K4njBovfJDb1jj1gVqjPSV100tWURSbC4kwSLeao/0Qv2TW94OmdtDKtD9UQCkWApxdNcz1kU4Uq2PPniYKqhjsvtNTrCPm0X46ZuVlXH7WFHkmApIQmW8FdQ6P8At/wqpDau1YT6CRYtfnWIZ9X5putcevPD8VSnwUC6s2Yn2I/tqPnX01Uz4LbRkgSLO7jQya5dL6SI2P+CN9UiuM5dCPw0k+fOL6IDiffA7XsTGfd3ulgco4rjmMHUqvNseKHRerBeX7U6jmF1RmZkmbN4ryqC45QlCRZ3kmAxh9FZInjKTm0MO0B1RQKZYLGa9Iw8ioxKdo2n8sp738NzryI8xoA2rp1JgqWEJFjCX2bWedj2RvC1XxvXasItwWIlPCsSz/4zfc5OqvfyUHiuGXV3rS4qNN6eliRY3MGFTpeQ8Sm8sRbBw0+TaI+LmXiclUPJteC2y8NTeYdLcoWNmrgBXmgQ/oVEW94OVm04AuuL6J26UBIs7iTBYo6UU+dgv/RGb0LQalBdEUmweLd+S7Tryy86B8vzs02m+tZDEiwlJMES/vh7BGp7varU6anC4NhWEg6vCNnFl+1/guebUXqTEZJgcQcXOt3F4ljaHfMHeIMtgiNQg9tmn59Lh5MfhtusCCdXii4fVWFw7FBYuV5/cmH1xvDad7MYmfK2qKhYFcFxypIEiztJsJjj0NFTsF96k3gyWxXDsawM1RWRBEv5jp1Io5uqtoPnoTcN3xyhiuJ4diMJlhKSYAl/RpPvWnZ52lGeYDEXf96jc86IabN3qlA4flmSYHEHFwr6TWzau/AmWwTenpg/09Vreeow4GNj1LXr+cRjrOxPuB1uT4998TcTJ960sUMtOeUsvNAg7b9doIrgOFamd0yL+5/spVbHMbQkweJOEizm2LEnHvZN5K6HuqoiOI7VofoikmCp2MKf98PzsDzZ5+w3rg8iCZYSkmAJf0a+yyGtu8xVYXBsK5EEi7li4jPhOWfEp61/VKFw/LIkweIOLhT0m4KL+9SNtTVm27Gb5DNt1CHAx8WIvMKNFJfWlPbE/AluR68DCf+iy1dSVUi8nVC799Hu8GKjxetpy1rd4WP6nwho2Wm2KoLjaEmCxZ0kWMyxdVcs7JtI42ZjVREcx+pQfRFJsOjz/GvD4bnozaLl+1UxHMtOJMFSQhIs4c/IWHLIt4MCP2ZhMMgrQuZ7qtFgeN7pxdcXbUxEEizu4EJRIjq1IbzhFoHDr2YVX81QzY+PSXkKLh2g9JwRFHP6NUMzApUnKqmqz/sTLJ+2mQEvNsjOvQmqCI5jRT0HLoP1ROYtjVRFcBwtSbC4kwSLOTZuOw77JvJRK/2j91sNqi8iCRZ91qkbaHQuetPKQLLZyr7sMAv2Kz2GjFmjQuC4VmNknDJEGw+RBIt/0jJyYdvrNWjUahUGx7YSeYLFfAOGr4TnnV4P6Hz620oJFr3jMfoDLhQlLlzcA2+6ReAkZeq7mLOiy8cpPWc0nTjVmCJi/wrj+eNoylPErxdptxtufpy7C15sEJ51SFveyirX7gHriWSc0X8sJcHiThIs5tiyMwb2TYTHFtKWtwtUX0QSLPpVfqw7PB+RWvX6qCI4jp207TEf9is9eg1ZrkLguFYze9FeWEe9tPEQSbD4h7+foLbXq1PvRSoMjm0l8gSL+TZsPQ7PO71urNJOhcGxy7JSgoXbRBvPbHCh+BW/roJuvoX59iXcSteuF6hmdz8G5y/uosy8yZSa3Yt4hqfjp16iyPhKMIZZ+NUi7X6EK36fHl1svOFfSrQxrGjKzO2wfsjTjYeqIjgOErFPf4IlNiFTFcFxQiHUCZb5S/epIjiO0xkZg6XPsBWqCI5jdai+iCRY9Gv+9XR4PnqjLW9H3Qcshf1KDzv9GDFmyiZYR7208RBJsPgnJ7cQtr1eH6vzXxvTiiTBYr7jMenwvDNCGxOxUoJl1oI9KgSOaxa4UPzq2vULtD/hNngTLsx17oLnO6SFl4/AdQMpJUv/vO/h4vUPx8MLDvJ5u59UERzHSv5VqyusHzJpxjZVBMdBIqOS4YcysjsyvF67CkSChZ/SQeWR8T9sVkVwHKfbsz8R9k+kQ6+FqgiOY3WovogkWPQbNWEDPB+90Za3o5GqTVC/0uPV98epEDiu1fjzJA/TxkMkweI/1PZ6PfJcfxUCx7USSbCY73R6LjzvjNDGRKyUYPmqwywVAsc1C1wo3J09Pw/eiAvznDj9qmpqz7Y/fPJRuH4gRMT+F2Wfn6M267kf4Y5nkkAXHG+Ox4X3uDIV4feNUb28yT9/URXDsZCDR1LhhzLy8+qDqgiOEwqBSLBkZObB8kgfGz1ab7Yj0adh/0Q+bDlNFcFxrA7VF5EEi35LV0bB89EbbXk7Mnpd1NLGs6oqdXrC+umljYdIgsV/qO2N4BtpbUyrkQSL+ZJOZsPzzghtTCTYCZZKldvCOHrc90g3FQLHNQtcKDwdP/UCvCkX/uNpmYuvnFbN7N7mWfkz4fqBwIPZXiyO99gHK7ntgU7wooO81HSMKoLjhDuj7yq/r774aWNUJDomDX4oI0NGh9dgiIFIsPBraKg88u6nk1QRHMfp+FUr1EeRhm+NUkVwHKtD9UUkwaLf1p2x8Hz0prDwsiqGY9nF7n36nxhDtu+OU2FwbKvgaVpR3fTicc60MRFJsPivToOB8BjoNXnmdhUGx7YKGeTWfEZ+METCdQyWJ1/0b3akiP1JKgyObQa4UHjimWT2xd8Eb86Ff7LyPedYv369iCLj/g7XN1tc2nse27cinlYSXXS8mb/MmmNlGP2Fg58a0MaoiJFHKl9uEl7JqkAkWBgqj9xcrb1aHcdwOv4CgvooUqmqfdsR1ReRBIt+Rl5rZEVFxaoYjmUX/OQi6ld6NftiqgqDY1tF6y5zYd30euFtfYleSbD476uOvs96xarW/VaFwbGtQp5gMd+WHTHwvNOrah19SdZgJ1iMjjumxZ9Z2phmggsFlle4Ht6gC9/Fpr2rmtazrRMzPofrm4lnHrLqK0FIYdFluqlaB3jh8ebwsVOqKI4Xjoy+GtS0xRRVDMcqz4WCS/ADGal0X1tVBMcJhUAlWIw8julLUsspOHGC+iqyM8LaT9V5g+qKSIJFv807TsBz0RttebuqVb8v7Ft6Wfkc9HdmGsY3/dq4iCRY/Df1px3wGBgxftoWFQrHtwJ5gsV8YyZthOedXnUbDlRhcOyygp1g4fH+UBwjAjlJBVwovJNZhcyzP+FOunotTzWrexvnFqyC65vpyMnHqfhqmse2rW7w6DXwwuMNv5vNN+TaOOFoycooWIfyHD3u+43+rdU7wA9kZNHy/aoIjhNsgUqwPPvKMBgD6TlwqSqC4zgdv/qD+ipip6liy0J1RSTBoh+PBYXORW+05e3qm27zYN/Sq9rj3xLfOGjjWgG/HovqZMS02TtVKBy/LEmw+C8+KQseAyP+Wbkd8Wth2thWIU+wmK/JZ5PgeafX2x9PUGFw7LKCnWAx+tQm8uDTvQP2uixcKMp3MKkGvGkXxhRc9HxF5cq1s7Q37m9wfbOcPjfYY7t2ct9j3eHFx5uHn+1HBWH+Pj6/C4/2vTwtO/k3zeYbH4yDH8jI4w0HqSI4TrAFKsHSqddCGAO5pVoH1acuqWI4lpP1GKh/6thba3Sy7M1deVBdEUmw6Mc3qehc9EZb3q42bjsO+5YRVhwPad3maFgXo/T+wisJFnP4OyAxe7BeXxUKxw93kmAxV16+f0kPNnSMvnEGg51gYbfX6AhjGaE3gWQUXCjKV3w1nQ4k3g1v3oUev6Ps83NVU3q2bXTq82B9c/BTK0WXj6vNeG7XThYtPwAvPuV59rXhYXsjx8mVG6vpf62C8atSPDCrNpYRw75fCz+Mvdm2K1YVw7GCKVAJFp6RA8XwZtxUma4Z2ar6Ceqz3nQfYL+ngVA9EUmw6NeizQx4HiL8q522vJ3dcn9H2L+MeOOjwHwJD4TNO2Lo5urGXhdG+GZfG9sbSbCYo2OvhfBYGMVJwfMXjM2eGA7kFSFz9f9uBTznjOAB1LVxkVAkWFp2nAVjGcVP+Whj+wsuFBW7VJxIe+NugDfyonzpOfjXoFNn+8L1/RUZ/0/iGYm027MzTpigC1B5atbrQ6fSclRxHDMUFq8wnixiE0z4wpaYbGxqu0ee6aeK4VjBFKgEC39ZQzG84V8WrPL6WbBVqtIO9ltvjp2w1+uMqI6IJFj0q6ZuhtF5iHza2nNgeTvrYNJN61MvDw37qXB5DA60777o1n+JCom3oyUJFnPsO3gSHgtfPPJcf0rLsNbUzZJgMc+OPXHwfDNK79PIoUiwGB17rDw8YQXP9Kjdhq/gQqFPwcVIioj9C7ypF1hKVhfVdJ5tee78Iri+v3iw3GvX89UmPLdpZ4kns12zkKCLUHnurNWF9h5IViFw3GDi8SfQPlakwVsjVXEc06gnXhgEP4i9+W7sOlUMxwqWQCVYWEPVtiiON/ylWxtD0G++aP8T7Lve8FSpdnpVCNURkQSLPvsOGnsX3Wk3tEkp2bB/+apF25l08GiqCo23Fwp83a7/yndwf321/9BJFRpvT0sSLOZ54Ok+8Hj4gp/mnfjjNhUWbyvcyCtC/uMxRfi7KDrXjNI7wC0LRYKF8ROZKJ6v+Kkf/oFVux2j4EKhX17hJtoT82d4cy/ccbJD236s8PIRuL4/jqXUo6LL0Sq85/acYs7ivfAipAePZq+NFyzncgtcj2Oj/arI7TU7U3qm58DJvuIB/tAHcHn8GVjXDIFMsPw4ZxeMUx4enFgbx+l8GVPo5fe+V0VxPKtB9UMkwaJP+x7z4bnnzYHDKaoYjmVXH389HfYxf/C0uF36LqbJM7fTcnVztzMiPmhWrDtMU9R2+SkT3g+0f/6oa3BcMUmwmGf05E3wmPiDB2vuM2wFRexPCuunsAL5BAvPDjl41Grb6jt0uWs8ESMzPlbke9UXte3oTagSLJN+3Abj+atOg4H0Tde5roG++Wkg9DnsDT/xDXdWGFNwaT/tS7gV3ugL9ls6fW6IairPtuPxbPbF3wjK+IbHxsm58LMK7bktJ/qk9Y/wQqTHE42G0M69CSoMjh0Iw8auI3/el+cBDbUx/cUDtqIPX2/urNkpoFO/VSSQCRZmZHalUvwYpzaO0z30TD/Yh8vzSrOxVFRUrIrjmFaB6oZES4KlQidUG6Fzzpubq7VXxXAsO+NXJXx5qtOpZi2MUM2G2xKRBIt5Cosu020PdILHRXhXUYIlPSMP9j/hnZEnZ0OVYGGVH+0OY4bKnshEvKPCuOIrp+lgUnV40+9ke2L/k85dwO/xFl/NpAOJ98ByRkXG/Z3ScoarsJ7bcbonXxoCL0Z68U1doB+H5vfG73mkG9y+XiMnbFChcHx/jBi/Hn6Alueeh7qGbKrEQCdYeER5FKs8le5rq3ugNKeYv2wf7McV4XEgrD62DaoXIgmW8vGvZE81GgzPOW/adpuniuJ4djdq4gbYz4Q7fiJG23YVkQSLufjHJnRshHeSYDEXDyCrbcPyhDLBsnRlFIwZKpJgMRmP9RGd2gAmAJyIBwEuuHRANY1nW5mVXNkXfwul54xWIT23IUrwh54vv5ZrcaJl6SrzXvfgXxSHqJt1o9NKIzzyvja+me59uCv8EK0Iv8upjRVogU6wMCMDapb1defZlJNbqELguE7DgxCi/lwRfsprxrzdKgSOG+5QnRBJsHjHg/E9+mw/eJ6VJzrGXgMmG/Xc68YHgHeaFWsPq6bC7eeNJFjMx9Mto+MjsFUbjqhmw23JJMFizOFjp1Sz4bZEQplgYa+9PxbGDQVJsATIyTMdYDLASQ4l16TLV/B73leuZfudXNmfcDtl5lpn2sRQ49mBeKBMdFEy6q6HulLrLnNd74Dzo6zabZWHv9yPmbKJGjcbC2P7ovk3gZ8Rw5/sePW6PYmnfA7WaP7BSLCs3xIN4+nBr1D1GrwspK9RhQtfxmIp6/k3RhA/CaONG+5QXRBJsHhKSM5ynT/o3KrIc69+p0LguE6RejrHlCmM7er1D8erZsJtVx5JsJhvV2QCPEYC4/bStmFZkmDR7/O2M1ST4Xb0JtQJlsysfPLlFfZAkARLAJ09P9+xg98mZHymmgC3y+UrqRSVWAWW04MHrz17PrBPK9hVZtZ5errxUHhh8scdD3amR58fQC81HUMftZpOPCVm/+ErXUmYdz+d5LoJ5AHW/lnZ2NS0evB2tPUMlC/azYQfpEY8+8ow+uDLqdSu+zwaOGIVHKhMy+gTH8FIsLD3v5gKYxrxeMNB1PSzyaqvzHE97YPqb1Xa9vLmw5bTYN824tYanVwDQ/PsRL2HLqdBavvhqp86Z1EdkONxGaqJcLt5wwkIdDysatDIVa6B9njwQl+fpCvFA7Fq28uJNm0/Afub0/F1mm+StO2lhyRYAoM/z9GxEp4qul5IgkUfHqfLlyeNQ51gYXyNQ7GDTRIsAVZ46TDtT7gDJgrsaHfM/6MzeVNV1b20x+UjrrFSUNnyRMT+DyVlfk0Xi2UMBzOYcUMXapysWbb6oKoOrmMgFBReotrP94cfpoHEN4zafSlPsBIsGZl5dHuNjjCuaEXncgpUM+G2K4vH0eAbG9TPnS7l1DnVRLjdvFm76Rg8Hk7X8M0RqnlwmzkRP0mJ+pxT8TXV6CsBZUmCJXAavDUSHjPhTttuWpJg0eeHWb7NIhoOCRbmy+yfZpMESxBcv15Ep872dQ32ipIHdnH81At0sThGVRm3Q27BKoqI/S9Y1pvDyY/QmbwpdO26jNlgtrFTN8MLlBXUeKp3yF4d4Av0XbW6wA/UQAnXBAuLjEqGcYX+BAs7diJNZjgB8vKN/5ouCRYsLvGMah7cZk7Vtd8S2O+caOX68sevqIgkWAIn6+wFuv/JXvC4iRIvv/e9aircfqUkwVIxf14jDZcEC/NlcgozSYIliHiWoZjTb8JEgpXx6z65BWtVFXG9WXrOKFgWKX1apejyUVUUxxPmOHA4harU6QkvVuGqyWeTqaDQ2LgvZjsSfTqoT26Ec4KFLV5xAMZ2OiMJFubveCx2wzcU2jbSQxIsnr4dtEw1DW4vp+szbAXsf04y9SfffrEuSxIsgcXfA2TqZu9mL9qrmgm3XSlJsJSPx8fLPJOvmgq3X0XCKcHCRk4IXZJFEiwhkF+0lY6efAImF6wkMv6fFc7eU3w1jY6lPAPLa0WnNqSsvOmqGI4lAuNcbgF91nYGvGCFk5uqdSB+7E+7/6ESE5cRtCdZwj3BwiTJ4slogoUtWRkF+78T8dgD2vbRQxIs7p5+aYhqFtxWosTEH7fBPugEZs0MKAmWwNt/6KRrvC10HJ2sVv2+qnlwm5UlCZby8Y882jYzItwSLGzMpI1wW4EmCZYQOl+005JTOu9PuI0ycseqKuB6lcrK/4kiYv8KY5Q6fqqRK6nC01try4vg2rwjhqo/EZ6PoL6vvrjxAL3afQ610+m5VLfhQPjhaiYrJFjYmg1H6cYq7eB2nMiXBAvbsPV4QAaEthKehtqX14OYJFh+df/j3wZt9jKr27k3wTVgO+qPdsTjPvErntp28JUkWIKDZ4Ss+8JgeEydauO246ppcHuVJQkWjJ9cOXgkVTURbje9wjHBwlZvOBL076aSYAkDBZf204lTL8MERDiJSqpKZ/KmqV3G9SjFUzOfONUYxmBc16z8GXTtevjdMAv6zejJm+i+x7rDi1iw8VTOW3eF/8DGnXsvhB+wZrFKgoUlncym2v8eALflNL4mWFjUkRR6sF5feF44wfQ5u1Qz4LapiCRYSrz49iifZoJwMh7r4r3Pp8A+aSc829iFgkuqyrgdfCEJluApKiqmdj0XwGPrNEZeb5MEiyf+vsZJO21b+SJcEyyMxyB755OJcLuBIAmWMHLl2lnXKzc8sCtKTIRCZNw/XOOhXLhY8buNLDW7F+2J+ZNbjIjY/6bYtHfo7PkFMlithSxafoCeaDQEXtACrUXbmT5NzxpKh46mUv3GQ+EHrb+slGApNXbKJtdUf2ibTuFPgqUUD0bttEfC+QZX2w5GSIKlFXXvv0Q1BW4fUbHVG49SzXp9YP+0soZvjaKD6lqlra8ZJMESfPsOnqTaDQbCY+0EIydsUM2A2waRBIu71l3mqGbBbeWLcE6wlNq2K5aefHEw3L6ZJMESpi4Wx1Fqdk86lPSAW7IiGPbG3UDx6R9TXuE6tSt4/7TOXVhM++Jv+SVGVOK9lJj5BeVc8O0dehE+IvYn0cdfT4cXNzPxYLvfjV1HPCaMdh+sZN7ivVT5se7wA9dXVkywMP71fPCo1UGfdSlcmJFgYdyOXfouhueN3TT70vs0/3o5OcHyxAuDiD+ztW0ifDNvaSQ99Ew/2Fet5KNW02lXZIKqEq6nGSTBEjo/rzlEdRsOgsferuao71radqiIJFhKfNN1LqWcOqeaBLeTr6yQYCm1Yu0h1/US7YcZJMFiATxQbGbuRDp+6iXaE/Nnt2SIOX5Lh5MfptTs3lRwcZ/aJN4PJLdgtSr7EO2Lv4ni0z+g7PxZxLMladcT1pdxJp9mLYygTr0X0TOvfgcveEbc+2h3eqf5JBoyZg1t2n5CbQJv16rWbT5GX7Sb6RoDAX34GmHVBEtZM+ftDsp4NeHErARLKR6TZMGy/dS0xRTbTel898Pd6KcFEaqauO5GODHB0vSzybrHIRDGcXKCn6ysWvdb2H/DEb9iOGriBso+d0FVAdfLTJJgCT3upy07zaabq3eAfcIOnn1tOB06ekpVF7dBeZyaYKlUua3rldEBw1dSZlbgxry0UoKlFM+m2rLjLKrxRC+4T76SBIsFXSpOoNyCNZSR8z0lnWntGij2yMnadDCpOu1PuMP1BErpazo8yCw/WRKVWNmVRDmW+iwlZDSn0+cG0dnzC6nw0iG6dt34TcClK0mupE9m3mTip220fxfOwNMVz5y/h9p/u4BeajqG6jQY6HoShWf84Qvh7TU70wNP96GnGw913RQOHr2G1m2OJk7WaGPZGV90+OZn2PdrqdnnU6jRO6MN4S8F2pjl4Xfru/ZdrIu2bKDxu77L1xyiQSNX0dedZ9PbH0+gei8Ppap1esCLlJWZnWDR4vGJeKad1z4Y50pYar+IhjN+7YkHavy83U+uXyJ5TAFt/XzFA3ei88hO3lDHnH+FnPTjtoD3M+GOP1937ImncT9soa+7zKEX1I0LJzOC/SofDwTN2+XtN/tiKrXtMZ+GjV1HazcfM21MBSMkwRJeuI/yFOT8WpjVEy531uriGjfI3yRy/vmL1KXvIlvr1m8JDR2zxjXrJv/YwOPiadshkND3TL20sYKNP9t3Rya4rqv8+hQnpR6q34duU5+16HOrPJJgEUIIIYQQQggb4wSDlZiZeBciuOg3/x+hpCo5pwd9qwAAAABJRU5ErkJggg==" alt="Óticas Brasil" width="140" style="display:block;margin:0 auto 16px;height:auto;" /><h1 style="margin:0;font-size:22px;font-weight:700;color:#051647;letter-spacing:-0.3px;">Verifique seu e-mail</h1><p style="margin:8px 0 0;font-size:14px;color:#5a6178;line-height:1.5;">Para concluir seu cadastro, utilize o código abaixo:</p></td></tr><tr><td style="padding:32px;text-align:center;"><div style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#f9fafb 0%,#f0f4ff 100%);border:2px dashed #C4D600;border-radius:12px;"><span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#051647;font-family:'Courier New',monospace;">${code}</span></div><p style="margin:20px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Este código expira em <strong style="color:#051647;">10 minutos</strong>.</p></td></tr><tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #f0f1f5;text-align:center;"><p style="margin:0;font-size:12px;color:#8b92a8;line-height:1.5;">Se você não solicitou este código, ignore este e-mail.<br>Sua conta permanece segura.</p></td></tr><tr><td style="padding:16px 32px;text-align:center;"><p style="margin:0;font-size:11px;color:#b0b7c8;">Óticas Brasil · Loja Online<br><a href="mailto:suporte@oticasbrasil.com.br" style="color:#4156b8;text-decoration:none;">suporte@oticasbrasil.com.br</a></p></td></tr></table></td></tr></table></body></html>`,
    });
  } catch (error) {
    console.error('Falha ao enviar OTP via Resend:', error.message || error);
  }
};

app.post('/api/auth/register/send-otp', requireSameOrigin, limitAttempts, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 160) : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const cpf = typeof req.body?.cpf === 'string' ? req.body.cpf.replace(/\D/g, '').slice(0, 11) : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '').slice(0, 11) : '';
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(res, 400, 'Informe seu nome e um e-mail válido.');
    }
    if (password.length < 10 || password.length > 256) {
      return jsonError(res, 400, 'A senha deve ter pelo menos 10 caracteres.');
    }
    if (cpf.length !== 11) {
      return jsonError(res, 400, 'CPF inválido. Informe os 11 dígitos.');
    }
    if (phone.length < 10 || phone.length > 11) {
      return jsonError(res, 400, 'Telefone inválido. Informe DDD + número.');
    }

    const { rows: existing } = await pool.query(
      'SELECT email, cpf, phone FROM customers WHERE email = $1 OR cpf = $2 OR phone = $3 LIMIT 1',
      [email, cpf, phone],
    );
    if (existing[0]?.email === email) return jsonError(res, 409, 'Já existe uma conta com este e-mail. Entre na sua conta.');
    if (existing[0]?.cpf === cpf) return jsonError(res, 409, 'Já existe uma conta cadastrada com este CPF.');
    if (existing[0]?.phone === phone) return jsonError(res, 409, 'Já existe uma conta cadastrada com este telefone.');

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await pool.query(
      `INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email, code, expiresAt],
    );
    await sendOtpEmail(email, code);

    res.json({ message: 'Código de verificação enviado para o seu e-mail.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register/verify-otp', requireSameOrigin, limitAttempts, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 160) : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const cpf = typeof req.body?.cpf === 'string' ? req.body.cpf.replace(/\D/g, '').slice(0, 11) : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '').slice(0, 11) : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return jsonError(res, 400, 'Informe o código de 6 dígitos recebido por e-mail.');
    }
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(res, 400, 'Dados inválidos. Reinicie o cadastro.');
    }
    if (password.length < 10 || password.length > 256) {
      return jsonError(res, 400, 'A senha deve ter pelo menos 10 caracteres.');
    }
    if (cpf.length !== 11) {
      return jsonError(res, 400, 'CPF inválido. Informe os 11 dígitos.');
    }
    if (phone.length < 10 || phone.length > 11) {
      return jsonError(res, 400, 'Telefone inválido. Informe DDD + número.');
    }

    const { rows: otpRows } = await pool.query(
      `SELECT id FROM email_verifications
       WHERE email = $1 AND code = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code],
    );
    if (!otpRows[0]) {
      return jsonError(res, 400, 'Código inválido ou expirado. Solicite um novo.');
    }

    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    let rows;
    try {
      await client.query('BEGIN');
      await client.query('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [otpRows[0].id]);
      ({ rows } = await client.query(
        `INSERT INTO customers (id, email, password_hash, name, cpf, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, name, cpf, phone, address, updated_at`,
        [randomUUID(), email, passwordHash, name, cpf, phone],
      ));
      if (rows[0]) await enqueueCustomer(client, rows[0]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    if (!rows[0]) {
      const { rows: dup } = await pool.query(
        'SELECT email, cpf, phone FROM customers WHERE email = $1 OR cpf = $2 OR phone = $3 LIMIT 1',
        [email, cpf, phone],
      );
      if (dup[0]?.cpf === cpf) return jsonError(res, 409, 'Já existe uma conta cadastrada com este CPF.');
      if (dup[0]?.phone === phone) return jsonError(res, 409, 'Já existe uma conta cadastrada com este telefone.');
      return jsonError(res, 409, 'Já existe uma conta com este e-mail. Entre na sua conta.');
    }
    const user = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      cpf: rows[0].cpf,
      phone: rows[0].phone,
      address: rows[0].address,
      role: 'customer',
    };
    await req.resetLoginAttempts();
    await createSession(res, user);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', requireSameOrigin, limitAttempts, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const { rows } = await pool.query(
      'SELECT id, email, name, cpf, phone, address, password_hash, blocked FROM customers WHERE email = $1',
      [email],
    );
    if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) {
      return jsonError(res, 401, 'E-mail ou senha incorretos.');
    }
    if (rows[0].blocked) {
      return jsonError(res, 403, 'Sua conta não está disponível. Entre em contato com a loja.');
    }
    const user = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      cpf: rows[0].cpf,
      phone: rows[0].phone,
      address: rows[0].address,
      role: 'customer',
    };
    await req.resetLoginAttempts();
    await createSession(res, user);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/session', async (req, res, next) => {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'customer') return res.json({ user: null });
    const { rows } = await pool.query(
      'SELECT cpf, phone, address, blocked FROM customers WHERE id = $1',
      [session.id],
    );
    if (!rows[0] || rows[0].blocked) return res.json({ user: null });
    res.json({
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        cpf: rows[0]?.cpf || '',
        phone: rows[0]?.phone || '',
        address: rows[0]?.address || {},
      },
    });
  } catch (error) {
    next(error);
  }
});

/* ---------- Google OAuth ---------- */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

app.get('/api/auth/google/url', (_req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return jsonError(res, 501, 'Google OAuth não configurado no servidor.');
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

app.post('/api/auth/google/callback', requireSameOrigin, limitAttempts, async (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return jsonError(res, 501, 'Google OAuth não configurado no servidor.');
  }
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) return jsonError(res, 400, 'Código de autorização ausente.');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[google-oauth] Token exchange failed:', errText);
      return jsonError(res, 401, 'Falha na autenticação com Google.');
    }
    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userInfoResponse.ok) return jsonError(res, 401, 'Não foi possível obter dados do Google.');
    const googleUser = await userInfoResponse.json();

    if (!googleUser.sub || !googleUser.email || !googleUser.email_verified) {
      return jsonError(res, 400, 'Conta Google não verificada ou sem e-mail.');
    }

    const email = googleUser.email.toLowerCase().slice(0, 254);
    const name = (googleUser.name || googleUser.email.split('@')[0]).slice(0, 160);
    const googleSub = googleUser.sub;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Try to find existing user by google_sub or email
      let { rows } = await client.query(
        'SELECT id, email, name, cpf, phone, address, blocked FROM customers WHERE google_sub = $1 OR email = $2 LIMIT 1',
        [googleSub, email],
      );

      let userRow = rows[0];

      if (!userRow) {
        // Create new customer with Google auth
        ({ rows } = await client.query(
          `INSERT INTO customers (id, email, google_sub, name)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, name, cpf, phone, address`,
          [randomUUID(), email, googleSub, name],
        ));
        userRow = rows[0];
        await enqueueCustomer(client, userRow);
      } else if (!userRow.google_sub && userRow.email === email) {
        // Link existing email account to Google
        await client.query(
          'UPDATE customers SET google_sub = $1 WHERE id = $2',
          [googleSub, userRow.id],
        );
      }

      if (userRow.blocked) {
        await client.query('ROLLBACK');
        return jsonError(res, 403, 'Sua conta não está disponível. Entre em contato com a loja.');
      }

      await client.query('COMMIT');

      const user = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        cpf: userRow.cpf,
        phone: userRow.phone,
        address: userRow.address,
        role: 'customer',
      };
      await req.resetLoginAttempts();
      await createSession(res, user);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          cpf: user.cpf,
          phone: user.phone,
          address: user.address,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireSameOrigin, async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.patch('/api/auth/profile', requireSameOrigin, requireCustomer, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 160) : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const cpf = typeof req.body?.cpf === 'string' ? req.body.cpf.replace(/\D/g, '') : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().slice(0, 40) : '';
    const address = req.body?.address && typeof req.body.address === 'object'
      ? {
          cep: String(req.body.address.cep || '').slice(0, 16),
          street: String(req.body.address.street || '').slice(0, 180),
          number: String(req.body.address.number || '').slice(0, 30),
          complement: String(req.body.address.complement || '').slice(0, 120),
          neighborhood: String(req.body.address.neighborhood || '').slice(0, 120),
          city: String(req.body.address.city || '').slice(0, 120),
          state: String(req.body.address.state || '').slice(0, 2).toUpperCase(),
        }
      : null;
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(res, 400, 'Informe seu nome e um e-mail válido.');
    }
    if (cpf && cpf.length !== 11) return jsonError(res, 400, 'Informe um CPF válido.');
    if (phone && phone.replace(/\D/g, '').length < 10) return jsonError(res, 400, 'Informe um telefone válido.');

    const client = await pool.connect();
    let rows;
    try {
      await client.query('BEGIN');
      ({ rows } = await client.query(
      `UPDATE customers
       SET name = $1, email = $2, cpf = $3, phone = $4,
           address = COALESCE($5::jsonb, address), updated_at = NOW()
       WHERE id = $6 RETURNING id, email, name, cpf, phone, address, updated_at`,
      [name, email, cpf || null, phone || null, address ? JSON.stringify(address) : null, req.session.id],
      ));
      if (rows[0]) await enqueueCustomer(client, rows[0]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    if (!rows[0]) return jsonError(res, 404, 'Conta não encontrada.');
    const updatedSession = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      cpf: rows[0].cpf,
      phone: rows[0].phone,
      address: rows[0].address,
      role: 'customer',
    };
    await redis.set(`session:${req.session.token}`, JSON.stringify(updatedSession), { EX: sessionLifetimeSeconds });
    res.json({ user: updatedSession });
  } catch (error) {
    if (error?.code === '23505') return jsonError(res, 409, 'Este e-mail já está em uso.');
    next(error);
  }
});

registerAdminRoutes(app, {
  pool,
  jsonError,
  hashPassword,
  verifyPassword,
  getSession,
  createSession,
  destroySession,
  requireSameOrigin,
  limitAttempts,
  loadStoreState,
  currentProducts,
  enqueueOrderEvent: enqueueOrder,
  enqueueIntegrationEvent,
  enqueueHistoricalSync,
  integrationConfigured,
  getStorePromotions: (state) => ({
    coupons: state?.coupons || seedCoupons,
    discountPolicies: Array.isArray(state?.discountPolicies) ? state.discountPolicies : [],
  }),
});

app.get('/api/cart', requireCustomer, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT items FROM carts WHERE customer_id = $1', [req.session.id]);
    res.json({ items: rows[0]?.items || [] });
  } catch (error) {
    next(error);
  }
});

app.put('/api/cart', requireSameOrigin, requireCustomer, async (req, res, next) => {
  const client = await pool.connect().catch(next);
  if (!client) return;
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length > 100) return jsonError(res, 400, 'O carrinho é inválido.');
    const sanitized = [];
    for (const item of items) {
      if (!item || typeof item.productId !== 'string' || !Number.isInteger(item.quantity) ||
          item.quantity < 1 || item.quantity > 99) {
        return jsonError(res, 400, 'Há um item inválido no carrinho.');
      }
      sanitized.push({
        productId: item.productId.slice(0, 120),
        quantity: item.quantity,
        options: item.options && typeof item.options === 'object' ? item.options : {},
      });
    }
    await client.query('BEGIN');
    const { rows: cartRows } = await client.query(
      `INSERT INTO carts (customer_id, items, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (customer_id) DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()
       RETURNING updated_at`,
      [req.session.id, JSON.stringify(sanitized)],
    );
    const { rows: customerRows } = await client.query(
      `SELECT id, name, email, phone, cpf, address, updated_at
       FROM customers WHERE id = $1`,
      [req.session.id],
    );
    const state = await loadStoreState();
    const products = new Map(currentProducts(state).map((product) => [product.id, product]));
    const total = sanitized.reduce((sum, item) => {
      const product = products.get(item.productId);
      return sum + (Number(product?.price) || 0) * item.quantity;
    }, 0);
    await enqueueIntegrationEvent(client, 'cart.upsert', {
      customerId: req.session.id,
      updatedAt: cartRows[0].updated_at,
      items: sanitized.map((item) => {
        const product = products.get(item.productId);
        return {
          ...item,
          name: product?.name || item.productId,
          unitPrice: Number(product?.price) || 0,
        };
      }),
      total: Math.round(total * 100) / 100,
      customer: customerRows[0] ? {
        customerId: customerRows[0].id,
        sourceUpdatedAt: customerRows[0].updated_at,
        name: customerRows[0].name,
        email: customerRows[0].email,
        phone: customerRows[0].phone,
        cpf: customerRows[0].cpf,
        address: customerRows[0].address || {},
      } : null,
    });
    await client.query('COMMIT');
    res.json({ items: sanitized });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/orders', requireSameOrigin, requireCustomer, async (req, res, next) => {
  const client = await pool.connect().catch(next);
  if (!client) return;
  try {
    const { items, address, deliveryMethod, paymentMethod, prescription, couponCode } = req.body || {};
    if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
      return jsonError(res, 400, 'Adicione produtos válidos ao pedido.');
    }
    if (!address || typeof address !== 'object' || !['sedex', 'boutique'].includes(deliveryMethod)) {
      return jsonError(res, 400, 'Informe uma opção de entrega válida.');
    }
    if (!['pix', 'card', 'boleto'].includes(paymentMethod)) {
      return jsonError(res, 400, 'Informe uma forma de pagamento válida.');
    }
    const settings = await loadSettings(pool);
    if (settings.maintenance.enabled) {
      return jsonError(res, 503, 'A loja está em manutenção. Tente novamente em instantes.');
    }
    if (!settings.payment[paymentMethod].enabled) {
      return jsonError(res, 400, 'Esta forma de pagamento não está disponível no momento.');
    }
    const deliveryEnabled = deliveryMethod === 'boutique' ? settings.delivery.pickupEnabled : settings.delivery.homeEnabled;
    if (!deliveryEnabled) {
      return jsonError(res, 400, 'Esta opção de entrega não está disponível no momento.');
    }

    const { rows: customerRows } = await pool.query(
      'SELECT name, cpf, phone FROM customers WHERE id = $1',
      [req.session.id],
    );
    if (
      !customerRows[0] ||
      customerRows[0].name.trim().length < 2 ||
      String(customerRows[0].cpf || '').replace(/\D/g, '').length !== 11 ||
      String(customerRows[0].phone || '').replace(/\D/g, '').length < 10
    ) {
      return jsonError(res, 400, 'Complete seu nome, CPF e telefone antes de finalizar o pedido.');
    }
    const safeAddress = {
      cep: String(address.cep || '').slice(0, 16),
      street: String(address.street || '').slice(0, 180),
      number: String(address.number || '').slice(0, 30),
      complement: String(address.complement || '').slice(0, 120),
      neighborhood: String(address.neighborhood || '').slice(0, 120),
      city: String(address.city || '').slice(0, 120),
      state: String(address.state || '').slice(0, 2).toUpperCase(),
    };
    if (
      deliveryMethod === 'sedex' &&
      (
        safeAddress.cep.replace(/\D/g, '').length !== 8 ||
        !safeAddress.street.trim() ||
        !safeAddress.number.trim() ||
        !safeAddress.city.trim() ||
        !/^[A-Z]{2}$/.test(safeAddress.state)
      )
    ) {
      return jsonError(res, 400, 'Preencha um endereço de entrega válido.');
    }

    const state = await loadStoreState();
    const products = new Map(currentProducts(state).map((product) => [product.id, product]));
    const orderItems = [];
    for (const item of items) {
      const product = products.get(item?.productId);
      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return jsonError(res, 400, 'Um produto do pedido está indisponível ou inválido.');
      }
      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) {
        return jsonError(res, 400, 'O preço de um produto está inválido.');
      }
      orderItems.push({
        product,
        quantity: item.quantity,
        options: item.options && typeof item.options === 'object' ? item.options : {},
        unitPrice: Math.round(price * 100) / 100,
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    let discount = 0;

    // Validate and apply policy discount server-side
    const { policyId, policyDiscount: clientPolicyDiscount } = req.body || {};
    let appliedPolicyDiscount = 0;
    if (policyId && typeof policyId === 'string') {
      const policies = await loadPoliciesWithProducts(pool);
      const policy = policies.find((p) => p.id === policyId && p.active);
      if (policy) {
        // Check expiration
        let expired = false;
        if (policy.duration && policy.createdAt) {
          const durationMs = policy.duration.value * (policy.duration.unit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
          if (Date.now() > new Date(policy.createdAt).getTime() + durationMs) expired = true;
        }
        // Check product scope
        let inScope = true;
        if (!policy.allProducts && policy.productIds?.length) {
          const orderProductIds = orderItems.map((i) => i.product.id);
          inScope = policy.productIds.some((pid) => orderProductIds.includes(pid));
        }
        // Check trigger conditions
        let triggerMet = false;
        const totalItems = orderItems.reduce((sum, i) => sum + i.quantity, 0);
        switch (policy.trigger) {
          case 'cart_value': {
            const op = policy.valueOperator || 'minimum';
            if (op === 'minimum' && subtotal >= (policy.minCartValue || 0)) triggerMet = true;
            else if (op === 'maximum' && subtotal <= (policy.maxCartValue || Infinity)) triggerMet = true;
            else if (op === 'between' && subtotal >= (policy.minCartValue || 0) && subtotal <= (policy.maxCartValue || Infinity)) triggerMet = true;
            break;
          }
          case 'item_quantity': {
            const op = policy.quantityOperator || 'minimum';
            if (op === 'minimum' && totalItems >= (policy.minItems || 0)) triggerMet = true;
            else if (op === 'maximum' && totalItems <= (policy.maxItems || Infinity)) triggerMet = true;
            else if (op === 'between' && totalItems >= (policy.minItems || 0) && totalItems <= (policy.maxItems || Infinity)) triggerMet = true;
            break;
          }
          case 'first_purchase':
          case 'new_customer': {
            const { rows: orderCountRows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM orders WHERE customer_id = $1', [req.session.id]);
            triggerMet = (orderCountRows[0]?.cnt || 0) === 0;
            break;
          }
          case 'returning_customer': {
            const { rows: orderCountRows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM orders WHERE customer_id = $1', [req.session.id]);
            triggerMet = (orderCountRows[0]?.cnt || 0) > 1;
            break;
          }
          default:
            break;
        }
        if (!expired && inScope && triggerMet) {
          appliedPolicyDiscount = policy.discountType === 'percentage'
            ? (subtotal * policy.discountValue) / 100
            : policy.discountValue;
          appliedPolicyDiscount = Math.min(subtotal, Math.max(0, appliedPolicyDiscount));
        }
      }
    }
    discount += appliedPolicyDiscount;

    const normalizedCode = normalizeCouponCode(couponCode);
    if (normalizedCode) {
      const coupons = state?.coupons || seedCoupons;
      const coupon = coupons[normalizedCode];
      const isActive = coupon && coupon.active !== false;
      const expiration = coupon?.expiresAt
        ? new Date(`${String(coupon.expiresAt).slice(0, 10)}T23:59:59`).getTime()
        : null;
      const hasExpired = expiration !== null && expiration < Date.now();
      const meetsMinimum = !coupon?.minSubtotal || subtotal >= Number(coupon.minSubtotal);
      if (isActive && !hasExpired && meetsMinimum) {
        const couponDiscount = coupon.discountPercent
          ? subtotal * Number(coupon.discountPercent) / 100
          : Number(coupon.discountAmount || 0);
        discount += Math.min(subtotal - appliedPolicyDiscount, Math.max(0, couponDiscount));
      } else {
        return jsonError(res, 400, 'O cupom informado não é válido para este pedido.');
      }
    }
    if (paymentMethod === 'pix') discount += (subtotal - discount) * settings.payment.pix.discountPercent / 100;
    discount = Math.round(discount * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO orders
        (id, customer_id, status, payment_status, payment_method, delivery_method, address, prescription, coupon_code, subtotal, discount, total)
       VALUES ($1, $2, 'awaiting_payment', 'demo_unpaid', $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10)
       RETURNING id, status, payment_status, payment_method, delivery_method, subtotal, discount, total, created_at`,
      [
        randomUUID(),
        req.session.id,
        paymentMethod,
        deliveryMethod,
        JSON.stringify(safeAddress),
        prescription && typeof prescription === 'object' ? JSON.stringify(prescription) : null,
        normalizedCode || null,
        subtotal,
        discount,
        total,
      ],
    );
    const order = rows[0];
    await client.query(
      'UPDATE customers SET address = $1::jsonb, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(safeAddress), req.session.id],
    );
    for (const item of orderItems) {
      const productSnapshot = { ...item.product, selectedOptions: item.options };
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_snapshot, quantity, unit_price)
         VALUES ($1, $2, $3::jsonb, $4, $5)`,
        [order.id, item.product.id, JSON.stringify(productSnapshot), item.quantity, item.unitPrice],
      );
    }
    await enqueueOrder(client, order.id);
    await client.query('COMMIT');
    res.status(201).json({
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        deliveryMethod: order.delivery_method,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        total: Number(order.total),
        createdAt: order.created_at,
        paymentDemo: true,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.get('/api/orders', requireCustomer, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.payment_status, o.payment_method, o.delivery_method,
              o.subtotal, o.discount, o.total, o.created_at,
              COALESCE(json_agg(json_build_object(
                'productId', i.product_id,
                'product', i.product_snapshot,
                'quantity', i.quantity,
                'unitPrice', i.unit_price
              )) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
       FROM orders o
       LEFT JOIN order_items i ON i.order_id = o.id
       WHERE o.customer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.session.id],
    );
    res.json({ orders: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/customer/status', requireCustomer, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS order_count,
              MIN(created_at) AS first_order_at,
              MAX(created_at) AS last_order_at
         FROM orders
        WHERE customer_id = $1`,
      [req.session.id],
    );
    const stats = rows[0] || {};
    const hasOrders = (stats.order_count || 0) > 0;
    res.json({
      hasOrders,
      orderCount: stats.order_count || 0,
      isFirstPurchase: !hasOrders,
      isReturningCustomer: hasOrders && (stats.order_count || 0) > 1,
      firstOrderAt: stats.first_order_at || null,
      lastOrderAt: stats.last_order_at || null,
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => jsonError(res, 404, 'Endpoint não encontrado.'));
app.use(express.static(path.join(root, 'dist'), { index: false, maxAge: '1h' }));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));

app.use((error, _req, res, _next) => {
  console.error('Erro da API:', error);
  if (res.headersSent) return;
  jsonError(res, 500, 'Não foi possível concluir a solicitação. Tente novamente.');
});

const start = async () => {
  seed = await readSeed();
  seedProducts = seed.products;
  seedCoupons = seed.coupons;
  await Promise.all([redis.connect(), migrationPool.connect().then((client) => client.release())]);
  const schema = await readFile(path.join(root, 'server', 'schema.sql'), 'utf8');
  await migrationPool.query(schema);
  const adminHash = await hashPassword(process.env.ADMIN_PASSWORD);
  await migrationPool.query(
    `INSERT INTO admin_users (name, email, password_hash, role)
     SELECT 'Administrador', $1, $2, 'owner'
     WHERE NOT EXISTS (SELECT 1 FROM admin_users)`,
    [process.env.ADMIN_EMAIL.trim().toLowerCase(), adminHash],
  );
  let poolReady = false;
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      await pool.query('SELECT 1');
      poolReady = true;
      break;
    } catch (error) {
      if (attempt === 15) throw error;
      console.warn(`PgBouncer ainda não está pronto (tentativa ${attempt}/15).`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (!poolReady) throw new Error('Não foi possível conectar ao banco de dados pelo PgBouncer.');
  const currentState = await loadStoreState();
  await enqueueIntegrationEvent(pool, 'promotions.snapshot', {
    coupons: currentState?.coupons || seedCoupons,
    discountPolicies: Array.isArray(currentState?.discountPolicies) ? currentState.discountPolicies : [],
  });
  startIntegrationWorker(pool);
  createServer(app).listen(port, '0.0.0.0', () => {
    console.info(`Óticas Brasil disponível na porta ${port}.`);
  });
};

start().catch((error) => {
  console.error('Não foi possível iniciar a aplicação:', error);
  process.exitCode = 1;
});
