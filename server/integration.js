import { randomUUID, timingSafeEqual } from 'node:crypto';

const crmApiUrl = process.env.CRM_API_URL?.trim().replace(/\/+$/, '') || '';
const integrationSecret = process.env.INTEGRATION_SHARED_SECRET || '';

export const integrationConfigured = Boolean(crmApiUrl && integrationSecret);

export const validateIntegrationConfig = () => {
  if (Boolean(crmApiUrl) !== Boolean(integrationSecret)) {
    throw new Error('Configure CRM_API_URL e INTEGRATION_SHARED_SECRET juntos para habilitar a integração.');
  }
};

export const integrationSecretMatches = (authorization) => {
  if (!integrationSecret || typeof authorization !== 'string') return false;
  const match = authorization.match(/^Bearer (.+)$/i);
  if (!match) return false;
  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(integrationSecret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};

export const enqueueIntegrationEvent = async (queryable, eventType, data) => {
  if (!integrationConfigured) return;
  await queryable.query(
    `INSERT INTO integration_outbox (event_id, event_type, payload)
     VALUES ($1, $2, $3::jsonb)`,
    [randomUUID(), eventType, JSON.stringify(data)],
  );
};

export const enqueueHistoricalSync = async (pool, promotions, products) => {
  if (!integrationConfigured) throw new Error('A integração com o CRM não está configurada.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const customers = await client.query(
      `INSERT INTO integration_outbox (event_id, event_type, payload)
       SELECT gen_random_uuid(), 'customer.upsert',
              jsonb_build_object(
                'customerId', id, 'sourceUpdatedAt', updated_at, 'name', name,
                'email', email, 'phone', phone, 'cpf', cpf, 'address', address
              )
       FROM customers`,
    );
    const carts = await client.query(
      `INSERT INTO integration_outbox (event_id, event_type, payload)
       SELECT gen_random_uuid(), 'cart.upsert',
              jsonb_build_object(
                'customerId', c.id, 'updatedAt', cart.updated_at,
                'items', COALESCE(jsonb_agg(
                  cart_item.value || jsonb_build_object(
                    'name', COALESCE(product.value->>'name', cart_item.value->>'productId'),
                    'unitPrice', CASE
                      WHEN product.value->>'price' ~ '^-?[0-9]+([.][0-9]+)?$'
                      THEN (product.value->>'price')::numeric
                      ELSE 0
                    END
                  )
                ) FILTER (WHERE cart_item.value IS NOT NULL), '[]'::jsonb),
                'total', ROUND(COALESCE(SUM(
                  CASE
                    WHEN product.value->>'price' ~ '^-?[0-9]+([.][0-9]+)?$'
                      AND cart_item.value->>'quantity' ~ '^[0-9]+$'
                    THEN (product.value->>'price')::numeric * (cart_item.value->>'quantity')::numeric
                    ELSE 0
                  END
                ), 0), 2),
                'customer', jsonb_build_object(
                  'customerId', c.id, 'sourceUpdatedAt', c.updated_at, 'name', c.name,
                  'email', c.email, 'phone', c.phone, 'cpf', c.cpf, 'address', c.address
                )
              )
       FROM carts cart
       JOIN customers c ON c.id = cart.customer_id
       LEFT JOIN LATERAL jsonb_array_elements(cart.items) AS cart_item(value) ON TRUE
       LEFT JOIN LATERAL (
         SELECT catalog.value
         FROM jsonb_array_elements($1::jsonb) AS catalog(value)
         WHERE catalog.value->>'id' = cart_item.value->>'productId'
         LIMIT 1
       ) AS product ON TRUE
       GROUP BY c.id, cart.updated_at`,
      [JSON.stringify(products.map(({ id, name, price }) => ({ id, name, price })))],
    );
    const orders = await client.query(
      `INSERT INTO integration_outbox (event_id, event_type, payload)
       SELECT gen_random_uuid(), 'order.upsert',
              jsonb_build_object(
                'order', jsonb_build_object(
                  'id', o.id, 'status', o.status, 'paymentStatus', o.payment_status,
                  'paymentMethod', o.payment_method, 'deliveryMethod', o.delivery_method,
                  'address', o.address, 'subtotal', o.subtotal, 'discount', o.discount,
                  'total', o.total, 'couponCode', o.coupon_code, 'trackingCode', o.tracking_code,
                  'createdAt', o.created_at, 'updatedAt', o.updated_at,
                  'items', COALESCE(jsonb_agg(jsonb_build_object(
                    'productId', i.product_id,
                    'product', jsonb_build_object(
                      'name', i.product_snapshot->>'name',
                      'image', CASE WHEN i.product_snapshot->>'image' LIKE 'data:%' THEN '' ELSE i.product_snapshot->>'image' END,
                      'category', i.product_snapshot->>'category',
                      'selectedOptions', COALESCE(i.product_snapshot->'selectedOptions', '{}'::jsonb)
                    ),
                    'quantity', i.quantity,
                    'unitPrice', i.unit_price
                  )) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb)
                ),
                'customer', jsonb_build_object(
                  'customerId', c.id, 'sourceUpdatedAt', c.updated_at, 'name', c.name,
                  'email', c.email, 'phone', c.phone, 'cpf', c.cpf, 'address', c.address
                )
              )
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN order_items i ON i.order_id = o.id
       GROUP BY o.id, c.id`,
    );
    await enqueueIntegrationEvent(client, 'promotions.snapshot', promotions);
    await client.query('COMMIT');
    return { customers: customers.rowCount, carts: carts.rowCount, orders: orders.rowCount };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const deliverNextEvent = async (pool) => {
  const { rows } = await pool.query(
    `UPDATE integration_outbox
     SET attempts = attempts + 1, locked_until = NOW() + INTERVAL '30 seconds'
     WHERE id = (
       SELECT id FROM integration_outbox
       WHERE delivered_at IS NULL
         AND next_attempt_at <= NOW()
         AND (locked_until IS NULL OR locked_until <= NOW())
       ORDER BY id
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING id, event_id, event_type, payload, attempts`,
  );
  const event = rows[0];
  if (!event) return false;

  try {
    const response = await fetch(`${crmApiUrl}/api/integrations/ecommerce/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integrationSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.event_id,
        type: event.event_type,
        data: event.payload,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`CRM respondeu HTTP ${response.status}.`);
    await pool.query(
      `UPDATE integration_outbox
       SET delivered_at = NOW(), locked_until = NULL, last_error = NULL
       WHERE id = $1`,
      [event.id],
    );
  } catch (error) {
    const retrySeconds = Math.min(1800, 2 ** Math.min(Number(event.attempts) + 1, 10));
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Falha desconhecida ao enviar evento.';
    await pool.query(
      `UPDATE integration_outbox
       SET next_attempt_at = NOW() + ($2 * INTERVAL '1 second'),
           locked_until = NULL,
           last_error = $3
       WHERE id = $1`,
      [event.id, retrySeconds, message],
    );
    console.error(`Falha ao sincronizar evento ${event.event_id}: ${message}`);
  }
  return true;
};

export const startIntegrationWorker = (pool) => {
  if (!integrationConfigured) {
    console.warn('Integração com o CRM desabilitada; configure CRM_API_URL e INTEGRATION_SHARED_SECRET.');
    return () => {};
  }

  let running = false;
  const drain = async () => {
    if (running) return;
    running = true;
    try {
      for (let count = 0; count < 20; count++) {
        if (!(await deliverNextEvent(pool))) break;
      }
    } catch (error) {
      console.error('Falha ao processar a fila de integração com o CRM:', error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void drain(), 2000);
  timer.unref();
  void drain();
  return () => clearInterval(timer);
};
