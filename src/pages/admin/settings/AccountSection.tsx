import React, { useState } from 'react';
import { useToast } from '../../../components/ToastContext';
import { AdminUser, adminRequest, errorMessage, ROLE_LABELS } from '../../../lib/adminApi';
import { changeAdminPassword, setAdminUserName } from '../../../lib/siteStore';
import { Card, Field, inputCls, primaryBtn } from '../ui';

export const AccountSection: React.FC<{ user: AdminUser; onUserChange: (user: AdminUser) => void }> = ({ user, onUserChange }) => {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const saveName = async () => {
    if (name.trim().length < 2) {
      toast.error('Informe seu nome', 'Use pelo menos 2 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const result = await adminRequest<{ user: AdminUser }>('/api/admin/me', { method: 'PATCH', body: { name: name.trim() } });
      setAdminUserName(result.user.name);
      onUserChange(result.user);
      toast.success('Perfil atualizado');
    } catch (error) {
      toast.error('Não foi possível atualizar o perfil', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword) return toast.error('Informe a senha atual', 'Ela é necessária para confirmar a troca.');
    if (newPassword.length < 12) return toast.error('Senha muito curta', 'Use pelo menos 12 caracteres.');
    if (newPassword !== confirmPassword) return toast.error('As senhas não conferem', 'Digite a mesma senha nos dois campos.');
    setBusy(true);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada');
    } catch (error) {
      toast.error('Não foi possível alterar a senha', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Meu perfil" subtitle="Como você aparece para a equipe.">
        <div className="space-y-4">
          <Field label="Nome"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
          <Field label="E-mail de acesso"><input className={inputCls} value={user.email} disabled /></Field>
          <Field label="Perfil de acesso"><input className={inputCls} value={ROLE_LABELS[user.role]} disabled /></Field>
          <div className="flex justify-end">
            <button type="button" className={primaryBtn} disabled={busy || name.trim() === user.name} onClick={() => void saveName()}>Salvar perfil</button>
          </div>
        </div>
      </Card>
      <Card title="Alterar senha" subtitle="Use uma senha longa e exclusiva, com pelo menos 12 caracteres.">
        <div className="space-y-4">
          <Field label="Senha atual"><input type="password" autoComplete="current-password" className={inputCls} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></Field>
          <Field label="Nova senha"><input type="password" autoComplete="new-password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field>
          <Field label="Confirmar nova senha"><input type="password" autoComplete="new-password" className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>
          <div className="flex justify-end">
            <button type="button" className={primaryBtn} disabled={busy} onClick={() => void savePassword()}>Alterar senha</button>
          </div>
        </div>
      </Card>
    </div>
  );
};
