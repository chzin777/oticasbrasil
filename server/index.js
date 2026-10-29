import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import pg from 'pg';
import { createClient } from 'redis';
import { registerAdminRoutes } from './admin.js';
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

const INTEGRATION_API_URL = process.env.INTEGRATION_API_URL || 'http://oticas-integration-api:4000';
const INTEGRATION_API_KEY = process.env.INTEGRATION_API_KEY || '';

app.get('/api/integration/products', async (req, res, next) => {
  if (!INTEGRATION_API_KEY) return jsonError(res, 503, 'Chave da API de integração não configurada.');
  try {
    const url = new URL('/v1/products', INTEGRATION_API_URL);
    if (req.query.limit) url.searchParams.set('limit', String(req.query.limit));
    if (req.query.offset) url.searchParams.set('offset', String(req.query.offset));
    const response = await fetch(url.toString(), {
      headers: { 'x-api-key': INTEGRATION_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`API respondeu HTTP ${response.status}`);
    const data = await response.json();
    res.json(data);
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

app.post('/api/auth/register', requireSameOrigin, limitAttempts, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 160) : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(res, 400, 'Informe seu nome e um e-mail válido.');
    }
    if (password.length < 10 || password.length > 256) {
      return jsonError(res, 400, 'A senha deve ter pelo menos 10 caracteres.');
    }

    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    let rows;
    try {
      await client.query('BEGIN');
      ({ rows } = await client.query(
      `INSERT INTO customers (id, email, password_hash, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name, cpf, phone, address, updated_at`,
      [randomUUID(), email, passwordHash, name],
      ));
      if (rows[0]) await enqueueCustomer(client, rows[0]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    if (!rows[0]) return jsonError(res, 409, 'Já existe uma conta com este e-mail. Entre na sua conta.');
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
        discount = coupon.discountPercent
          ? subtotal * Number(coupon.discountPercent) / 100
          : Number(coupon.discountAmount || 0);
        discount = Math.min(subtotal, Math.max(0, discount));
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
