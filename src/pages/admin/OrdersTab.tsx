import React, { useCallback, useEffect, useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import { adminRequest, errorMessage } from '../../lib/adminApi';
import { ConfirmDialog } from './controls';
import { inputCls, Pagination } from './ui';

interface OrderRecord {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  delivery_method: string;
  address: Record<string, string>;
  subtotal: string;
  discount: string;
  total: string;
  coupon_code: string | null;
  tracking_code: string | null;
  created_at: string;
  email: string;
  name: string;
  phone: string | null;
  items: Array<{
    productId: string;
    product: { name?: string; image?: string };
    quantity: number;
    unitPrice: string;
  }>;
}

const currency = (value: string | number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusLabel: Record<string, string> = {
  awaiting_payment: 'Aguardando pagamento',
  payment_confirmed: 'Pagamento confirmado',
  processing: 'Em preparação',
  shipped: 'Enviado',
  completed: 'Concluído',
  canceled: 'Cancelado',
};

const paymentLabel: Record<string, string> = {
  demo_unpaid: 'Demonstrativo (não cobrado)',
  paid: 'Pago',
  refunded: 'Reembolsado',
};

const statusStyle: Record<string, string> = {
  awaiting_payment: 'bg-amber-50 text-amber-800',
  payment_confirmed: 'bg-sky-50 text-sky-800',
  processing: 'bg-indigo-50 text-indigo-800',
  shipped: 'bg-violet-50 text-violet-800',
  completed: 'bg-emerald-50 text-emerald-800',
  canceled: 'bg-red-50 text-red-700',
};

const statusOptions = Object.entries(statusLabel).map(([value, label]) => ({ value, label }));
const paymentOptions = Object.entries(paymentLabel).map(([value, label]) => ({ value, label }));

const OrderControls: React.FC<{ order: OrderRecord; onChanged: () => Promise<void> }> = ({ order, onChanged }) => {
  const toast = useToast();
  const [tracking, setTracking] = useState(order.tracking_code ?? '');
  const [pendingCancel, setPendingCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = async (body: Record<string, string>, success: string) => {
    setBusy(true);
    try {
      await adminRequest(`/api/admin/orders/${order.id}`, { method: 'PATCH', body });
      toast.success(success);
      await onChanged();
    } catch (error) {
      toast.error('Não foi possível atualizar o pedido', errorMessage(error));
    } finally {
      setBusy(false);
      setPendingCancel(false);
    }
  };

  const changeStatus = (status: string) => {
    if (status === order.status) return;
    if (status === 'canceled') setPendingCancel(true);
    else void update({ status }, 'Situação do pedido atualizada');
  };

  return (
    <div className="mt-4 grid gap-3 border-t border-[#eef0f4] pt-4 sm:grid-cols-3">
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7b8495]">Situação</p>
        <CustomSelect value={order.status} options={statusOptions} onChange={changeStatus} aria-label="Situação do pedido" />
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7b8495]">Pagamento</p>
        <CustomSelect
          value={order.payment_status}
          options={paymentOptions}
          onChange={(value) => value !== order.payment_status && void update({ paymentStatus: value }, 'Pagamento atualizado')}
          aria-label="Situação do pagamento"
        />
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7b8495]">Código de rastreio</p>
        <div className="flex gap-2">
          <input
            className={inputCls}
            maxLength={60}
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Ex.: BR123456789"
            aria-label="Código de rastreio"
          />
          <button
            type="button"
            disabled={busy || tracking.trim() === (order.tracking_code ?? '')}
            onClick={() => void update({ trackingCode: tracking }, 'Rastreio salvo')}
            className="shrink-0 rounded-xl border border-[#dfe4ec] px-3 text-sm font-bold text-[#4156b8] transition hover:cursor-pointer hover:bg-[#f5f6ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>
      {pendingCancel && (
        <ConfirmDialog
          title="Cancelar pedido?"
          heading="O pedido será marcado como cancelado"
          message="Use esta opção quando a compra não for mais seguir. O cliente verá o pedido como cancelado."
          subjectLabel="Pedido selecionado"
          subject={`#${order.id.slice(0, 8).toUpperCase()} · ${order.name}`}
          confirmLabel="Cancelar pedido"
          cancelLabel="Voltar"
          icon="cancel"
          danger
          busy={busy}
          onConfirm={() => void update({ status: 'canceled' }, 'Pedido cancelado')}
          onClose={() => setPendingCancel(false)}
        />
      )}
    </div>
  );
};

export const OrdersTab: React.FC = () => {

  const toast = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/orders', { credentials: 'same-origin' });
      const result = await response.json() as { orders?: OrderRecord[]; error?: string };
      if (!response.ok || !Array.isArray(result.orders)) {
        throw new Error(result.error || 'Não foi possível carregar os pedidos.');
      }
      setOrders(result.orders);
    } catch (error) {
      toast.error(
        'Falha ao carregar pedidos',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#142344]">Pedidos</h1>
          <p className="mt-1 text-sm text-[#7b8495]">Acompanhe pedidos registrados na loja.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
          className="rounded-xl border border-[#dfe4ec] bg-white px-4 py-2.5 text-sm font-bold text-[#4156b8] transition hover:bg-[#f5f6ff] disabled:opacity-60"
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </header>

      {loading && orders.length === 0 ? (
        <div className="rounded-2xl border border-[#e7ebf1] bg-white p-8 text-center text-sm text-[#7b8495]">
          Carregando pedidos...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfd6e2] bg-white p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-[#a2acbd]">receipt_long</span>
          <p className="mt-2 font-bold text-[#142344]">Nenhum pedido registrado</p>
          <p className="mt-1 text-sm text-[#7b8495]">Os pedidos feitos pela loja aparecerão aqui.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visibleOrders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-[#e7ebf1] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef0f4] pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7b8495]">
                      Pedido #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <h2 className="mt-1 font-bold text-[#142344]">{order.name}</h2>
                    <p className="text-sm text-[#7b8495]">{order.email}{order.phone ? ` · ${order.phone}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyle[order.status] || 'bg-slate-100 text-slate-700'}`}>
                      {statusLabel[order.status] || order.status}
                    </span>
                    <p className="mt-2 text-lg font-black text-[#142344]">{currency(order.total)}</p>
                    <p className="text-xs text-[#7b8495]">
                      {new Date(order.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7b8495]">Itens</p>
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-${item.productId}-${index}`} className="flex items-center gap-2 text-sm text-[#47536a]">
                          {item.product.image && (
                            <img src={item.product.image} alt="" className="h-9 w-9 rounded-lg bg-[#f4f6f9] object-contain" />
                          )}
                          <span className="min-w-0 flex-1 truncate">{item.product.name || item.productId} × {item.quantity}</span>
                          <span className="shrink-0 font-semibold">{currency(Number(item.unitPrice) * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7b8495]">Entrega e pagamento</p>
                    <p className="text-sm text-[#47536a]">
                      {order.delivery_method === 'boutique' ? 'Retirada na loja' : 'Entrega simulada'}
                      {' · '}{order.payment_method.toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Pagamento: {paymentLabel[order.payment_status] || order.payment_status}
                      {order.coupon_code ? ` · cupom ${order.coupon_code}` : ''}
                    </p>
                    {order.address && (
                      <p className="mt-2 text-xs leading-5 text-[#7b8495]">
                        {[order.address.street, order.address.number, order.address.neighborhood, order.address.city, order.address.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <OrderControls order={order} onChanged={loadOrders} />
              </article>
            ))}
          </div>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={orders.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </>
      )}
    </section>
  );
};
