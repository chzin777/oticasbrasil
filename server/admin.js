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

  /* ---------- Tags de Produtos (Relacional) ---------- */

  const TAG_RULE_ATTRIBUTES = ['brand', 'category', 'subcategory', 'material', 'shape'];

  const normalizeTagRules = (rules) => {
    if (!Array.isArray(rules)) return [];
    return rules
      .filter((r) => r && TAG_RULE_ATTRIBUTES.includes(r.attribute) && typeof r.value === 'string' && r.value.trim())
      .map((r) => ({ attribute: r.attribute, value: r.value.trim().slice(0, 120) }));
  };

  const loadTagsWithDetails = async (queryable) => {
    const { rows: tags } = await queryable.query(
      'SELECT id::text, name, color, created_at, updated_at FROM product_tags ORDER BY created_at DESC',
    );
    if (tags.length === 0) return [];

    const tagIds = tags.map((t) => t.id);
    const [{ rows: assignments }, { rows: rules }] = await Promise.all([
      queryable.query(
        'SELECT tag_id::text AS tag_id, product_id FROM product_tag_assignments WHERE tag_id = ANY($1::uuid[])',
        [tagIds],
      ),
      queryable.query(
        'SELECT id::text, tag_id::text AS tag_id, attribute, value FROM product_tag_rules WHERE tag_id = ANY($1::uuid[]) ORDER BY attribute, value',
        [tagIds],
      ),
    ]);

    const assignmentMap = new Map();
    for (const a of assignments) {
      if (!assignmentMap.has(a.tag_id)) assignmentMap.set(a.tag_id, []);
      assignmentMap.get(a.tag_id).push(a.product_id);
    }

    const ruleMap = new Map();
    for (const r of rules) {
      if (!ruleMap.has(r.tag_id)) ruleMap.set(r.tag_id, []);
      ruleMap.get(r.tag_id).push({ id: r.id, attribute: r.attribute, value: r.value });
    }

    return tags.map((tag) => ({
      ...tag,
      assignedProductIds: assignmentMap.get(tag.id) || [],
      rules: ruleMap.get(tag.id) || [],
    }));
  };

  app.get('/api/admin/tags', requireAdmin('catalog'), async (_req, res, next) => {
    try {
      res.json({ tags: await loadTagsWithDetails(pool) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/tags', requireSameOrigin, requireAdmin('catalog'), async (req, res, next) => {
    const client = await pool.connect().catch(next);
    if (!client) return;
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 32) : '';
      const color = typeof req.body?.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(req.body.color) ? req.body.color : '#4156b8';
      const rules = normalizeTagRules(req.body?.rules);
      const productIds = Array.isArray(req.body?.assignedProductIds)
        ? [...new Set(req.body.assignedProductIds.filter((id) => typeof id === 'string').map((id) => id.slice(0, 120)))]
        : [];

      if (!name) return jsonError(res, 400, 'Nome da tag é obrigatório.');

      await client.query('BEGIN');
      const { rows } = await client.query(
        'INSERT INTO product_tags (name, color) VALUES ($1, $2) RETURNING id::text, name, color, created_at, updated_at',
        [name, color],
      );
      const tag = rows[0];

      if (productIds.length > 0) {
        await client.query(
          'INSERT INTO product_tag_assignments (tag_id, product_id) SELECT $1::uuid, unnest($2::text[]) ON CONFLICT DO NOTHING',
          [tag.id, productIds],
        );
      }

      if (rules.length > 0) {
        for (const rule of rules) {
          await client.query(
            'INSERT INTO product_tag_rules (tag_id, attribute, value) VALUES ($1::uuid, $2, $3)',
            [tag.id, rule.attribute, rule.value],
          );
        }
      }

      await audit(req.admin, 'tag.create', 'product_tag', tag.id, { name, color, rules: rules.length, products: productIds.length });
      await client.query('COMMIT');

      const full = await loadTagsWithDetails(client);
      res.status(201).json({ tag: full.find((t) => t.id === tag.id) || tag });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error?.code === '23505') return jsonError(res, 409, 'Já existe uma tag com este nome.');
      next(error);
    } finally {
      client.release();
    }
  });

  app.put('/api/admin/tags/:id', requireSameOrigin, requireAdmin('catalog'), async (req, res, next) => {
    if (!UUID.test(req.params.id)) return jsonError(res, 400, 'ID da tag inválido.');
    const client = await pool.connect().catch(next);
    if (!client) return;
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 32) : '';
      const color = typeof req.body?.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(req.body.color) ? req.body.color : undefined;
      const rules = normalizeTagRules(req.body?.rules);
      const productIds = Array.isArray(req.body?.assignedProductIds)
        ? [...new Set(req.body.assignedProductIds.filter((id) => typeof id === 'string').map((id) => id.slice(0, 120)))]
        : null;

      if (!name) return jsonError(res, 400, 'Nome da tag é obrigatório.');

      await client.query('BEGIN');
      const { rows } = await client.query(
        'UPDATE product_tags SET name = $1, color = COALESCE($2, color), updated_at = NOW() WHERE id = $3::uuid RETURNING id::text, name, color',
        [name, color || null, req.params.id],
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return jsonError(res, 404, 'Tag não encontrada.');
      }

      if (productIds !== null) {
        await client.query('DELETE FROM product_tag_assignments WHERE tag_id = $1::uuid', [req.params.id]);
        if (productIds.length > 0) {
          await client.query(
            'INSERT INTO product_tag_assignments (tag_id, product_id) SELECT $1::uuid, unnest($2::text[]) ON CONFLICT DO NOTHING',
            [req.params.id, productIds],
          );
        }
      }

      await client.query('DELETE FROM product_tag_rules WHERE tag_id = $1::uuid', [req.params.id]);
      for (const rule of rules) {
        await client.query(
          'INSERT INTO product_tag_rules (tag_id, attribute, value) VALUES ($1::uuid, $2, $3)',
          [req.params.id, rule.attribute, rule.value],
        );
      }

      await audit(req.admin, 'tag.update', 'product_tag', req.params.id, { name, rules: rules.length });
      await client.query('COMMIT');

      const full = await loadTagsWithDetails(client);
      res.json({ tag: full.find((t) => t.id === req.params.id) || rows[0] });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error?.code === '23505') return jsonError(res, 409, 'Já existe uma tag com este nome.');
      next(error);
    } finally {
      client.release();
    }
  });

  app.delete('/api/admin/tags/:id', requireSameOrigin, requireAdmin('catalog'), async (req, res, next) => {
    if (!UUID.test(req.params.id)) return jsonError(res, 400, 'ID da tag inválido.');
    try {
      const { rowCount } = await pool.query('DELETE FROM product_tags WHERE id = $1::uuid', [req.params.id]);
      if (!rowCount) return jsonError(res, 404, 'Tag não encontrada.');
      await audit(req.admin, 'tag.delete', 'product_tag', req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  /* ---------- Políticas de Desconto (Relacional) ---------- */

  const VALID_TRIGGERS = ['first_purchase', 'new_customer', 'returning_customer', 'birthday', 'cart_value', 'item_quantity', 'abandoned_cart', 'progressive_time'];
  const VALID_DISCOUNT_TYPES = ['percentage', 'fixed'];
  const VALID_OPERATORS = ['minimum', 'maximum', 'between'];
  const VALID_TIME_UNITS = ['hours', 'days'];

  const normalizePolicyPayload = (body) => {
    const trigger = VALID_TRIGGERS.includes(body?.trigger) ? body.trigger : null;
    const discountType = VALID_DISCOUNT_TYPES.includes(body?.discountType) ? body.discountType : null;
    const discountValue = Number(body?.discountValue);
    if (!trigger || !discountType || !Number.isFinite(discountValue) || discountValue <= 0) return null;
    if (discountType === 'percentage' && discountValue > 100) return null;

    const progressionSteps = Array.isArray(body?.progressionSteps)
      ? body.progressionSteps
          .filter((s) => s && Number.isFinite(s.after) && s.after > 0 && Number.isFinite(s.discountValue) && s.discountValue > 0 && VALID_TIME_UNITS.includes(s.unit))
          .map((s) => ({ after: Math.round(s.after), unit: s.unit, discountValue: Math.round(Number(s.discountValue) * 100) / 100 }))
      : [];

    return {
      name: typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '',
      trigger,
      discountType,
      discountValue: Math.round(discountValue * 100) / 100,
      active: body?.active !== false,
      allProducts: body?.allProducts !== false,
      durationValue: body?.duration?.value && Number.isFinite(body.duration.value) && body.duration.value > 0 ? Math.round(body.duration.value) : null,
      durationUnit: VALID_TIME_UNITS.includes(body?.duration?.unit) ? body.duration.unit : null,
      valueOperator: VALID_OPERATORS.includes(body?.valueOperator) ? body.valueOperator : null,
      minCartValue: Number.isFinite(body?.minCartValue) && body.minCartValue >= 0 ? Math.round(body.minCartValue * 100) / 100 : null,
      maxCartValue: Number.isFinite(body?.maxCartValue) && body.maxCartValue >= 0 ? Math.round(body.maxCartValue * 100) / 100 : null,
      quantityOperator: VALID_OPERATORS.includes(body?.quantityOperator) ? body.quantityOperator : null,
      minItems: Number.isInteger(body?.minItems) && body.minItems > 0 ? body.minItems : null,
      maxItems: Number.isInteger(body?.maxItems) && body.maxItems > 0 ? body.maxItems : null,
      idleDurationValue: body?.idleDuration?.value && Number.isFinite(body.idleDuration.value) && body.idleDuration.value > 0 ? Math.round(body.idleDuration.value) : null,
      idleDurationUnit: VALID_TIME_UNITS.includes(body?.idleDuration?.unit) ? body.idleDuration.unit : null,
      channels: Array.isArray(body?.channels) ? body.channels.filter((c) => c === 'email' || c === 'whatsapp') : [],
      progressionSteps,
      productIds: Array.isArray(body?.productIds)
        ? [...new Set(body.productIds.filter((id) => typeof id === 'string').map((id) => id.slice(0, 120)))]
        : [],
    };
  };

  const loadPoliciesWithProducts = async (queryable) => {
    const { rows: policies } = await queryable.query(
      `SELECT id::text, name, trigger_type, discount_type, discount_value, active, all_products,
              duration_value, duration_unit, value_operator, min_cart_value, max_cart_value,
              quantity_operator, min_items, max_items, idle_duration_value, idle_duration_unit,
              channels, progression_steps, created_at, updated_at
       FROM discount_policies ORDER BY created_at DESC`,
    );
    if (policies.length === 0) return [];

    const policyIds = policies.map((p) => p.id);
    const { rows: products } = await queryable.query(
      'SELECT policy_id::text AS policy_id, product_id FROM discount_policy_products WHERE policy_id = ANY($1::uuid[])',
      [policyIds],
    );

    const productMap = new Map();
    for (const p of products) {
      if (!productMap.has(p.policy_id)) productMap.set(p.policy_id, []);
      productMap.get(p.policy_id).push(p.product_id);
    }

    return policies.map((p) => ({
      id: p.id,
      name: p.name,
      trigger: p.trigger_type,
      discountType: p.discount_type,
      discountValue: Number(p.discount_value),
      active: p.active,
      allProducts: p.all_products,
      duration: p.duration_value ? { value: p.duration_value, unit: p.duration_unit } : null,
      valueOperator: p.value_operator,
      minCartValue: p.min_cart_value ? Number(p.min_cart_value) : null,
      maxCartValue: p.max_cart_value ? Number(p.max_cart_value) : null,
      quantityOperator: p.quantity_operator,
      minItems: p.min_items,
      maxItems: p.max_items,
      idleDuration: p.idle_duration_value ? { value: p.idle_duration_value, unit: p.idle_duration_unit } : null,
      channels: p.channels || [],
      progressionSteps: p.progression_steps || [],
      productIds: productMap.get(p.id) || [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  };

  app.get('/api/admin/discount-policies', requireAdmin('catalog'), async (_req, res, next) => {
    try {
      res.json({ policies: await loadPoliciesWithProducts(pool) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/discount-policies', requireSameOrigin, requireAdmin('catalog'), async (req, res, next) => {
    const payload = normalizePolicyPayload(req.body);
    if (!payload || !payload.name) return jsonError(res, 400, 'Dados da política inválidos.');

    const client = await pool.connect().catch(next);
    if (!client) return;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO discount_policies
          (name, trigger_type, discount_type, discount_value, active, all_products,
           duration_value, duration_unit, value_operator, min_cart_value, max_cart_value,
           quantity_operator, min_items, max_items, idle_duration_value, idle_duration_unit,
           channels, progression_steps)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id::text`,
        [
          payload.name, payload.trigger, payload.discountType, payload.discountValue, payload.active, payload.allProducts,
          payload.durationValue, payload.durationUnit, payload.valueOperator, payload.minCartValue, payload.maxCartValue,
          payload.quantityOperator, payload.minItems, payload.maxItems, payload.idleDurationValue, payload.idleDurationUnit,
          payload.channels, JSON.stringify(payload.progressionSteps),
        ],
      );
      const policyId = rows[0].id;

      if (!payload.allProducts && payload.productIds.length > 0) {
        await client.query(
          'INSERT INTO discount_policy_products (policy_id, product_id) SELECT $1::uuid, unnest($2::text[]) ON CONFLICT DO NOTHING',
          [policyId, payload.productIds],
        );
      }

      await audit(req.admin, 'discount_policy.create', 'discount_policy', policyId, { name: payload.name, trigger: payload.trigger });
      await client.query('COMMIT');

      const full = await loadPoliciesWithProducts(client);
      res.status(201).json({ policy: full.find((p) => p.id === policyId) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      next(error);
    } finally {
      client.release();
    }
  });

  app.put('/api/admin/discount-policies/:id', requireSameOrigin, requireAdmin('catalog'), async (req, res, next) => {
    if (!UUID.test(req.params.id)) return jsonError(res, 400, 'ID da política inválido.');
    const payload = normalizePolicyPayload(req.body);
    if (!payload || !payload.name) return jsonError(res, 400, 'Dados da política inválidos.');

    const client = await pool.connect().catch(next);
    if (!client) return;
    try {
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        `UPDATE discount_policies SET
          name=$1, trigger_type=$2, discount_type=$3, discount_value=$4, active=$5, all_products=$6,
          duration_value=$7, duration_unit=$8, value_operator=$9, min_cart_value=$10, max_cart_value=$11,
          quantity_operator=$12, min_items=$13, max_items=$14, idle_duration_value=$15, idle_duration_unit=$16,
          channels=$17, progression_steps=$18, updated_at=NOW()
         WHERE id=$19::uuid`,
        [
          payload.name, payload.trigger, payload.discountType, payload.discountValue, payload.active, payload.allProducts,
          payload.durationValue, payload.durationUnit, payload.valueOperator, payload.minCartValue, payload.maxCartValue,
          payload.quantityOperator, payload.minItems, payload.maxItems, payload.idleDurationValue, payload.idleDurationUnit,
          payload.channels, JSON.stringify(payload.progressionSteps), req.params.id,
        ],
      );
      if (!rowCount) {
        await client.query('ROLLBACK');
        return jsonError(res, 404, 'Política não encontrada.');
      }

      await client.query('DELETE FROM discount_policy_products WHERE policy_id = $1::uuid', [req.params.id]);
      if (!payload.allProducts && payload.productIds.length > 0) {
        await client.query(
          'INSERT INTO discount_policy_products (policy_id, product_id) SELECT $1::uuid, unnest($2::text[]) ON CONFLICT DO NOTHING',
          [req.params.id, payload.productIds],
        );
      }

      await audit(req.admin, 'discount_policy.update', 'discount_policy', req.params.id, { name: payload.name });
      await client.query('COMMIT');

      const full = await loadPoliciesWithProducts(client);
      res.json({ policy: full.find((p) => p.id === req.params.id) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      next(error);
    } finally {
      client.release();
    }
  });

  app.delete('/api/admin/discount-policies/:id', requireSameOrigin, requireAdmin('catalog'), async (req, res, next) => {
    if (!UUID.test(req.params.id)) return jsonError(res, 400, 'ID da política inválido.');
    try {
      const { rowCount } = await pool.query('DELETE FROM discount_policies WHERE id = $1::uuid', [req.params.id]);
      if (!rowCount) return jsonError(res, 404, 'Política não encontrada.');
      await audit(req.admin, 'discount_policy.delete', 'discount_policy', req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  /* ---------- Dashboard Stats (Dados Reais) ---------- */

  app.get('/api/admin/dashboard/stats', requireAdmin('catalog'), async (req, res, next) => {
    const period = req.query.period === '7d' ? 7 : req.query.period === '90d' ? 90 : 30;
    try {
      const [ordersResult, catalogResult, couponsResult] = await Promise.all([
        pool.query(
          `SELECT
            COUNT(*)::int AS total_orders,
            COALESCE(SUM(total) FILTER (WHERE status <> 'canceled'), 0)::float AS total_revenue,
            COALESCE(AVG(total) FILTER (WHERE status <> 'canceled'), 0)::float AS avg_ticket,
            COUNT(*) FILTER (WHERE created_at >= NOW() - ($1 || ' days')::interval)::int AS period_orders,
            COALESCE(SUM(total) FILTER (WHERE status <> 'canceled' AND created_at >= NOW() - ($1 || ' days')::interval), 0)::float AS period_revenue
           FROM orders`,
          [period],
        ),
        pool.query(
          `SELECT
            COUNT(DISTINCT oi.product_id)::int AS active_products,
            COUNT(DISTINCT oi.product_snapshot->>'brand')::int AS brands_count,
            COALESCE(AVG((oi.product_snapshot->>'price')::numeric), 0)::float AS avg_price,
            (SELECT json_agg(json_build_object('category', cat, 'count', cnt))
             FROM (
               SELECT oi2.product_snapshot->>'category' AS cat, COUNT(*)::int AS cnt
               FROM order_items oi2
               INNER JOIN orders o2 ON o2.id = oi2.order_id AND o2.status <> 'canceled'
               WHERE oi2.product_snapshot->>'category' IS NOT NULL
               GROUP BY oi2.product_snapshot->>'category'
             ) sub) AS category_mix
           FROM order_items oi
           INNER JOIN orders o ON o.id = oi.order_id AND o.status <> 'canceled'`,
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total_coupons,
                  COUNT(*) FILTER (WHERE active = TRUE)::int AS active_coupons
           FROM discount_policies`,
        ),
      ]);

      const orders = ordersResult.rows[0];
      const catalog = catalogResult.rows[0];
      const coupons = couponsResult.rows[0];

      // Time series: revenue/orders per day for the selected period
      const { rows: timeSeries } = await pool.query(
        `SELECT
          DATE(created_at) AS date,
          COUNT(*)::int AS orders,
          COALESCE(SUM(total) FILTER (WHERE status <> 'canceled'), 0)::float AS revenue
         FROM orders
         WHERE created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [period],
      );

      // Top products by revenue
      const { rows: topProducts } = await pool.query(
        `SELECT
          oi.product_snapshot->>'name' AS name,
          oi.product_snapshot->>'image' AS image,
          oi.product_snapshot->>'brand' AS brand,
          SUM(oi.quantity * oi.unit_price)::float AS revenue,
          SUM(oi.quantity)::int AS units
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id AND o.status <> 'canceled'
         WHERE o.created_at >= NOW() - ($1 || ' days')::interval
         GROUP BY oi.product_snapshot->>'name', oi.product_snapshot->>'image', oi.product_snapshot->>'brand'
         ORDER BY revenue DESC
         LIMIT 5`,
        [period],
      );

      // Category distribution from real orders
      const categoryMix = {};
      if (catalog.category_mix) {
        for (const item of catalog.category_mix) {
          if (item?.category) categoryMix[item.category] = (categoryMix[item.category] || 0) + 1;
        }
      }

      res.json({
        kpis: {
          totalRevenue: orders.total_revenue,
          periodRevenue: orders.period_revenue,
          totalOrders: orders.total_orders,
          periodOrders: orders.period_orders,
          avgTicket: orders.avg_ticket,
          activeProducts: catalog.active_products,
          brandsCount: catalog.brands_count,
          avgPrice: catalog.avg_price,
          activeCoupons: coupons.active_coupons,
          totalCoupons: coupons.total_coupons,
        },
        timeSeries: timeSeries.map((r) => ({
          date: r.date,
          orders: r.orders,
          revenue: r.revenue,
        })),
        categoryMix,
        topProducts,
      });
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
