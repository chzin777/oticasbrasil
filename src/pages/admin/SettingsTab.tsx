import React, { useState } from 'react';
import { AdminPermission, AdminUser } from '../../lib/adminApi';
import { AccountSection } from './settings/AccountSection';
import { AuditSection } from './settings/AuditSection';
import { DataSection } from './settings/DataSection';
import { CheckoutSection, MaintenanceSection, StoreInfoSection } from './settings/StoreSections';
import { TeamSection } from './settings/TeamSection';
import { useRemoteSettings } from './settings/useRemoteSettings';

type SectionId = 'store' | 'checkout' | 'maintenance' | 'team' | 'audit' | 'account' | 'data';

const SECTIONS: { id: SectionId; label: string; desc: string; icon: string; permission?: AdminPermission }[] = [
  { id: 'store', label: 'Dados da loja', desc: 'Nome, contato e documentos', icon: 'storefront', permission: 'settings' },
  { id: 'checkout', label: 'Pagamento e entrega', desc: 'Formas aceitas no checkout', icon: 'payments', permission: 'settings' },
  { id: 'maintenance', label: 'Manutenção', desc: 'Tirar a loja do ar', icon: 'construction', permission: 'settings' },
  { id: 'team', label: 'Equipe e permissões', desc: 'Usuários do painel', icon: 'group', permission: 'team' },
  { id: 'audit', label: 'Atividades', desc: 'Histórico de ações', icon: 'history', permission: 'audit' },
  { id: 'account', label: 'Minha conta', desc: 'Perfil e senha', icon: 'manage_accounts' },
  { id: 'data', label: 'Backup do catálogo', desc: 'Exportar e restaurar', icon: 'database', permission: 'catalog' },
];

export const SettingsTab: React.FC<{ user: AdminUser; onUserChange: (user: AdminUser) => void }> = ({ user, onUserChange }) => {
  const available = SECTIONS.filter((section) => !section.permission || user.permissions.includes(section.permission));
  const [selected, setSelected] = useState<SectionId>(available[0].id);
  const { settings, saving, save } = useRemoteSettings(user.permissions.includes('settings'));
  const section = available.find((item) => item.id === selected) ?? available[0];
  const needsSettings = section.id === 'store' || section.id === 'checkout' || section.id === 'maintenance';

  const content = () => {
    if (needsSettings && !settings) {
      return <p className="rounded-2xl border border-[#e8ebf1] bg-white p-8 text-center text-sm text-[#7b8497]">Carregando configurações...</p>;
    }
    const shared = settings ? { settings, saving, onSave: save } : null;
    switch (section.id) {
      case 'store': return shared && <StoreInfoSection {...shared} />;
      case 'checkout': return shared && <CheckoutSection {...shared} />;
      case 'maintenance': return shared && <MaintenanceSection {...shared} />;
      case 'team': return <TeamSection currentUser={user} />;
      case 'audit': return <AuditSection />;
      case 'account': return <AccountSection user={user} onUserChange={onUserChange} />;
      case 'data': return <DataSection />;
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="Seções de configuração" className="flex gap-1 overflow-x-auto lg:flex-col lg:self-start lg:rounded-2xl lg:border lg:border-[#e8ebf1] lg:bg-white lg:p-2">
        {available.map((item) => {
          const active = item.id === section.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => setSelected(item.id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:cursor-pointer ${
                active ? 'bg-[#eef1fb] text-[#142344]' : 'text-[#68748a] hover:bg-[#f5f7fb] hover:text-[#142344]'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${active ? 'text-[#4156b8]' : 'text-[#8992a4]'}`}>{item.icon}</span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-[13px] font-semibold">{item.label}</span>
                <span className="hidden text-[11px] text-[#8992a4] lg:block">{item.desc}</span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="min-w-0">{content()}</div>
    </div>
  );
};
