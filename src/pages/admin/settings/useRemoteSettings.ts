import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../components/ToastContext';
import { adminRequest, errorMessage } from '../../../lib/adminApi';
import { setStoreSettings, StoreSettings } from '../../../lib/storeSettings';

export const useRemoteSettings = (enabled: boolean) => {
  const toast = useToast();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    adminRequest<{ settings: StoreSettings }>('/api/admin/settings')
      .then((result) => {
        if (active) setSettings(result.settings);
      })
      .catch((error: unknown) => toast.error('Não foi possível carregar as configurações', errorMessage(error)));
    return () => {
      active = false;
    };
  }, [enabled, toast]);

  const save = useCallback(async (next: StoreSettings, message = 'Configurações salvas') => {
    setSaving(true);
    try {
      const result = await adminRequest<{ settings: StoreSettings }>('/api/admin/settings', { method: 'PUT', body: next });
      setSettings(result.settings);
      setStoreSettings(result.settings);
      toast.success(message, 'As alterações já valem para a loja.');
      return true;
    } catch (error) {
      toast.error('Não foi possível salvar', errorMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  return { settings, saving, save };
};
