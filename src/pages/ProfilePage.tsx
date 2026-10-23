import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerData, AddressData } from '../types';
import { CATALOG_PRODUCTS } from '../data/mockData';
import { useWishlist } from '../components/WishlistContext';

interface ProfilePageProps {
  customer: CustomerData;
  address: AddressData;
  cartCount: number;
  onUpdateCustomer: (updated: Partial<CustomerData>) => void;
  onUpdateAddress: (address: AddressData) => void;
  onOpenCart: () => void;
}

type Tab = 'dados' | 'endereco' | 'favoritos';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dados', label: 'Dados pessoais', icon: 'person' },
  { key: 'endereco', label: 'Endereço de entrega', icon: 'location_on' },
  { key: 'favoritos', label: 'Lista de desejos', icon: 'favorite' },
];

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const inputCls =
  'w-full bg-white border border-[#c6c5d0] rounded-xl px-4 py-3 text-sm text-[#191c1e] placeholder:text-[#b0b3ba] focus:outline-none focus:border-[#4156b8] focus:ring-2 focus:ring-[#4156b8]/20 transition-all disabled:bg-[#f7f9fb] disabled:text-[#45464f] disabled:border-[#eceef0]';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  customer,
  address,
  cartCount,
  onUpdateCustomer,
  onUpdateAddress,
  onOpenCart,
}) => {
  const navigate = useNavigate();
  const { ids, remove } = useWishlist();
  const [tab, setTab] = useState<Tab>('dados');
  const [editing, setEditing] = useState(false);
  const [draftCustomer, setDraftCustomer] = useState(customer);
  const [draftAddress, setDraftAddress] = useState(address);
  const [saved, setSaved] = useState(false);

  const favorites = ids
    .map((id) => CATALOG_PRODUCTS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const initials = customer.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const firstName = customer.name.split(' ')[0];

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

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomer(draftCustomer);
    onUpdateAddress(draftAddress);
    setEditing(false);
    setSaved(true);
  };

  const c = editing ? draftCustomer : customer;
  const a = editing ? draftAddress : address;

  const field = (label: string, value: string, onChange: (v: string) => void, span = '') => (
    <label className={`block ${span}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#45464f] mb-1.5 block">{label}</span>
      <input className={inputCls} value={value} disabled={!editing} onChange={(e) => onChange(e.target.value)} />
    </label>
  );

  const formActions = editing ? (
    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="px-6 py-3 rounded-xl text-sm font-bold text-[#45464f] hover:bg-[#eceef0] transition-colors cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="px-6 py-3 rounded-xl text-sm font-bold bg-[#061748] text-white hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
      >
        Salvar alterações
      </button>
    </div>
  ) : null;

  const sectionHeader = (title: string, subtitle: string, showEdit: boolean) => (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-[#061748]">{title}</h2>
        <p className="text-sm text-[#767680] mt-0.5">{subtitle}</p>
      </div>
      {showEdit && !editing && (
        <button
          type="button"
          onClick={startEdit}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#c6c5d0] text-xs font-bold text-[#061748] hover:bg-[#061748] hover:text-white hover:border-[#061748] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          Editar
        </button>
      )}
    </div>
  );

  const successBanner = saved && !editing && (
    <div className="mb-5 flex items-center gap-2 bg-[#f4f9d0] border border-[#C4D600]/60 text-[#061748] text-sm font-semibold px-4 py-3 rounded-xl">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      Dados atualizados com sucesso.
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#061748] via-[#0a2060] to-[#4156b8] text-white p-6 sm:p-10 shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C4D600]/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-[#dbee2c] text-[#061748] flex items-center justify-center text-2xl font-black shadow-md ring-4 ring-white/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#dbee2c]">Minha conta</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Olá, {firstName}!</h1>
            <p className="text-sm text-white/70 mt-1 truncate">{customer.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-72">
            <button
              onClick={() => selectTab('favoritos')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-left transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#dbee2c] text-[22px]">favorite</span>
              <p className="text-2xl font-black leading-none mt-2">{ids.length}</p>
              <p className="text-[11px] text-white/70 mt-1">Favoritos</p>
            </button>
            <button
              onClick={onOpenCart}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-left transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#dbee2c] text-[22px]">shopping_bag</span>
              <p className="text-2xl font-black leading-none mt-2">{cartCount}</p>
              <p className="text-[11px] text-white/70 mt-1">Na sacola</p>
            </button>
          </div>
        </div>
      </section>

      <div className="mt-8 grid lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Navigation */}
        <nav className="bg-white rounded-2xl border border-[#eceef0] shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-40">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active ? 'bg-[#061748] text-white shadow-sm' : 'text-[#45464f] hover:bg-[#f2f4f6] hover:text-[#061748]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
          <button
            onClick={() => navigate('/armacoes')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap text-[#45464f] hover:bg-[#f2f4f6] hover:text-[#061748] transition-all cursor-pointer lg:mt-2 lg:border-t lg:border-[#eceef0] lg:rounded-t-none"
          >
            <span className="material-symbols-outlined text-[20px]">storefront</span>
            Continuar comprando
          </button>
        </nav>

        {/* Content */}
        <section className="bg-white rounded-3xl border border-[#eceef0] shadow-sm p-6 sm:p-8">
          {tab === 'dados' && (
            <form onSubmit={save} className="space-y-6">
              {sectionHeader('Dados pessoais', 'Informações usadas na identificação dos seus pedidos.', true)}
              {successBanner}
              <div className="grid sm:grid-cols-2 gap-5">
                {field('Nome completo', c.name, (v) => setDraftCustomer({ ...draftCustomer, name: v }), 'sm:col-span-2')}
                {field('CPF', c.cpf, (v) => setDraftCustomer({ ...draftCustomer, cpf: v }))}
                {field('WhatsApp', c.phone, (v) => setDraftCustomer({ ...draftCustomer, phone: v }))}
                {field('E-mail', c.email, (v) => setDraftCustomer({ ...draftCustomer, email: v }), 'sm:col-span-2')}
              </div>
              {formActions}
            </form>
          )}

          {tab === 'endereco' && (
            <form onSubmit={save} className="space-y-6">
              {sectionHeader('Endereço de entrega', 'Usado como padrão no frete e no checkout.', true)}
              {successBanner}
              <div className="grid sm:grid-cols-6 gap-5">
                {field('CEP', a.cep, (v) => setDraftAddress({ ...draftAddress, cep: v }), 'sm:col-span-2')}
                {field('Rua', a.street, (v) => setDraftAddress({ ...draftAddress, street: v }), 'sm:col-span-3')}
                {field('Número', a.number, (v) => setDraftAddress({ ...draftAddress, number: v }), 'sm:col-span-1')}
                {field('Complemento', a.complement, (v) => setDraftAddress({ ...draftAddress, complement: v }), 'sm:col-span-3')}
                {field('Bairro', a.neighborhood, (v) => setDraftAddress({ ...draftAddress, neighborhood: v }), 'sm:col-span-3')}
                {field('Cidade', a.city, (v) => setDraftAddress({ ...draftAddress, city: v }), 'sm:col-span-4')}
                {field('UF', a.state, (v) => setDraftAddress({ ...draftAddress, state: v }), 'sm:col-span-2')}
              </div>
              {formActions}
            </form>
          )}

          {tab === 'favoritos' && (
            <div>
              {sectionHeader(
                'Lista de desejos',
                favorites.length === 1 ? '1 item salvo' : `${favorites.length} itens salvos`,
                false
              )}
              {favorites.length === 0 ? (
                <div className="flex flex-col items-center text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#f2f4f6] flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[#c6c5d0] text-[32px]">favorite</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#061748]">Nada por aqui ainda</h3>
                  <p className="text-sm text-[#767680] mt-1 mb-5">Toque no coração dos produtos para salvá-los.</p>
                  <button
                    onClick={() => navigate('/armacoes')}
                    className="px-6 py-2.5 bg-[#061748] text-white rounded-full text-sm font-bold hover:bg-[#0a2060] transition-colors cursor-pointer"
                  >
                    Explorar armações
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {favorites.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => navigate(`/produto/${prod.id}`)}
                      className="group rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 cursor-pointer bg-white"
                    >
                      <div className="aspect-[4/3] bg-[#eceef0] relative overflow-hidden">
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <button
                          type="button"
                          aria-label="Remover da lista de desejos"
                          onClick={(e) => { e.stopPropagation(); remove(prod.id); }}
                          className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] text-[#45464f] uppercase tracking-wide">{prod.brand}</p>
                        <h3 className="text-sm font-bold text-[#061748] truncate">{prod.name}</h3>
                        <p className="text-base font-black text-[#061748] mt-2">{fmt(prod.price)}</p>
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
  );
};
