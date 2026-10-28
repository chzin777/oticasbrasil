import { loadSettings, normalizeSettings, SettingsError, validateSettings } from './settings.js';

export const ROLES = {
  owner: {
    label: 'Proprietário',
    permissions: ['catalog', 'orders', 'customers', 'settings', 'team', 'audit'],
  },
  manager: {
    label: 'Gerente',
    permissions: ['catalog', 'orders', 'customers', 'settings', 'audit'],
  },
  editor: {
    label: 'Editor de catálogo',
    permissions: ['catalog'],
  },
  support: {
    label: 'Atendimento',
    permissions: ['orders', 'customers'],
  },
};

const ORDER_STATUSES = ['awaiting_payment', 'payment_confirmed', 'processing', 'shipped', 'completed', 'canceled'];
const PAYMENT_STATUSES = ['demo_unpaid', 'paid', 'refunded'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: ROLES[user.role]?.permissions ?? [],
});

export const registerAdminRoutes = (app, deps) => {
  const {
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
    enqueueIntegrationEvent,
    getStorePromotions,
    enqueueOrderEvent,
    enqueueHistoricalSync,
    integrationConfigured,
  } = deps;

  const findActiveAdmin = async (id) => {
    if (!UUID.test(String(id))) return null;
    const { rows } = await pool.query(
      'SELECT id, name, email, role, active FROM admin_users WHERE id = $1',
      [id],
    );
    return rows[0]?.active && ROLES[rows[0].role] ? rows[0] : null;
  };

  const requireAdmin = (permission) => async (req, res, next) => {
    try {
      const session = await getSession(req);
      const admin = session?.role === 'admin' ? await findActiveAdmin(session.id) : null;
      if (!admin) return jsonError(res, 401, 'Acesso administrativo necessário.');
      if (permission && !ROLES[admin.role].permissions.includes(permission)) {
        return jsonError(res, 403, 'Você não tem permissão para esta ação.');
      }
      req.admin = admin;
      next();
    } catch (error) {
      next(error);
    }
  };

  const audit = async (actor, action, entity, entityId, details = {}) => {
    try {
      await pool.query(
        `INSERT INTO audit_log (actor_id, actor_name, action, entity, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [actor?.id ?? null, actor?.name ?? 'Sistema', action, entity, entityId ? String(entityId) : null, JSON.stringify(details)],
      );
    } catch (error) {
      console.error('Falha ao registrar atividade:', error.message);
    }
  };

  const validId = (req, res) => {
    if (UUID.test(req.params.id)) return true;
    jsonError(res, 400, 'Identificador inválido.');
    return false;
  };

  /* ---------- Sessão ---------- */

  app.get('/api/admin/session', async (req, res, next) => {
    try {
      const session = await getSession(req);
      const admin = session?.role === 'admin' ? await findActiveAdmin(session.id) : null;
      res.json(admin ? { authenticated: true, user: publicUser(admin) } : { authenticated: false });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/login', requireSameOrigin, limitAttempts, async (req, res, next) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const { rows } = await pool.query(
        'SELECT id, name, email, role, active, password_hash FROM admin_users WHERE email = $1',
        [email],
      );
      const user = rows[0];
      const valid = user && (await verifyPassword(password, user.password_hash));
      if (!valid || !user.active || !ROLES[user.role]) {
        return jsonError(res, 401, 'E-mail ou senha incorretos.');
      }
      await req.resetLoginAttempts();
      await pool.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      await createSession(res, { id: user.id, email: user.email, name: user.name, role: 'admin' });
      await audit(user, 'auth.login', 'admin_user', user.id);
      res.json({ authenticated: true, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/logout', requireSameOrigin, async (req, res, next) => {
    try {
      await destroySession(req, res);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  /* ---------- Conta do administrador logado ---------- */

  app.patch('/api/admin/me', requireSameOrigin, requireAdmin(), async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (name.length < 2 || name.length > 120) return jsonError(res, 400, 'Informe um nome com 2 a 120 caracteres.');
      await pool.query('UPDATE admin_users SET name = $1, updated_at = NOW() WHERE id = $2', [name, req.admin.id]);
      const user = { ...req.admin, name };
      await audit(user, 'account.update', 'admin_user', user.id);
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/admin/password', requireSameOrigin, requireAdmin(), async (req, res, next) => {
    try {
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const { rows } = await pool.query('SELECT password_hash FROM admin_users WHERE id = $1', [req.admin.id]);
      if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
        return jsonError(res, 401, 'A senha atual está incorreta.');
      }
      if (newPassword.length < 12 || newPassword.length > 256) {
        return jsonError(res, 400, 'A nova senha deve ter pelo menos 12 caracteres.');
      }
      await pool.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [await hashPassword(newPassword), req.admin.id],
      );
      await audit(req.admin, 'account.password_changed', 'admin_user', req.admin.id);
      res.json({ changed: true });
    } catch (error) {
      next(error);
    }
  });

  /* ---------- Estado do catálogo ---------- */

  app.get('/api/admin/state', requireAdmin(), async (_req, res, next) => {
    try {
      res.json({ state: await loadStoreState() });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/admin/state', requireSameOrigin, requireAdmin('catalog'), async (req, res, next) => {
    const client = await pool.connect().catch(next);
    if (!client) return;
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return jsonError(res, 400, 'Os dados da loja são inválidos.');
      }
      await client.query('BEGIN');
      const { rows: previousRows } = await client.query('SELECT data FROM store_state WHERE id = 1 FOR UPDATE');
      await client.query(
        `INSERT INTO store_state (id, data, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(req.body)],
      );
      const previousPromotions = getStorePromotions(previousRows[0]?.data);
      const nextPromotions = getStorePromotions(req.body);
      if (JSON.stringify(previousPromotions) !== JSON.stringify(nextPromotions)) {
        await enqueueIntegrationEvent(client, 'promotions.snapshot', nextPromotions);
      }
      await client.query('COMMIT');
      res.json({ saved: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      next(error);
    } finally {
      client.release();
    }
  });

  /* ---------- Configurações da loja ---------- */

  app.get('/api/admin/settings', requireAdmin('settings'), async (_req, res, next) => {
    try {
      res.json({ settings: await loadSettings(pool) });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/admin/settings', requireSameOrigin, requireAdmin('settings'), async (req, res, next) => {
    try {
      const settings = normalizeSettings(req.body);
      validateSettings(settings);
      const previous = await loadSettings(pool);
      await pool.query(
        `INSERT INTO store_settings (id, data, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(settings)],
      );
      const sections = Object.keys(settings).filter(
        (key) => JSON.stringify(settings[key]) !== JSON.stringify(previous[key]),
      );
      if (sections.length) await audit(req.admin, 'settings.update', 'settings', null, { sections });
      res.json({ settings });
    } catch (error) {
      if (error instanceof SettingsError) return jsonError(res, 400, error.message);
      next(error);
    }
  });

  /* ---------- Equipe ---------- */

  app.get('/api/admin/users', requireAdmin('team'), async (_req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, email, role, active, last_login_at, created_at
         FROM admin_users ORDER BY created_at ASC`,
      );
      res.json({
        users: rows,
        roles: Object.entries(ROLES).map(([id, role]) => ({ id, label: role.label, permissions: role.permissions })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/users', requireSameOrigin, requireAdmin('team'), async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const role = req.body?.role;
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (name.length < 2 || name.length > 120) return jsonError(res, 400, 'Informe um nome com 2 a 120 caracteres.');
      if (!EMAIL.test(email) || email.length > 254) return jsonError(res, 400, 'Informe um e-mail válido.');
      if (!ROLES[role]) return jsonError(res, 400, 'Escolha um perfil de acesso válido.');
      if (password.length < 12 || password.length > 256) {
        return jsonError(res, 400, 'A senha deve ter pelo menos 12 caracteres.');
      }
      const { rows } = await pool.query(
        `INSERT INTO admin_users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, active, last_login_at, created_at`,
        [name, email, await hashPassword(password), role],
      );
      await audit(req.admin, 'user.create', 'admin_user', rows[0].id, { email, role });
      res.status(201).json({ user: rows[0] });
    } catch (error) {
      if (error?.code === '23505') return jsonError(res, 409, 'Já existe um usuário com este e-mail.');
      next(error);
    }
  });

  /* Garante que a loja nunca fique sem um proprietário ativo */
  const withOwnerGuard = async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT id FROM admin_users WHERE role = 'owner' AND active FOR UPDATE");
      const result = await callback(client);
      await client.query(result.ok ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  const hasAnotherOwner = async (client, id) => {
    const { rows } = await client.query(
      "SELECT 1 FROM admin_users WHERE role = 'owner' AND active AND id <> $1 LIMIT 1",
      [id],
    );
    return rows.length > 0;
  };

  app.patch('/api/admin/users/:id', requireSameOrigin, requireAdmin('team'), async (req, res, next) => {
    try {
      if (!validId(req, res)) return;
      const { id } = req.params;
      const body = req.body || {};
      const updates = [];
      const values = [];
      const push = (column, value) => {
        values.push(value);
        updates.push(`${column} = $${values.length}`);
      };

      if (body.name !== undefined) {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (name.length < 2 || name.length > 120) return jsonError(res, 400, 'Informe um nome com 2 a 120 caracteres.');
        push('name', name);
      }
      if (body.role !== undefined) {
        if (!ROLES[body.role]) return jsonError(res, 400, 'Escolha um perfil de acesso válido.');
        push('role', body.role);
      }
      if (body.active !== undefined) {
        if (typeof body.active !== 'boolean') return jsonError(res, 400, 'Situação inválida.');
        push('active', body.active);
      }
      if (body.password !== undefined) {
        if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) {
          return jsonError(res, 400, 'A senha deve ter pelo menos 12 caracteres.');
        }
        push('password_hash', await hashPassword(body.password));
      }
      if (!updates.length) return jsonError(res, 400, 'Nenhuma alteração informada.');
      if (id === req.admin.id && (body.role !== undefined || body.active !== undefined)) {
        return jsonError(res, 400, 'Você não pode alterar o próprio perfil ou desativar a própria conta.');
      }

      const result = await withOwnerGuard(async (client) => {
        const { rows: current } = await client.query('SELECT role, active FROM admin_users WHERE id = $1', [id]);
        if (!current[0]) return { ok: false, status: 404, message: 'Usuário não encontrado.' };
        const losesOwner = current[0].role === 'owner' && current[0].active &&
          ((body.role !== undefined && body.role !== 'owner') || body.active === false);
        if (losesOwner && !(await hasAnotherOwner(client, id))) {
          return { ok: false, status: 400, message: 'Mantenha pelo menos um proprietário ativo.' };
        }
        values.push(id);
        const { rows } = await client.query(
          `UPDATE admin_users SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id = $${values.length}
           RETURNING id, name, email, role, active, last_login_at, created_at`,
          values,
        );
        return { ok: true, user: rows[0] };
      });

      if (!result.ok) return jsonError(res, result.status, result.message);
      await audit(req.admin, 'user.update', 'admin_user', id, {
        fields: updates.map((entry) => entry.split(' = ')[0]).filter((field) => field !== 'password_hash'),
        passwordReset: body.password !== undefined,
        role: body.role,
        active: body.active,
      });
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/admin/users/:id', requireSameOrigin, requireAdmin('team'), async (req, res, next) => {
    try {
      if (!validId(req, res)) return;
      const { id } = req.params;
      if (id === req.admin.id) return jsonError(res, 400, 'Você não pode excluir a própria conta.');
      const result = await withOwnerGuard(async (client) => {
        const { rows } = await client.query('SELECT email, role, active FROM admin_users WHERE id = $1', [id]);
        if (!rows[0]) return { ok: false, status: 404, message: 'Usuário não encontrado.' };
        if (rows[0].role === 'owner' && rows[0].active && !(await hasAnotherOwner(client, id))) {
          return { ok: false, status: 400, message: 'Mantenha pelo menos um proprietário ativo.' };
        }
        await client.query('DELETE FROM admin_users WHERE id = $1', [id]);
        return { ok: true, email: rows[0].email };
      });
      if (!result.ok) return jsonError(res, result.status, result.message);
      await audit(req.admin, 'user.delete', 'admin_user', id, { email: result.email });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  /* ---------- Clientes ---------- */

  app.post('/api/admin/integrations/sync', requireSameOrigin, requireAdmin('customers'), async (_req, res, next) => {
    try {
      if (!integrationConfigured) return jsonError(res, 503, 'Configure a integração com o CRM antes de sincronizar.');
      const state = await loadStoreState();
      const promotions = getStorePromotions(state);
      const products = currentProducts(state);
      const queued = await enqueueHistoricalSync(pool, promotions, products);
      await audit(_req.admin, 'integration.backfill', 'commerce', null, queued);
      res.status(202).json({ queued });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/customers', requireAdmin('customers'), async (_req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT c.id, c.name, c.email, c.phone, c.cpf, c.address, c.blocked, c.created_at,
                COUNT(o.id)::int AS orders_count,
                COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'canceled'), 0)::float AS total_spent,
                MAX(o.created_at) AS last_order_at
         FROM customers c
         LEFT JOIN orders o ON o.customer_id = c.id
         GROUP BY c.id
         ORDER BY c.created_at DESC
         LIMIT 2000`,
      );
      res.json({ customers: rows });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/customers/:id', requireAdmin('customers'), async (req, res, next) => {
    try {
      if (!validId(req, res)) return;
      const { rows: customerRows } = await pool.query(
        `SELECT c.id, c.name, c.email, c.phone, c.cpf, c.address, c.blocked, c.created_at,
                COUNT(o.id)::int AS orders_count,
                COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'canceled'), 0)::float AS total_spent,
                MAX(o.created_at) AS last_order_at
         FROM customers c
         LEFT JOIN orders o ON o.customer_id = c.id
         WHERE c.id = $1
         GROUP BY c.id`,
        [req.params.id],
      );
      if (!customerRows[0]) return jsonError(res, 404, 'Cliente não encontrado.');

      const [cartResult, ordersResult] = await Promise.all([
        pool.query('SELECT items, updated_at FROM carts WHERE customer_id = $1', [req.params.id]),
        pool.query(
          `SELECT o.id, o.status, o.payment_status, o.payment_method, o.delivery_method,
                  o.address, o.subtotal, o.discount, o.total, o.coupon_code, o.tracking_code, o.created_at,
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
           ORDER BY o.created_at DESC
           LIMIT 10`,
          [req.params.id],
        ),
      ]);

      const cart = cartResult.rows[0];
      const cartItems = Array.isArray(cart?.items) ? cart.items : [];
      const productById = new Map(currentProducts(await loadStoreState()).map((product) => [product.id, product]));
      const enrichedCart = cartItems.map((item) => {
        const product = productById.get(item.productId);
        return {
          productId: item.productId,
          name: product?.name || item.productId,
          image: product?.image || '',
          unitPrice: Number(product?.price) || 0,
          quantity: item.quantity,
          options: item.options || {},
        };
      });

      res.json({
        customer: customerRows[0],
        cart: {
          items: enrichedCart,
          updated_at: cart?.updated_at || null,
        },
        orders: ordersResult.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/admin/customers/:id', requireSameOrigin, requireAdmin('customers'), async (req, res, next) => {
    try {
      if (!validId(req, res)) return;
      if (typeof req.body?.blocked !== 'boolean') return jsonError(res, 400, 'Situação inválida.');
      const { rows } = await pool.query(
        'UPDATE customers SET blocked = $1 WHERE id = $2 RETURNING id, email, blocked',
        [req.body.blocked, req.params.id],
      );
      if (!rows[0]) return jsonError(res, 404, 'Cliente não encontrado.');
      await audit(req.admin, rows[0].blocked ? 'customer.block' : 'customer.unblock', 'customer', rows[0].id, {
        email: rows[0].email,
      });
      res.json({ customer: rows[0] });
    } catch (error) {
      next(error);
    }
  });

  /* ---------- Pedidos ---------- */

  app.get('/api/admin/orders', requireAdmin('orders'), async (_req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT o.id, o.status, o.payment_status, o.payment_method, o.delivery_method,
                o.address, o.subtotal, o.discount, o.total, o.coupon_code, o.tracking_code, o.created_at,
                c.email, c.name, c.phone,
                COALESCE(json_agg(json_build_object(
                  'productId', i.product_id,
                  'product', i.product_snapshot,
                  'quantity', i.quantity,
                  'unitPrice', i.unit_price
                )) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         LEFT JOIN order_items i ON i.order_id = o.id
         GROUP BY o.id, c.email, c.name, c.phone
         ORDER BY o.created_at DESC
         LIMIT 500`,
      );
      res.json({ orders: rows });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/admin/orders/:id', requireSameOrigin, requireAdmin('orders'), async (req, res, next) => {
    try {
      if (!validId(req, res)) return;
      const { status, paymentStatus, trackingCode } = req.body || {};
      const updates = [];
      const values = [];
      const push = (column, value) => {
        values.push(value);
        updates.push(`${column} = $${values.length}`);
      };
      if (status !== undefined) {
        if (!ORDER_STATUSES.includes(status)) return jsonError(res, 400, 'Situação do pedido inválida.');
        push('status', status);
      }
      if (paymentStatus !== undefined) {
        if (!PAYMENT_STATUSES.includes(paymentStatus)) return jsonError(res, 400, 'Situação do pagamento inválida.');
        push('payment_status', paymentStatus);
      }
      if (trackingCode !== undefined) {
        if (typeof trackingCode !== 'string' || trackingCode.trim().length > 60) {
          return jsonError(res, 400, 'O código de rastreio deve ter até 60 caracteres.');
        }
        push('tracking_code', trackingCode.trim() || null);
      }
      if (!updates.length) return jsonError(res, 400, 'Nenhuma alteração informada.');
      values.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE orders SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING id, status, payment_status, tracking_code`,
        values,
      );
      if (!rows[0]) return jsonError(res, 404, 'Pedido não encontrado.');
      await enqueueOrderEvent(pool, rows[0].id);
      await audit(req.admin, 'order.update', 'order', rows[0].id, { status, paymentStatus, trackingCode });
      res.json({ order: rows[0] });
    } catch (error) {
      next(error);
    }
  });

  /* ---------- Atividades ---------- */

  app.get('/api/admin/audit', requireAdmin('audit'), async (_req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id::text AS id, actor_name, action, entity, entity_id, details, created_at
         FROM audit_log ORDER BY id DESC LIMIT 300`,
      );
      res.json({ entries: rows });
    } catch (error) {
      next(error);
    }
  });
};
