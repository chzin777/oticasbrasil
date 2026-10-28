import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import { adminRequest, errorMessage } from '../../lib/adminApi';
import { ConfirmDialog } from './controls';
import { Card, fmtBRL, ghostBtn, inputCls, Pagination } from './ui';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  address: Record<string, string>;
  blocked: boolean;
  created_at: string;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
}

interface CustomerCartItem {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  options: Record<string, string>;
}

interface CustomerOrder {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  delivery_method: string;
  address: Record<string, string>;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  coupon_code: string | null;
  tracking_code: string | null;
  created_at: string;
  items: Array<{
    productId: string;
    product: { name?: string };
    quantity: number;
    unitPrice: string | number;
  }>;
}

interface CustomerDetails {
  customer: Customer;
  cart: { items: CustomerCartItem[]; updated_at: string | null };
  orders: CustomerOrder[];
}

type Filter = 'all' | 'buyers' | 'noOrders' | 'blocked';

const FILTERS = [
  { value: 'all' as Filter, label: 'Todos os clientes' },
  { value: 'buyers' as Filter, label: 'Com pedidos' },
  { value: 'noOrders' as Filter, label: 'Sem pedidos' },
  { value: 'blocked' as Filter, label: 'Bloqueados' },
];

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

const orderStatusLabels: Record<string, string> = {
  awaiting_payment: 'Aguardando pagamento',
  payment_confirmed: 'Pagamento confirmado',
  processing: 'Em preparação',
  shipped: 'Enviado',
  completed: 'Concluído',
  canceled: 'Cancelado',
};

const paymentStatusLabels: Record<string, string> = {
  demo_unpaid: 'Demonstrativo (não cobrado)',
  paid: 'Pago',
  refunded: 'Reembolsado',
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'Pix',
  card: 'Cartão',
  boleto: 'Boleto',
};

const CustomerDetailsModal: React.FC<{
  customer: Customer;
  details: CustomerDetails | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}> = ({ customer, details, loading, error, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101a2c]/55 p-3 sm:p-6" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-details-title"
      className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#f7f8fb] shadow-2xl"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[#e8ebf1] bg-white px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8992a4]">Ficha do cliente</p>
          <h2 id="customer-details-title" className="mt-1 truncate text-xl font-black text-[#142344]">{customer.name}</h2>
          <p className="truncate text-sm text-[#7b8497]">{customer.email}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhes do cliente" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#69758a] hover:bg-[#f1f3f7]">
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      <div className="overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-[#7b8497]">Carregando ficha do cliente...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
            <p className="font-semibold text-red-700">Não foi possível carregar os detalhes.</p>
            <p className="mt-1 text-sm text-[#7b8497]">{error}</p>
          </div>
        ) : details ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Pedidos', value: String(details.customer.orders_count), icon: 'receipt_long' },
                { label: 'Total gasto', value: fmtBRL(Number(details.customer.total_spent)), icon: 'payments' },
                { label: 'Itens no carrinho', value: String(details.cart.items.reduce((sum, item) => sum + item.quantity, 0)), icon: 'shopping_cart' },
                { label: 'Cliente desde', value: date(details.customer.created_at), icon: 'calendar_month' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-[#e8ebf1] bg-white p-4">
                  <div className="flex items-center gap-2 text-[#8992a4]">
                    <span className="material-symbols-outlined text-[18px]">{metric.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{metric.label}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-[#142344]">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-[#e8ebf1] bg-white p-5">
                <h3 className="font-bold text-[#142344]">Cadastro e contato</h3>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-[#8992a4]">Telefone</dt><dd className="text-right text-[#34415a]">{details.customer.phone || '—'}</dd>
                  <dt className="text-[#8992a4]">CPF</dt><dd className="text-right text-[#34415a]">{details.customer.cpf || '—'}</dd>
                  <dt className="text-[#8992a4]">Endereço</dt>
                  <dd className="text-right text-[#34415a]">
                    {[
                      details.customer.address?.street,
                      details.customer.address?.number,
                      details.customer.address?.complement,
                      details.customer.address?.neighborhood,
                      [details.customer.address?.city, details.customer.address?.state].filter(Boolean).join(' - '),
                      details.customer.address?.cep,
                    ].filter(Boolean).join(', ') || 'Não informado'}
                  </dd>
                  <dt className="text-[#8992a4]">Situação</dt>
                  <dd className={`text-right font-semibold ${details.customer.blocked ? 'text-red-700' : 'text-emerald-700'}`}>
                    {details.customer.blocked ? 'Bloqueado' : 'Ativo'}
                  </dd>
                </dl>
              </article>

              <article className="rounded-xl border border-[#e8ebf1] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-[#142344]">Carrinho atual</h3>
                  <span className="text-[11px] text-[#8992a4]">
                    {details.cart.updated_at ? `Atualizado ${dateTime(details.cart.updated_at)}` : 'Sem carrinho salvo'}
                  </span>
                </div>
                {details.cart.items.length ? (
                  <div className="mt-3 divide-y divide-[#f0f2f6]">
                    {details.cart.items.map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        {item.image ? <img src={item.image} alt="" className="h-12 w-12 rounded-lg bg-[#f3f5f8] object-contain" /> : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f3f5f8] text-[#8992a4]"><span className="material-symbols-outlined">glasses</span></span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#34415a]">{item.name}</p>
                          <p className="text-xs text-[#8992a4]">
                            {Object.values(item.options).filter(Boolean).join(' · ') || 'Opções padrão'} · Qtd. {item.quantity}
                          </p>
                        </div>
                        <p className="whitespace-nowrap text-sm font-bold text-[#34415a]">{fmtBRL(item.unitPrice * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-[#f7f8fb] p-4 text-center text-sm text-[#8992a4]">Carrinho vazio.</p>
                )}
              </article>
            </div>

            <article className="rounded-xl border border-[#e8ebf1] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-[#142344]">Últimas compras</h3>
                <span className="text-xs text-[#8992a4]">Exibindo até 10 pedidos mais recentes</span>
              </div>
              {details.orders.length ? (
                <div className="mt-3 space-y-3">
                  {details.orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-[#edf0f5] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8992a4]">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="mt-1 text-sm font-semibold text-[#34415a]">{dateTime(order.created_at)}</p>
                          <p className="mt-1 text-xs text-[#7b8497]">
                            {orderStatusLabels[order.status] || order.status} · {paymentStatusLabels[order.payment_status] || order.payment_status}
                            {' · '}{paymentMethodLabels[order.payment_method] || order.payment_method}
                            {' · '}{order.delivery_method === 'boutique' ? 'Retirada na loja' : 'Entrega'}
                          </p>
                        </div>
                        <p className="text-base font-black text-[#142344]">{fmtBRL(Number(order.total))}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#69758a]">
                        {order.items.map((item, index) => (
                          <span key={`${item.productId}-${index}`}>{item.product?.name || item.productId} × {item.quantity}</span>
                        ))}
                        {order.coupon_code && <span>Cupom: {order.coupon_code}</span>}
                        {order.tracking_code && <span>Rastreio: {order.tracking_code}</span>}
                        {Number(order.discount) > 0 && <span>Desconto: {fmtBRL(Number(order.discount))}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-[#f7f8fb] p-4 text-center text-sm text-[#8992a4]">Este cliente ainda não tem pedidos.</p>
              )}
            </article>
          </div>
        ) : null}
      </div>
    </section>
  </div>
);

const csvCell = (value: string | number) => {
  const text = String(value);
  // Evita que planilhas interpretem o conteúdo como fórmula
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const CustomersTab: React.FC = () => {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [target, setTarget] = useState<Customer | null>(null);
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await adminRequest<{ customers: Customer[] }>('/api/admin/customers');
      setCustomers(result.customers);
    } catch (error) {
      toast.error('Não foi possível carregar os clientes', errorMessage(error));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    return (customers ?? []).filter((customer) => {
      if (filter === 'buyers' && customer.orders_count === 0) return false;
      if (filter === 'noOrders' && customer.orders_count > 0) return false;
      if (filter === 'blocked' && !customer.blocked) return false;
      if (!term) return true;
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        (digits.length > 2 && `${customer.cpf ?? ''}${customer.phone ?? ''}`.replace(/\D/g, '').includes(digits))
      );
    });
  }, [customers, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openDetails = async (customer: Customer) => {
    setDetailsCustomer(customer);
    setDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      const result = await adminRequest<CustomerDetails>(`/api/admin/customers/${customer.id}`);
      setDetails(result);
    } catch (error) {
      const message = errorMessage(error);
      setDetailsError(message);
      toast.error('Não foi possível carregar a ficha do cliente', message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const list = customers ?? [];
    return {
      total: list.length,
      buyers: list.filter((customer) => customer.orders_count > 0).length,
      blocked: list.filter((customer) => customer.blocked).length,
      revenue: list.reduce((sum, customer) => sum + customer.total_spent, 0),
    };
  }, [customers]);

  const toggleBlock = async () => {
    if (!target) return;
    const blocked = !target.blocked;
    setBusy(true);
    try {
      await adminRequest(`/api/admin/customers/${target.id}`, { method: 'PATCH', body: { blocked } });
      toast.success(blocked ? 'Cliente bloqueado' : 'Cliente desbloqueado', target.email);
      setTarget(null);
      await load();
    } catch (error) {
      toast.error('Não foi possível atualizar o cliente', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const header = ['Nome', 'E-mail', 'Telefone', 'CPF', 'Cidade', 'UF', 'Pedidos', 'Total gasto', 'Cliente desde', 'Situação'];
    const rows = filtered.map((customer) => [
      customer.name,
      customer.email,
      customer.phone ?? '',
      customer.cpf ?? '',
      customer.address?.city ?? '',
      customer.address?.state ?? '',
      customer.orders_count,
      customer.total_spent.toFixed(2).replace('.', ','),
      date(customer.created_at),
      customer.blocked ? 'Bloqueado' : 'Ativo',
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Lista exportada', `${filtered.length} cliente(s) no arquivo CSV.`);
  };

  const syncHistory = async () => {
    setSyncing(true);
    try {
      const result = await adminRequest<{ queued: { customers: number; carts: number; orders: number } }>(
        '/api/admin/integrations/sync',
        { method: 'POST' },
      );
      toast.success(
        'Sincronização iniciada',
        `${result.queued.customers} clientes, ${result.queued.carts} carrinhos e ${result.queued.orders} pedidos enfileirados para o CRM.`,
      );
    } catch (error) {
      toast.error('Não foi possível sincronizar com o CRM', errorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Clientes', value: String(stats.total), icon: 'group' },
          { label: 'Com pedidos', value: String(stats.buyers), icon: 'shopping_bag' },
          { label: 'Bloqueados', value: String(stats.blocked), icon: 'block' },
          { label: 'Receita de clientes', value: fmtBRL(stats.revenue), icon: 'payments' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#e8ebf1] bg-white p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef1fb] text-[#4156b8]">
              <span className="material-symbols-outlined text-[21px]">{item.icon}</span>
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8992a4]">{item.label}</p>
              <p className="text-lg font-bold text-[#142344]">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card
        title="Clientes cadastrados"
        subtitle="Quem criou conta na loja. Consulte carrinhos e compras, bloqueie contas ou sincronize o histórico com o CRM."
        action={(
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostBtn} onClick={() => void syncHistory()} disabled={syncing}>
              <span className="material-symbols-outlined text-[18px]">{syncing ? 'sync' : 'sync_alt'}</span>
              {syncing ? 'Enfileirando...' : 'Sincronizar CRM'}
            </button>
            <button type="button" className={ghostBtn} onClick={exportCsv} disabled={!filtered.length}>
              <span className="material-symbols-outlined text-[18px]">download</span>Exportar CSV
            </button>
          </div>
        )}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#8a8d96]">search</span>
            <input
              className={`${inputCls} pl-10`}
              placeholder="Buscar por nome, e-mail, CPF ou telefone"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              aria-label="Buscar clientes"
            />
          </div>
          <CustomSelect className="sm:w-52 !h-[38px] !min-h-[38px] !rounded-lg !px-3 !py-2 !border-[#c6c5d0]" value={filter} options={FILTERS} onChange={(value) => { setFilter(value); setPage(1); }} aria-label="Filtrar clientes" />
        </div>

        {!customers ? (
          <p className="py-8 text-center text-sm text-[#7b8497]">Carregando clientes...</p>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-4xl text-[#a2acbd]">group_off</span>
            <p className="mt-2 font-semibold text-[#142344]">Nenhum cliente encontrado</p>
            <p className="mt-1 text-sm text-[#7b8497]">{customers.length ? 'Ajuste a busca ou o filtro.' : 'Os cadastros feitos na loja aparecerão aqui.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#edf0f5] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8992a4]">
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="px-3 py-2">Contato</th>
                    <th className="px-3 py-2 text-right">Pedidos</th>
                    <th className="px-3 py-2 text-right">Total gasto</th>
                    <th className="px-3 py-2">Cadastro</th>
                    <th className="px-3 py-2">Situação</th>
                    <th className="py-2 pl-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((customer) => (
                    <tr key={customer.id} className="border-b border-[#f1f3f7] last:border-0">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-[#24324b]">{customer.name}</p>
                        <p className="text-xs text-[#7b8497]">{customer.email}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#47536a]">
                        <p>{customer.phone || '—'}</p>
                        <p className="text-[#8992a4]">{[customer.address?.city, customer.address?.state].filter(Boolean).join(' - ') || 'Sem endereço'}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-[#47536a]">
                        {customer.orders_count}
                        {customer.last_order_at && <p className="text-[11px] text-[#8992a4]">último: {date(customer.last_order_at)}</p>}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-[#24324b]">{fmtBRL(customer.total_spent)}</td>
                      <td className="px-3 py-3 text-xs text-[#7b8497]">{date(customer.created_at)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${customer.blocked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {customer.blocked ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void openDetails(customer)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#4156b8] transition hover:cursor-pointer hover:bg-[#eef1fb]"
                          >
                            Detalhes
                          </button>
                          <button
                            type="button"
                            onClick={() => setTarget(customer)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:cursor-pointer ${customer.blocked ? 'text-[#4156b8] hover:bg-[#eef1fb]' : 'text-red-600 hover:bg-red-50'}`}
                          >
                            {customer.blocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </>
        )}
      </Card>

      {target && (
        <ConfirmDialog
          title={target.blocked ? 'Desbloquear cliente?' : 'Bloquear cliente?'}
          heading={target.blocked ? 'O cliente voltará a comprar' : 'O cliente perderá o acesso'}
          message={target.blocked ? 'A conta poderá entrar na loja e fazer pedidos novamente.' : 'A conta será desconectada e não poderá entrar nem fazer novos pedidos. Pedidos existentes são mantidos.'}
          subjectLabel="Cliente selecionado"
          subject={`${target.name} · ${target.email}`}
          confirmLabel={target.blocked ? 'Desbloquear cliente' : 'Bloquear cliente'}
          cancelLabel="Cancelar"
          icon={target.blocked ? 'lock_open' : 'block'}
          danger={!target.blocked}
          busy={busy}
          onConfirm={() => void toggleBlock()}
          onClose={() => setTarget(null)}
        />
      )}
      {detailsCustomer && (
        <CustomerDetailsModal
          customer={detailsCustomer}
          details={details}
          loading={detailsLoading}
          error={detailsError}
          onClose={() => setDetailsCustomer(null)}
        />
      )}
    </div>
  );
};
