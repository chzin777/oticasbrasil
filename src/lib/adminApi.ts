export type AdminPermission = 'catalog' | 'orders' | 'customers' | 'settings' | 'team' | 'audit';

export type AdminRole = 'owner' | 'manager' | 'editor' | 'support';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Proprietário',
  manager: 'Gerente',
  editor: 'Editor de catálogo',
  support: 'Atendimento',
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  owner: 'Acesso total, incluindo equipe e atividades.',
  manager: 'Catálogo, pedidos, clientes, configurações e atividades.',
  editor: 'Produtos, tags, descontos, cupons e banners.',
  support: 'Pedidos e clientes.',
};

/* Chamada padrão ao painel: envia o cookie de sessão e converte erros da API em exceções */
export const adminRequest = async <T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
  const response = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a solicitação.');
  return result;
};

export const errorMessage = (error: unknown, fallback = 'Tente novamente.') =>
  error instanceof Error ? error.message : fallback;
