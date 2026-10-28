import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../components/ToastContext';
import { adminRequest, errorMessage } from '../../../lib/adminApi';
import { Card, ghostBtn } from '../ui';

interface AuditEntry {
  id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTIONS: Record<string, { label: string; icon: string }> = {
  'auth.login': { label: 'Entrou no painel', icon: 'login' },
  'account.update': { label: 'Atualizou o próprio perfil', icon: 'manage_accounts' },
  'account.password_changed': { label: 'Alterou a própria senha', icon: 'key' },
  'settings.update': { label: 'Alterou configurações da loja', icon: 'tune' },
  'user.create': { label: 'Criou um usuário', icon: 'person_add' },
  'user.update': { label: 'Atualizou um usuário', icon: 'manage_accounts' },
  'user.delete': { label: 'Excluiu um usuário', icon: 'person_remove' },
  'customer.block': { label: 'Bloqueou um cliente', icon: 'block' },
  'customer.unblock': { label: 'Desbloqueou um cliente', icon: 'lock_open' },
  'order.update': { label: 'Atualizou um pedido', icon: 'receipt_long' },
};

const SECTION_LABELS: Record<string, string> = {
  store: 'dados da loja',
  payment: 'pagamentos',
  delivery: 'entrega',
  maintenance: 'manutenção',
};

const describe = (entry: AuditEntry) => {
  const { details } = entry;
  const parts: string[] = [];
  if (typeof details.email === 'string') parts.push(details.email);
  if (Array.isArray(details.sections)) parts.push((details.sections as string[]).map((key) => SECTION_LABELS[key] ?? key).join(', '));
  if (typeof details.status === 'string') parts.push(`situação: ${details.status}`);
  if (typeof details.paymentStatus === 'string') parts.push(`pagamento: ${details.paymentStatus}`);
  if (typeof details.trackingCode === 'string') parts.push(`rastreio: ${details.trackingCode || 'removido'}`);
  if (typeof details.role === 'string') parts.push(`perfil: ${details.role}`);
  if (details.passwordReset === true) parts.push('senha redefinida');
  if (entry.entity === 'order' && entry.entity_id) parts.unshift(`#${entry.entity_id.slice(0, 8).toUpperCase()}`);
  return parts.join(' · ');
};

export const AuditSection: React.FC = () => {
  const toast = useToast();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await adminRequest<{ entries: AuditEntry[] }>('/api/admin/audit');
      setEntries(result.entries);
    } catch (error) {
      toast.error('Não foi possível carregar as atividades', errorMessage(error));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card
      title="Histórico de atividades"
      subtitle="Registro das ações administrativas mais recentes."
      action={<button type="button" className={ghostBtn} onClick={() => void load()}>Atualizar</button>}
    >
      {!entries ? (
        <p className="py-8 text-center text-sm text-[#7b8497]">Carregando atividades...</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#7b8497]">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ul className="divide-y divide-[#f1f3f7]">
          {entries.map((entry) => {
            const action = ACTIONS[entry.action] ?? { label: entry.action, icon: 'history' };
            const detail = describe(entry);
            return (
              <li key={entry.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef1fb] text-[#4156b8]">
                  <span className="material-symbols-outlined text-[19px]">{action.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#24324b]"><span className="font-semibold">{entry.actor_name}</span> · {action.label}</p>
                  {detail && <p className="mt-0.5 truncate text-xs text-[#7b8497]">{detail}</p>}
                </div>
                <time className="shrink-0 text-xs text-[#8992a4]" dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
