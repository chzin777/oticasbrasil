import { useSyncExternalStore } from 'react';

export interface StoreSettings {
  store: {
    name: string;
    legalName: string;
    cnpj: string;
    email: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    address: string;
    description: string;
  };
  payment: {
    pix: { enabled: boolean; discountPercent: number };
    card: { enabled: boolean; maxInstallments: number };
    boleto: { enabled: boolean };
  };
  delivery: { homeEnabled: boolean; pickupEnabled: boolean };
  maintenance: { enabled: boolean; message: string };
}

export const DEFAULT_SETTINGS: StoreSettings = {
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
  delivery: { homeEnabled: true, pickupEnabled: true },
  maintenance: {
    enabled: false,
    message: 'Estamos fazendo melhorias na loja. Voltamos em breve!',
  },
};

let current = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

const publish = (settings: StoreSettings) => {
  current = settings;
  listeners.forEach((listener) => listener());
};

/* Usada pelo painel após salvar, para a loja refletir a mudança sem recarregar */
export const setStoreSettings = (settings: StoreSettings) => {
  loaded = true;
  publish(settings);
};

const load = async () => {
  try {
    const response = await fetch('/api/store/settings');
    if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
    const result = await response.json() as { settings: StoreSettings };
    publish(result.settings);
  } catch (error) {
    console.error('Não foi possível carregar as configurações da loja.', error);
  } finally {
    loaded = true;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    void load();
  }
  return () => {
    listeners.delete(listener);
  };
};

export const useStoreSettings = () => useSyncExternalStore(subscribe, () => current);
