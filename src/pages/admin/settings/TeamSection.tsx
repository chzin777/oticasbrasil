import React, { useCallback, useEffect, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect';
import { useToast } from '../../../components/ToastContext';
import { AdminRole, AdminUser, adminRequest, errorMessage, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../../lib/adminApi';
import { Card, Field, ghostBtn, inputCls, Modal, primaryBtn } from '../ui';
import { ConfirmDialog, Toggle } from '../controls';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => ({ value: role, label: ROLE_LABELS[role] }));

const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca acessou';

const MemberForm: React.FC<{
  member: TeamMember | null;
  isSelf: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; email: string; role: AdminRole; active: boolean; password: string }) => void;
}> = ({ member, isSelf, saving, onClose, onSubmit }) => {
  const toast = useToast();
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [role, setRole] = useState<AdminRole>(member?.role ?? 'support');
  const [active, setActive] = useState(member?.active ?? true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return toast.error('Informe o nome', 'Use pelo menos 2 caracteres.');
    if (!member && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error('Informe um e-mail válido', 'Ele será usado para entrar no painel.');
    if ((!member || password) && password.length < 12) return toast.error('Senha muito curta', 'Use pelo menos 12 caracteres.');
    onSubmit({ name: name.trim(), email: email.trim(), role, active, password });
  };

  return (
    <Modal title={member ? 'Editar usuário' : 'Novo usuário'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus /></Field>
        <Field label="E-mail" required hint={member ? 'O e-mail de acesso não pode ser alterado.' : undefined}>
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} disabled={Boolean(member)} maxLength={254} autoComplete="off" />
        </Field>
        <Field label="Perfil de acesso" hint={ROLE_DESCRIPTIONS[role]}>
          <CustomSelect value={role} options={ROLE_OPTIONS} onChange={setRole} disabled={isSelf} aria-label="Perfil de acesso" />
        </Field>
        {member && (
          <Toggle label="Usuário ativo" description="Usuários inativos não conseguem entrar no painel." checked={active} onChange={setActive} disabled={isSelf} />
        )}
        <Field label={member ? 'Redefinir senha' : 'Senha inicial'} required={!member} hint={member ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 12 caracteres. Compartilhe com o usuário por um canal seguro.'}>
          <div className="flex gap-2">
            <input
              type={showPassword ? 'text' : 'password'}
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={256}
            />
            <button type="button" className={`${ghostBtn} shrink-0`} onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}>
              Gerar
            </button>
          </div>
        </Field>
        <div className="flex flex-col-reverse gap-2 border-t border-[#edf0f5] pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryBtn} disabled={saving}>{saving ? 'Salvando...' : member ? 'Salvar usuário' : 'Criar usuário'}</button>
        </div>
      </form>
    </Modal>
  );
};

export const TeamSection: React.FC<{ currentUser: AdminUser }> = ({ currentUser }) => {
  const toast = useToast();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [editing, setEditing] = useState<TeamMember | 'new' | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await adminRequest<{ users: TeamMember[] }>('/api/admin/users');
      setMembers(result.users);
    } catch (error) {
      toast.error('Não foi possível carregar a equipe', errorMessage(error));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (values: { name: string; email: string; role: AdminRole; active: boolean; password: string }) => {
    setBusy(true);
    try {
      if (editing === 'new') {
        await adminRequest('/api/admin/users', { method: 'POST', body: { name: values.name, email: values.email, role: values.role, password: values.password } });
        toast.success('Usuário criado', `${values.name} já pode acessar o painel.`);
      } else if (editing) {
        const isSelf = editing.id === currentUser.id;
        await adminRequest(`/api/admin/users/${editing.id}`, {
          method: 'PATCH',
          body: {
            name: values.name,
            ...(isSelf ? {} : { role: values.role, active: values.active }),
            ...(values.password ? { password: values.password } : {}),
          },
        });
        toast.success('Usuário atualizado', values.name);
      }
      setEditing(null);
      await load();
    } catch (error) {
      toast.error('Não foi possível salvar o usuário', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await adminRequest(`/api/admin/users/${removing.id}`, { method: 'DELETE' });
      toast.success('Usuário excluído', removing.name);
      setRemoving(null);
      await load();
    } catch (error) {
      toast.error('Não foi possível excluir o usuário', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Equipe e permissões"
      subtitle="Cada pessoa acessa o painel com o próprio login e um perfil de acesso."
      action={<button type="button" className={primaryBtn} onClick={() => setEditing('new')}><span className="material-symbols-outlined text-[18px]">person_add</span>Novo usuário</button>}
    >
      {!members ? (
        <p className="py-8 text-center text-sm text-[#7b8497]">Carregando equipe...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#edf0f5] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8992a4]">
                <th className="py-2 pr-3">Usuário</th>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2">Último acesso</th>
                <th className="py-2 pl-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isSelf = member.id === currentUser.id;
                return (
                  <tr key={member.id} className="border-b border-[#f1f3f7] last:border-0">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef1fb] text-xs font-semibold uppercase text-[#4156b8]">{member.name.slice(0, 2)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#24324b]">{member.name}{isSelf && <span className="ml-2 rounded-full bg-[#eef1fb] px-2 py-0.5 text-[10px] font-bold text-[#4156b8]">Você</span>}</p>
                          <p className="truncate text-xs text-[#7b8497]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#47536a]">{ROLE_LABELS[member.role]}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.active ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f1f3f7] text-[#7b8497]'}`}>{member.active ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#7b8497]">{formatDate(member.last_login_at)}</td>
                    <td className="py-3 pl-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" title="Editar" aria-label={`Editar ${member.name}`} onClick={() => setEditing(member)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8992a4] hover:cursor-pointer hover:bg-[#f2f4f8] hover:text-[#142344]">
                          <span className="material-symbols-outlined text-[19px]">edit</span>
                        </button>
                        {!isSelf && (
                          <button type="button" title="Excluir" aria-label={`Excluir ${member.name}`} onClick={() => setRemoving(member)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8992a4] hover:cursor-pointer hover:bg-red-50 hover:text-red-600">
                            <span className="material-symbols-outlined text-[19px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
          <div key={role} className="rounded-xl border border-[#e8ebf1] bg-[#fafbfc] px-4 py-3">
            <p className="text-xs font-bold text-[#24324b]">{ROLE_LABELS[role]}</p>
            <p className="mt-0.5 text-xs text-[#7b8497]">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>
      {editing && (
        <MemberForm
          member={editing === 'new' ? null : editing}
          isSelf={editing !== 'new' && editing.id === currentUser.id}
          saving={busy}
          onClose={() => setEditing(null)}
          onSubmit={(values) => void submit(values)}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Excluir usuário?"
          heading="Esta ação não pode ser desfeita"
          message="O acesso será removido imediatamente. O histórico de atividades é mantido."
          subjectLabel="Usuário selecionado"
          subject={`${removing.name} · ${removing.email}`}
          confirmLabel="Excluir usuário"
          cancelLabel="Manter usuário"
          busy={busy}
          onConfirm={() => void remove()}
          onClose={() => setRemoving(null)}
        />
      )}
    </Card>
  );
};
