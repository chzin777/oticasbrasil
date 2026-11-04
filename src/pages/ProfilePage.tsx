import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerData, AddressData } from '../types';
import { CATALOG_PRODUCTS } from '../lib/siteStore';
import { useWishlist } from '../components/WishlistContext';
import { useToast } from '../components/ToastContext';

interface ProfilePageProps {
  customer: CustomerData;
  address: AddressData;
  cartCount: number;
  onUpdateCustomer: (updated: Partial<CustomerData>) => void;
  onUpdateAddress: (address: AddressData) => void;
  onOpenCart: () => void;
}

type Tab = 'dados' | 'endereco' | 'favoritos';

const TABS: { key: Tab; label: string; icon: string; desc: string }[] = [
  { key: 'dados', label: 'Dados pessoais', icon: 'person', desc: 'Nome, CPF, telefone e e-mail' },
  { key: 'endereco', label: 'Endereço', icon: 'location_on', desc: 'Endereço padrão de entrega' },
  { key: 'favoritos', label: 'Favoritos', icon: 'favorite', desc: 'Produtos salvos na sua lista' },
];

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const inputCls =
  'w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-3.5 text-sm text-[#191c1e] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#061748] focus:ring-2 focus:ring-[#061748]/10 focus:bg-white transition-all disabled:bg-[#f3f4f6] disabled:text-[#6b7280] disabled:border-[#e5e7eb] disabled:cursor-not-allowed';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  customer,
  address,
  cartCount,
  onUpdateCustomer,
  onUpdateAddress,
  onOpenCart,
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { ids, remove } = useWishlist();
  const [tab, setTab] = useState<Tab>('dados');
  const [editing, setEditing] = useState(false);
  const [draftCustomer, setDraftCustomer] = useState(customer);
  const [draftAddress, setDraftAddress] = useState(address);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const favorites = ids
    .map((id) => CATALOG_PRODUCTS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const initials = customer.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const firstName = customer.name.split(' ')[0] || 'Visitante';

  const selectTab = (t: Tab) => {
    setTab(t);
    setEditing(false);
    setSaved(false);
  };

  const startEdit = () => {
    setDraftCustomer(customer);
    setDraftAddress(address);
    setSaved(false);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draftCustomer, address: draftAddress }),
      });
      const result = await response.json() as {
        user?: { name: string; email: string; cpf?: string | null; phone?: string | null };
        error?: string;
      };
      if (!response.ok || !result.user) {
        throw new Error(result.error || 'Não foi possível salvar seus dados.');
      }
      onUpdateCustomer({
        name: result.user.name,
        email: result.user.email,
        cpf: result.user.cpf || '',
        phone: result.user.phone || '',
      });
      onUpdateAddress(draftAddress);
      setEditing(false);
      setSaved(true);
      toast.success('Perfil atualizado', 'Seus dados foram salvos com sucesso.');
    } catch (error) {
      toast.error(
        'Erro ao atualizar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  const c = editing ? draftCustomer : customer;
  const a = editing ? draftAddress : address;

  const Field = ({ label, value, onChange, span = '', type = 'text', placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void; span?: string; type?: string; placeholder?: string;
  }) => (
    <label className={`block ${span}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] mb-2 block">{label}</span>
      <input
        type={type}
        className={inputCls}
        value={value}
        disabled={!editing}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#061748] text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#061748] via-[#0a2060] to-[#1a3a8a]" aria-hidden="true" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-[#C4D600]/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-[#4156b8]/20 blur-3xl" aria-hidden="true" />

        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#C4D600] to-[#a8b800] text-[#061748] flex items-center justify-center text-3xl sm:text-4xl font-black shadow-xl ring-4 ring-white/10">
                {initials}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C4D600] mb-1">Minha conta</p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Olá, {firstName}</h1>
              <p className="text-white/60 mt-2 text-sm sm:text-base truncate max-w-md">{customer.email}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex sm:grid grid-cols-2 gap-3 sm:gap-4 sm:w-80 shrink-0">
              <button
                onClick={() => selectTab('favoritos')}
                className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left transition-all cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#C4D600] text-[24px] group-hover:scale-110 transition-transform">favorite</span>
                <p className="text-3xl font-black leading-none mt-3">{ids.length}</p>
                <p className="text-[11px] text-white/50 mt-1 font-medium">Favoritos</p>
              </button>
              <button
                onClick={onOpenCart}
                className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left transition-all cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#C4D600] text-[24px] group-hover:scale-110 transition-transform">shopping_bag</span>
                <p className="text-3xl font-black leading-none mt-3">{cartCount}</p>
                <p className="text-[11px] text-white/50 mt-1 font-medium">Na sacola</p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">

          {/* Sidebar Navigation */}
          <nav className="bg-white rounded-2xl shadow-sm border border-[#eceef0] p-3 flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-28 z-10">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => selectTab(t.key)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#061748] text-white shadow-md shadow-[#061748]/20'
                      : 'text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#061748]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${active ? 'text-[#C4D600]' : ''}`}>{t.icon}</span>
                  <span className="flex flex-col items-start">
                    <span>{t.label}</span>
                    {active && <span className="text-[10px] font-normal text-white/60 hidden lg:block">{t.desc}</span>}
                  </span>
                </button>
              );
            })}
            <div className="hidden lg:block h-px bg-[#eceef0] my-2" />
            <button
              onClick={() => navigate('/armacoes')}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold whitespace-nowrap text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#061748] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
              Continuar comprando
            </button>
          </nav>

          {/* Content Panel */}
          <section className="bg-white rounded-3xl shadow-sm border border-[#eceef0] overflow-hidden">
            {/* Success Banner */}
            {saved && !editing && (
              <div className="mx-6 sm:mx-8 mt-6 sm:mt-8 flex items-center gap-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-sm font-semibold px-5 py-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Dados atualizados com sucesso!
              </div>
            )}

            {/* Tab: Dados Pessoais */}
            {tab === 'dados' && (
              <div className="p-6 sm:p-10">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-[#061748]">Dados pessoais</h2>
                    <p className="text-[#6b7280] mt-1">Informações usadas na identificação dos seus pedidos.</p>
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#061748]/20 text-sm font-bold text-[#061748] hover:bg-[#061748] hover:text-white hover:border-[#061748] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      Editar
                    </button>
                  )}
                </div>

                <form onSubmit={save} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
                    <Field label="Nome completo" value={c.name} onChange={(v) => setDraftCustomer({ ...draftCustomer, name: v })} span="md:col-span-2" placeholder="Seu nome completo" />
                    <Field label="CPF" value={c.cpf || ''} onChange={(v) => setDraftCustomer({ ...draftCustomer, cpf: v })} placeholder="000.000.000-00" />
                    <Field label="WhatsApp" value={c.phone || ''} onChange={(v) => setDraftCustomer({ ...draftCustomer, phone: v })} placeholder="(00) 00000-0000" />
                    <Field label="E-mail" value={c.email} onChange={(v) => setDraftCustomer({ ...draftCustomer, email: v })} span="md:col-span-2" type="email" placeholder="voce@email.com" />
                  </div>

                  {editing && (
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-6 border-t border-[#f3f4f6] mt-8">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-6 py-3.5 rounded-xl text-sm font-bold text-[#4b5563] hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3.5 rounded-xl text-sm font-bold bg-[#061748] text-white hover:bg-[#0a2060] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#061748]/20"
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                            Salvando...
                          </span>
                        ) : 'Salvar alterações'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Tab: Endereço */}
            {tab === 'endereco' && (
              <div className="p-6 sm:p-10">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-[#061748]">Endereço de entrega</h2>
                    <p className="text-[#6b7280] mt-1">Usado como padrão no cálculo de frete e no checkout.</p>
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#061748]/20 text-sm font-bold text-[#061748] hover:bg-[#061748] hover:text-white hover:border-[#061748] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      Editar
                    </button>
                  )}
                </div>

                <form onSubmit={save} className="space-y-6">
                  <div className="grid md:grid-cols-6 gap-x-6 gap-y-5">
                    <Field label="CEP" value={a.cep || ''} onChange={(v) => setDraftAddress({ ...draftAddress, cep: v })} span="md:col-span-2" placeholder="00000-000" />
                    <Field label="Rua" value={a.street || ''} onChange={(v) => setDraftAddress({ ...draftAddress, street: v })} span="md:col-span-3" placeholder="Nome da rua" />
                    <Field label="Número" value={a.number || ''} onChange={(v) => setDraftAddress({ ...draftAddress, number: v })} span="md:col-span-1" placeholder="000" />
                    <Field label="Complemento" value={a.complement || ''} onChange={(v) => setDraftAddress({ ...draftAddress, complement: v })} span="md:col-span-3" placeholder="Apto, bloco, etc." />
                    <Field label="Bairro" value={a.neighborhood || ''} onChange={(v) => setDraftAddress({ ...draftAddress, neighborhood: v })} span="md:col-span-3" placeholder="Seu bairro" />
                    <Field label="Cidade" value={a.city || ''} onChange={(v) => setDraftAddress({ ...draftAddress, city: v })} span="md:col-span-4" placeholder="Sua cidade" />
                    <Field label="UF" value={a.state || ''} onChange={(v) => setDraftAddress({ ...draftAddress, state: v })} span="md:col-span-2" placeholder="SP" />
                  </div>

                  {editing && (
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-6 border-t border-[#f3f4f6] mt-8">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-6 py-3.5 rounded-xl text-sm font-bold text-[#4b5563] hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3.5 rounded-xl text-sm font-bold bg-[#061748] text-white hover:bg-[#0a2060] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#061748]/20"
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                            Salvando...
                          </span>
                        ) : 'Salvar endereço'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Tab: Favoritos */}
            {tab === 'favoritos' && (
              <div className="p-6 sm:p-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#061748]">Lista de desejos</h2>
                  <p className="text-[#6b7280] mt-1">
                    {favorites.length === 0 ? 'Nenhum produto salvo ainda.' : `${favorites.length} ${favorites.length === 1 ? 'item salvo' : 'itens salvos'}`}
                  </p>
                </div>

                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center text-center py-16 px-4">
                    <div className="w-20 h-20 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-[#d1d5db] text-[40px]">favorite</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#061748]">Sua lista está vazia</h3>
                    <p className="text-[#6b7280] mt-2 mb-8 max-w-xs">Toque no ícone de coração nos produtos para salvá-los aqui e comprar depois.</p>
                    <button
                      onClick={() => navigate('/armacoes')}
                      className="px-8 py-3.5 bg-[#061748] text-white rounded-full text-sm font-bold hover:bg-[#0a2060] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#061748]/20"
                    >
                      Explorar armações
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {favorites.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => navigate(`/produto/${prod.id}`)}
                        className="group rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:shadow-[#061748]/5 hover:border-[#C4D600]/50 transition-all duration-300 cursor-pointer bg-white"
                      >
                        <div className="aspect-[4/3] bg-[#f3f4f6] relative overflow-hidden">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <button
                            type="button"
                            aria-label="Remover da lista de desejos"
                            onClick={(e) => { e.stopPropagation(); remove(prod.id); }}
                            className="absolute bottom-3 right-3 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                          </button>
                        </div>
                        <div className="p-5">
                          <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">{prod.brand}</p>
                          <h3 className="text-sm font-bold text-[#061748] mt-1 truncate">{prod.name}</h3>
                          <p className="text-lg font-black text-[#061748] mt-3">{fmt(prod.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};