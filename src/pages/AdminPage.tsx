import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { adminLogin, adminLogout, checkAdminSession, getAdminUser } from '../lib/siteStore';
import { AdminPermission, AdminUser, ROLE_LABELS } from '../lib/adminApi';
import { AdminLogin } from './admin/AdminLogin';
import { CustomersTab } from './admin/CustomersTab';
import { SettingsTab } from './admin/SettingsTab';
import { ProductsTab } from './admin/ProductsTab';
import { BannersTab, CouponsTab, DiscountsTab } from './admin/OtherTabs';
import { DashboardTab } from './admin/DashboardTab';
import TagsTab from './admin/TagsTab';
import { OrdersTab } from './admin/OrdersTab';

const PageEditorTab = React.lazy(() =>
  import('./admin/PageEditorTab').then(({ PageEditorTab: Component }) => ({ default: Component })),
);

interface TabDef {
  id: string;
  label: string;
  desc: string;
  icon: string;
  permission?: AdminPermission;
  el: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Resumo', desc: 'Visão geral da loja', icon: 'dashboard', el: <DashboardTab /> },
  { id: 'orders', label: 'Pedidos', desc: 'Acompanhe e atualize as compras da loja', icon: 'receipt_long', permission: 'orders', el: <OrdersTab /> },
  { id: 'customers', label: 'Clientes', desc: 'Contas, compras e bloqueios', icon: 'group', permission: 'customers', el: <CustomersTab /> },
  { id: 'products', label: 'Produtos', desc: 'Catálogo, fotos e preços', icon: 'inventory_2', permission: 'catalog', el: <ProductsTab /> },
  { id: 'tags', label: 'Tags', desc: 'Crie e organize etiquetas', icon: 'sell', permission: 'catalog', el: <TagsTab /> },
  { id: 'discounts', label: 'Descontos', desc: 'Políticas e regras promocionais', icon: 'sell', permission: 'catalog', el: <DiscountsTab /> },
  { id: 'coupons', label: 'Cupons', desc: 'Códigos de desconto do checkout', icon: 'confirmation_number', permission: 'catalog', el: <CouponsTab /> },
  { id: 'banners', label: 'Banners', desc: 'Anúncios e textos do banner principal', icon: 'campaign', permission: 'catalog', el: <BannersTab /> },
  { id: 'page-editor', label: 'Editor de páginas', desc: 'Monte páginas em um canvas visual', icon: 'web', permission: 'catalog', el: null },
  { id: 'settings', label: 'Configurações', desc: 'Loja, pagamentos, equipe e conta', icon: 'settings', el: null },
];

const NAV_GROUPS = [
  { id: 'sales', label: 'Vendas', icon: 'shopping_bag', items: ['orders', 'customers'] },
  { id: 'catalog', label: 'Catálogo', icon: 'inventory_2', items: ['products', 'tags'] },
  { id: 'marketing', label: 'Marketing', icon: 'campaign', items: ['discounts', 'coupons', 'banners', 'page-editor'] },
];

const ADMIN_TABS_KEY = 'oticas_admin_tabs';

const readAdminTabs = (): { tab: string; openTabs: string[] } => {
  const fallback = { tab: 'dashboard', openTabs: ['dashboard'] };
  try {
    const saved = JSON.parse(sessionStorage.getItem(ADMIN_TABS_KEY) ?? 'null') as { tab?: unknown; openTabs?: unknown } | null;
    if (!saved || !Array.isArray(saved.openTabs)) return fallback;
    const ids = TABS.map((item) => item.id);
    const openTabs = [...new Set(saved.openTabs.filter((id): id is string => typeof id === 'string' && ids.includes(id)))];
    const tab = typeof saved.tab === 'string' && openTabs.includes(saved.tab) ? saved.tab : openTabs[0] ?? '';
    return { tab, openTabs };
  } catch {
    return fallback;
  }
};

const AdminPage: React.FC = () => {
  const toast = useToast();
  const [logged, setLogged] = useState<boolean | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState(() => readAdminTabs().tab);
  const [openTabs, setOpenTabs] = useState<string[]>(() => readAdminTabs().openTabs);
  const [draggingTab, setDraggingTab] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['sales', 'catalog', 'marketing']);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    checkAdminSession()
      .then((authenticated) => {
        if (!active) return;
        setUser(getAdminUser());
        setLogged(authenticated);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setLogged(false);
        toast.error(
          'Não foi possível verificar a sessão',
          reason instanceof Error ? reason.message : 'Tente recarregar a página.',
        );
      });
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    try {
      sessionStorage.setItem(ADMIN_TABS_KEY, JSON.stringify({ tab, openTabs }));
    } catch {
      /* sem ação */
    }
  }, [tab, openTabs]);

  useEffect(() => {
    const onSyncError = (event: Event) => {
      const message = event instanceof CustomEvent && typeof event.detail === 'string'
        ? event.detail
        : 'Os dados não foram salvos no servidor.';
      toast.error('Falha ao salvar os dados do painel', message);
    };
    window.addEventListener('site-admin-sync-error', onSyncError);
    return () => window.removeEventListener('site-admin-sync-error', onSyncError);
  }, [toast]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileMenuOpen]);

  const openTab = (id: string) => {
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTab(id);
  };

  const closeTab = (id: string) => {
    const idx = openTabs.indexOf(id);
    const next = openTabs.filter((t) => t !== id);
    setOpenTabs(next);
    if (tab === id) {
      const nextVisible = next.filter((tabId) => allowedTabs.some((item) => item.id === tabId));
      setTab(nextVisible[Math.min(Math.max(idx - 1, 0), nextVisible.length - 1)] ?? '');
    }
  };

  const reorderTabs = (sourceId: string, targetId: string) => {
    setOpenTabs((tabs) => {
      const sourceIndex = tabs.indexOf(sourceId);
      const targetIndex = tabs.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return tabs;
      const next = [...tabs];
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, sourceId);
      return next;
    });
  };

  if (logged === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f8] text-[#051647]">
        <span className="text-sm font-semibold">Verificando acesso...</span>
      </div>
    );
  }

  if (!logged || !user) {
    return (
      <AdminLogin
        onSubmit={async (email, password) => {
          if (!(await adminLogin(email, password))) {
            throw new Error('E-mail ou senha inválidos. Confira seus dados e tente novamente.');
          }
          setUser(getAdminUser());
          setLogged(true);
        }}
      />
    );
  }

  const allowedTabs = TABS.filter((item) => !item.permission || user.permissions.includes(item.permission));
  const visibleOpenTabs = openTabs.filter((id) => allowedTabs.some((item) => item.id === id));
  const current = visibleOpenTabs.includes(tab) ? allowedTabs.find((item) => item.id === tab) ?? null : null;
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AD';
  const renderTab = (item: TabDef) => (
    item.id === 'settings'
      ? <SettingsTab user={user} onUserChange={setUser} />
      : item.id === 'page-editor'
        ? <React.Suspense fallback={<p className="py-8 text-center text-sm text-[#68748a]">Carregando o editor visual…</p>}><PageEditorTab /></React.Suspense>
        : item.el
  );

  const logout = () => {
    void adminLogout()
      .then(() => {
        setLogged(false);
        setUser(null);
      })
      .catch((reason: unknown) => {
        toast.error(
          'Não foi possível sair',
          reason instanceof Error ? reason.message : 'Tente novamente.',
        );
      });
  };

  const sidebar = (
    <div className="flex h-full flex-col text-[#47536a]">
      {/* Header da logo — estilo CRM */}
      <div className={`relative z-10 flex h-24 shrink-0 items-center justify-center border-b border-[#e2e6ee] ${sidebarCollapsed ? 'px-0' : 'px-5'}`}>
        {sidebarCollapsed ? (
          <img src="/logos/logo-no-text.png" alt="Óticas Brasil" className="h-20 w-20 rounded-full object-contain" />
        ) : (
          <img src="/logos/admin-logo.png" alt="Óticas Brasil" className="h-[180px] w-auto object-contain" />
        )}
        <button
          onClick={() => setDrawer(false)}
          className="ml-auto rounded-lg p-2 text-[#737d91] transition hover:cursor-pointer hover:bg-[#f2f4f8] hover:text-[#142344] lg:hidden"
          aria-label="Fechar menu"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      {!sidebarCollapsed && (
        <div className="px-5 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a0a8b6]">Workspace</div>
      )}
      <nav aria-label="Navegação administrativa" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {(() => {
          const overview = allowedTabs.find((item) => item.id === 'dashboard')!;
          const active = overview.id === current?.id;
          return (
            <button
              type="button"
              title={sidebarCollapsed ? overview.label : undefined}
              aria-label={sidebarCollapsed ? overview.label : undefined}
              onClick={() => {
                openTab(overview.id);
                setDrawer(false);
              }}
              className={`group flex w-full items-center rounded-lg py-2.5 text-[13px] font-medium transition-colors hover:cursor-pointer ${
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                active ? 'bg-[#f1f3f8] text-[#142344]' : 'text-[#68748a] hover:bg-[#f7f8fa] hover:text-[#142344]'
              }`}
            >
              <span className={`material-symbols-outlined text-[19px] shrink-0 ${active ? 'text-[#4156b8]' : 'text-[#8992a4] group-hover:text-[#58657c]'}`}>{overview.icon}</span>
              <span className={`truncate transition-opacity duration-200 ${sidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>{overview.label}</span>
            </button>
          );
        })()}
        {NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((id) => allowedTabs.some((entry) => entry.id === id)) })).filter((group) => group.items.length > 0).map((group) => {
          const expanded = expandedGroups.includes(group.id);
          const groupActive = group.items.includes(current?.id ?? '');
          return (
            <div key={group.id} className="pt-1">
              <button
                type="button"
                aria-expanded={expanded}
                title={sidebarCollapsed ? group.label : undefined}
                onClick={() => setExpandedGroups((groups) => (
                  groups.includes(group.id) ? groups.filter((id) => id !== group.id) : [...groups, group.id]
                ))}
                className={`group flex w-full items-center rounded-lg py-2.5 text-[13px] font-medium transition-colors hover:cursor-pointer ${
                  sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } ${
                  groupActive ? 'text-[#142344]' : 'text-[#68748a] hover:bg-[#f7f8fa] hover:text-[#142344]'
                }`}
              >
                <span className={`material-symbols-outlined text-[19px] shrink-0 ${groupActive ? 'text-[#4156b8]' : 'text-[#8992a4] group-hover:text-[#58657c]'}`}>{group.icon}</span>
                <span className={`truncate transition-opacity duration-200 ${sidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>{group.label}</span>
                {!sidebarCollapsed && (
                  <span className={`ml-auto material-symbols-outlined text-[17px] text-[#929bad] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
                )}
              </button>
              {!sidebarCollapsed && (
                <div
                  aria-hidden={!expanded}
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
                    expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className={`ml-8 transition-[opacity,transform,margin] duration-200 ease-out motion-reduce:transition-none ${
                      expanded ? 'mt-0.5 translate-y-0 pb-0 opacity-100' : '-translate-y-1 pb-0 opacity-0'
                    }`}>
                      <div className="relative space-y-0.5">
                        <span aria-hidden="true" className="pointer-events-none absolute bottom-[18px] left-0 top-[18px] border-l border-[#d8dee8]" />
                        {group.items.map((id) => {
                          const item = allowedTabs.find((entry) => entry.id === id)!;
                          const itemActive = item.id === current?.id;
                          return (
                            <div key={item.id} className="relative pl-3">
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute -left-0 top-[calc(50%-8px)] h-2 w-3 rounded-bl-[7px] border-b border-l border-[#d8dee8]"
                              />
                              <button
                                type="button"
                                tabIndex={expanded ? 0 : -1}
                                onClick={() => {
                                  openTab(item.id);
                                  setDrawer(false);
                                }}
                                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors duration-150 hover:cursor-pointer ${
                                  itemActive
                                    ? 'bg-[#f1f3f8] text-[#34415e]'
                                    : 'text-[#818b9d] hover:bg-[#f7f8fa] hover:text-[#34415e]'
                                }`}
                              >
                                {item.label}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {(() => {
          const settings = allowedTabs.find((item) => item.id === 'settings')!;
          const active = settings.id === current?.id;
          return (
            <button
              type="button"
              title={sidebarCollapsed ? 'Configurações' : undefined}
              aria-label={sidebarCollapsed ? 'Configurações' : undefined}
              onClick={() => {
                openTab(settings.id);
                setDrawer(false);
              }}
              className={`group mt-1 flex w-full items-center rounded-lg py-2.5 text-[13px] font-medium transition-colors hover:cursor-pointer ${
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                active ? 'bg-[#f1f3f8] text-[#142344]' : 'text-[#68748a] hover:bg-[#f7f8fa] hover:text-[#142344]'
              }`}
            >
              <span className={`material-symbols-outlined text-[19px] shrink-0 ${active ? 'text-[#4156b8]' : 'text-[#8992a4] group-hover:text-[#58657c]'}`}>{settings.icon}</span>
              <span className={`truncate transition-opacity duration-200 ${sidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>Configurações</span>
            </button>
          );
        })()}
      </nav>
      <div className={`border-t border-[#e2e6ee] p-4 ${sidebarCollapsed ? 'space-y-3' : 'space-y-2'}`}>
        <div ref={profileMenuRef} className="relative">
          {profileMenuOpen && (
            <div
              role="menu"
              aria-label="Menu do administrador"
              className={`absolute z-40 mb-2 min-w-[200px] rounded-xl border border-[#e5e8ee] bg-white p-1.5 shadow-[0_8px_24px_rgba(20,35,68,0.14)] ${
                sidebarCollapsed ? 'bottom-0 left-full ml-2' : 'bottom-full left-0 right-0'
              }`}
            >
              <div className="px-3 py-2">
                <p className="truncate text-[12px] font-bold text-[#34415e]">{user.name}</p>
                <p className="truncate text-[11px] text-[#929bad]">{ROLE_LABELS[user.role]}</p>
              </div>
              <div className="my-1 border-t border-[#edf0f5]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  openTab('settings');
                  setProfileMenuOpen(false);
                  setDrawer(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#47536a] transition hover:cursor-pointer hover:bg-[#f5f7fb] hover:text-[#142344]"
              >
                <span className="material-symbols-outlined text-[17px] text-[#8992a4]">manage_accounts</span>
                Minha conta e senha
              </button>
              <div className="my-1 border-t border-[#edf0f5]" />
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#b54747] transition hover:cursor-pointer hover:bg-red-50"
              >
                <span className="material-symbols-outlined text-[17px]">logout</span>
                Sair
              </button>
            </div>
          )}
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            title={sidebarCollapsed ? user.name : undefined}
            onClick={() => setProfileMenuOpen((open) => !open)}
            className={`flex w-full items-center rounded-lg px-2 py-2 transition hover:cursor-pointer hover:bg-[#f7f8fa] ${
              sidebarCollapsed ? 'justify-center' : 'gap-3 text-left'
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#061748] text-xs font-bold text-white">
              {initials}
            </span>
            {!sidebarCollapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-[#34415e] leading-tight">{user.name}</span>
                  <span className="block truncate text-[11px] text-[#929bad]">{ROLE_LABELS[user.role]}</span>
                </span>
                <span className="material-symbols-outlined text-[16px] text-[#929bad]">more_vert</span>
              </>
            )}
          </button>
        </div>
        {!sidebarCollapsed && (
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e4e8f0] px-3 py-2 text-[12px] font-semibold text-[#47536a] transition hover:cursor-pointer hover:bg-[#f7f8fa] hover:text-[#142344]"
          >
            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
            Ver o site
          </Link>
        )}
        {sidebarCollapsed && (
          <Link
            to="/"
            title="Ver o site"
            aria-label="Ver o site"
            className="flex w-full items-center justify-center rounded-lg border border-[#e4e8f0] py-2 text-[#47536a] transition hover:cursor-pointer hover:bg-[#f7f8fa] hover:text-[#142344]"
          >
            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto flex min-h-screen max-w-[1920px] items-start gap-0 overflow-visible px-0 py-4 sm:px-4 lg:pl-8 lg:pr-6">
        {/* Sidebar flutuante estilo CRM — sticky, rounded-2xl, com toggle na borda */}
        <aside
          className={`sticky top-4 relative z-30 hidden h-[calc(100vh-2rem)] shrink-0 flex-col overflow-visible rounded-2xl border border-[#e2e6ee] bg-white shadow-sm transition-[width] duration-200 ease-out lg:flex ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
        >
          {sidebar}
          {/* Botão de expandir/colapsar na borda direita, alinhado à logo */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            className="absolute -right-3.5 top-8 z-50 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-[#e2e6ee] bg-white text-[#68748a] shadow-md transition-colors hover:bg-[#f2f4f8] hover:text-[#142344] cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${sidebarCollapsed ? '' : 'rotate-180'}`}>chevron_right</span>
          </button>
        </aside>

        {drawer && (
          <div className="lg:hidden fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-[#071a45]/55 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[min(18rem,88vw)] overflow-hidden rounded-r-2xl bg-white shadow-2xl">{sidebar}</div>
          </div>
        )}

        <main className="min-h-[calc(100vh-2rem)] flex-1">
        <div className="sticky top-0 z-20 flex h-[92px] items-end gap-2 rounded-t-2xl border-b border-[#dfe3ea] bg-[#f1f3f7]/95 px-3 pt-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="mb-2 shrink-0 rounded-lg p-2 text-[#34415e] transition hover:cursor-pointer hover:bg-[#e7eaf0] lg:hidden"
            aria-label="Abrir menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex h-full min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleOpenTabs.map((id) => {
                const t = allowedTabs.find((x) => x.id === id)!;
                const active = id === current?.id;
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={(event) => {
                      setDraggingTab(id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = event.dataTransfer.getData('text/plain') || draggingTab;
                      if (sourceId) reorderTabs(sourceId, id);
                      setDraggingTab(null);
                    }}
                    onDragEnd={() => setDraggingTab(null)}
                    title="Arraste para reposicionar"
                    className={`group relative mb-[-1px] flex h-11 w-40 min-w-40 max-w-40 shrink-0 items-center justify-between gap-2 rounded-t-[10px] border px-3 text-[13px] font-medium whitespace-nowrap transition-[background-color,color,opacity] ${
                      active
                        ? 'z-10 border-[#dfe3ea] border-b-white bg-white text-[#142344]'
                        : 'border-transparent bg-[#e7eaf0] text-[#68748a] hover:bg-[#eceef3] hover:text-[#34415e]'
                    } ${draggingTab === id ? 'cursor-grabbing opacity-40' : 'cursor-grab'} ${draggingTab && draggingTab !== id ? 'border-l-2 border-l-[#8b9be0]' : ''}`}
                  >
                    <button onClick={() => setTab(id)} className="flex h-full min-w-0 flex-1 items-center gap-2 cursor-pointer">
                      <span className={`material-symbols-outlined text-[17px] ${active ? 'text-[#4156b8]' : 'text-[#8992a4]'}`}>{t.icon}</span>
                      <span className="truncate" title={t.label}>{t.label}</span>
                    </button>
                    <button
                      onClick={() => closeTab(id)}
                      aria-label={`Fechar ${t.label}`}
                      title={`Fechar ${t.label}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[#8992a4] hover:cursor-pointer hover:bg-[#dce1e9] hover:text-[#34415e]"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
          {visibleOpenTabs.length === 0 ? (
            <div className="mx-auto flex min-h-[min(60vh,560px)] max-w-xl flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-5xl text-[#a2acbd]">tab</span>
              <h1 className="mt-4 text-xl font-bold text-[#142344]">Nenhuma aba aberta</h1>
              <p className="mt-2 text-sm leading-6 text-[#7b8497]">
                Abra uma tela pelo menu lateral para continuar usando o painel.
              </p>
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#061748] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2060] lg:hidden"
              >
                <span className="material-symbols-outlined text-[18px]">menu</span>
                Abrir menu
              </button>
            </div>
          ) : visibleOpenTabs.map((id) => {
            const t = allowedTabs.find((x) => x.id === id)!;
            return (
              <div key={id} className={id === current?.id ? '' : 'hidden'}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9edf9] text-[#4156b8]">
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold leading-tight tracking-tight text-[#142344]">{t.label}</h1>
                    <p className="mt-0.5 text-[13px] text-[#7b8497]">{t.desc}</p>
                  </div>
                </div>
                {renderTab(t)}
              </div>
            );
          })}
        </div>
      </main>
      </div>
    </div>
  );
};

export default AdminPage;
