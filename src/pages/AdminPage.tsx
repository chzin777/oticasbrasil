import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminLogin, adminLogout, isAdminLoggedIn } from '../lib/siteStore';
import { inputCls, primaryBtn } from './admin/ui';
import { ProductsTab } from './admin/ProductsTab';
import { BannersTab, CouponsTab, DiscountsTab, SettingsTab } from './admin/OtherTabs';
import { DashboardTab } from './admin/DashboardTab';

const TABS = [
  { id: 'dashboard', label: 'Resumo', desc: 'Visão geral da loja', icon: 'dashboard', el: <DashboardTab /> },
  { id: 'products', label: 'Produtos', desc: 'Catálogo, fotos e preços', icon: 'inventory_2', el: <ProductsTab /> },
  { id: 'discounts', label: 'Descontos', desc: 'Promoções em massa', icon: 'sell', el: <DiscountsTab /> },
  { id: 'coupons', label: 'Cupons', desc: 'Códigos de desconto do checkout', icon: 'confirmation_number', el: <CouponsTab /> },
  { id: 'banners', label: 'Banners', desc: 'Anúncios e textos do banner principal', icon: 'campaign', el: <BannersTab /> },
  { id: 'settings', label: 'Backup e senha', desc: 'Exportar, importar e proteger', icon: 'settings', el: <SettingsTab /> },
];

const AdminPage: React.FC = () => {
  const [logged, setLogged] = useState(isAdminLoggedIn());
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [openTabs, setOpenTabs] = useState<string[]>(['dashboard']);
  const [drawer, setDrawer] = useState(false);

  const openTab = (id: string) => {
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTab(id);
  };

  const closeTab = (id: string) => {
    if (openTabs.length === 1) return;
    const idx = openTabs.indexOf(id);
    const next = openTabs.filter((t) => t !== id);
    setOpenTabs(next);
    if (tab === id) setTab(next[Math.max(0, idx - 1)]);
  };

  if (!logged) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#061748] overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#dbee2c]/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (adminLogin(password)) setLogged(true);
            else setError(true);
          }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-5"
        >
          <div className="text-center">
            <img src="/logos/logo-blue.png" alt="Óticas Brasil" className="h-12 mx-auto mb-5" />
            <h1 className="text-xl font-black text-[#061748]">Painel administrativo</h1>
            <p className="text-sm text-[#767680] mt-1">Digite a senha para continuar</p>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8d96] text-[20px]">lock</span>
            <input
              type="password"
              autoFocus
              className={`${inputCls} pl-10`}
              placeholder="Senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
            />
          </div>
          {error && <p className="text-sm text-red-600 font-semibold">Senha incorreta.</p>}
          <button type="submit" className={`${primaryBtn} w-full`}>Entrar</button>
          <Link to="/" className="block text-center text-xs font-bold text-[#767680] hover:text-[#061748]">
            ← Voltar ao site
          </Link>
        </form>
      </div>
    );
  }

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  const logout = () => {
    adminLogout();
    setLogged(false);
    setPassword('');
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-[#061748] text-white">
      <div className="px-6 pt-6 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Menu</p>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {TABS.map((t) => {
          const active = t.id === current.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                openTab(t.id);
                setDrawer(false);
              }}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#dbee2c]" />}
              <span className={`material-symbols-outlined text-[22px] ${active ? 'text-[#dbee2c]' : ''}`}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 space-y-2">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-[#dbee2c] text-[#061748] text-sm font-black hover:brightness-95 transition"
        >
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          Ver o site
        </Link>
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f2f4f8]">
      <header className="fixed top-3 inset-x-3 sm:inset-x-4 h-16 z-40 bg-white/90 backdrop-blur-md border border-white shadow-[0_8px_30px_rgba(6,23,72,0.12)] rounded-2xl flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawer(true)} className="lg:hidden p-2 -ml-2 rounded-xl text-[#061748] hover:bg-[#f2f4f6] cursor-pointer" aria-label="Abrir menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <img src="/logos/logo-blue.png" alt="Óticas Brasil" className="h-9 w-auto" />
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-[#dbee2c] text-[#061748] px-2.5 py-1 rounded-full">
            <span className="material-symbols-outlined text-[14px]">shield_person</span>
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-[#061748] hover:bg-[#f2f4f6] transition">
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Ver site
          </Link>
          <button onClick={logout} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#061748] hover:bg-[#0a2060] transition cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sair
          </button>
        </div>
      </header>

      <aside className="hidden lg:block fixed top-24 bottom-4 left-4 w-64 z-30 rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(6,23,72,0.30)]">{sidebar}</aside>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute left-3 top-3 bottom-3 w-72 rounded-3xl overflow-hidden shadow-2xl">{sidebar}</div>
        </div>
      )}

      <main className="pt-24 lg:pl-[17.5rem] pr-0">
        <div className="w-full px-3 sm:px-5 py-6">
          <div className="flex items-end gap-1 overflow-x-auto mb-6 border-b border-[#dfe3ea] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {openTabs.map((id) => {
              const t = TABS.find((x) => x.id === id)!;
              const active = id === current.id;
              return (
                <div
                  key={id}
                  className={`group flex items-center gap-2 pl-4 pr-2 py-2.5 rounded-t-xl text-sm font-bold whitespace-nowrap border border-b-0 transition-colors ${
                    active ? 'bg-white text-[#061748] border-[#dfe3ea] -mb-px' : 'bg-transparent text-[#767680] border-transparent hover:bg-white/60'
                  }`}
                >
                  <button onClick={() => setTab(id)} className="flex items-center gap-2 cursor-pointer">
                    <span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#4156b8]' : ''}`}>{t.icon}</span>
                    {t.label}
                  </button>
                  {openTabs.length > 1 && (
                    <button onClick={() => closeTab(id)} aria-label={`Fechar ${t.label}`} className="w-6 h-6 rounded-full flex items-center justify-center text-[#8a8d96] hover:bg-[#eceef0] hover:text-[#061748] cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {openTabs.map((id) => {
            const t = TABS.find((x) => x.id === id)!;
            return (
              <div key={id} className={id === current.id ? '' : 'hidden'}>
                <div className="flex items-center gap-4 mb-7">
                  <div className="w-12 h-12 rounded-2xl bg-[#061748] text-[#dbee2c] flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined">{t.icon}</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-[#061748] leading-tight">{t.label}</h1>
                    <p className="text-sm text-[#767680]">{t.desc}</p>
                  </div>
                </div>
                {t.el}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
