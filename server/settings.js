export const defaultSettings = {
  store: {
    name: 'Óticas Brasil',
    legalName: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    address: '',
    description: '',
  },
  payment: {
    pix: { enabled: true, discountPercent: 5 },
    card: { enabled: true, maxInstallments: 10 },
    boleto: { enabled: true },
  },
  delivery: {
    homeEnabled: true,
    pickupEnabled: true,
  },
  maintenance: {
    enabled: false,
    message: 'Estamos fazendo melhorias na loja. Voltamos em breve!',
  },
};

const text = (value, fallback, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : fallback;

const flag = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

const number = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const object = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export class SettingsError extends Error {}

/* Mescla o que foi salvo com o padrão e valida os limites de cada campo */
export const normalizeSettings = (input) => {
  const source = object(input);
  const store = object(source.store);
  const payment = object(source.payment);
  const delivery = object(source.delivery);
  const maintenance = object(source.maintenance);
  const base = defaultSettings;

  const settings = {
    store: {
      name: text(store.name, base.store.name, 80) || base.store.name,
      legalName: text(store.legalName, base.store.legalName, 120),
      cnpj: text(store.cnpj, base.store.cnpj, 20),
      email: text(store.email, base.store.email, 160),
      phone: text(store.phone, base.store.phone, 30),
      whatsapp: text(store.whatsapp, base.store.whatsapp, 30),
      instagram: text(store.instagram, base.store.instagram, 80),
      address: text(store.address, base.store.address, 240),
      description: text(store.description, base.store.description, 300),
    },
    payment: {
      pix: {
        enabled: flag(object(payment.pix).enabled, base.payment.pix.enabled),
        discountPercent: number(object(payment.pix).discountPercent, base.payment.pix.discountPercent, 0, 50),
      },
      card: {
        enabled: flag(object(payment.card).enabled, base.payment.card.enabled),
        maxInstallments: Math.round(number(object(payment.card).maxInstallments, base.payment.card.maxInstallments, 1, 12)),
      },
      boleto: {
        enabled: flag(object(payment.boleto).enabled, base.payment.boleto.enabled),
      },
    },
    delivery: {
      homeEnabled: flag(delivery.homeEnabled, base.delivery.homeEnabled),
      pickupEnabled: flag(delivery.pickupEnabled, base.delivery.pickupEnabled),
    },
    maintenance: {
      enabled: flag(maintenance.enabled, base.maintenance.enabled),
      message: text(maintenance.message, base.maintenance.message, 240) || base.maintenance.message,
    },
  };
  settings.payment.pix.discountPercent = Math.round(settings.payment.pix.discountPercent * 100) / 100;
  return settings;
};

export const loadSettings = async (pool) => {
  const { rows } = await pool.query('SELECT data FROM store_settings WHERE id = 1');
  return normalizeSettings(rows[0]?.data);
};

export const validateSettings = (settings) => {
  const { pix, card, boleto } = settings.payment;
  if (!pix.enabled && !card.enabled && !boleto.enabled) {
    throw new SettingsError('Mantenha pelo menos uma forma de pagamento ativa.');
  }
  if (!settings.delivery.homeEnabled && !settings.delivery.pickupEnabled) {
    throw new SettingsError('Mantenha pelo menos uma forma de entrega ativa.');
  }
  if (settings.store.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.store.email)) {
    throw new SettingsError('Informe um e-mail de contato válido.');
  }
};
