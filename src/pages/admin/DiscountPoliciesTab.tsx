import React, { useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import { CATALOG_PRODUCTS } from '../../data/mockData';
import {
  deleteDiscountPolicy,
  DiscountPolicy,
  DiscountPolicyTrigger,
  DiscountTimeUnit,
  getDiscountPolicies,
  saveDiscountPolicy,
  useSiteData,
} from '../../lib/siteStore';
import { Card, Field, fmtBRL, ghostBtn, inputCls, Modal, Notice, Pagination, primaryBtn, STORAGE_FULL_MSG } from './ui';

type PolicyMessage = { kind: 'ok' | 'error'; text: string } | null;

const triggerOptions: { value: DiscountPolicyTrigger; label: string; icon: string }[] = [
  { value: 'first_purchase', label: 'Primeira compra', icon: 'shopping_bag' },
  { value: 'new_customer', label: 'Cliente novo', icon: 'person_add' },
  { value: 'returning_customer', label: 'Cliente recorrente', icon: 'loyalty' },
  { value: 'birthday', label: 'Aniversário do cliente', icon: 'cake' },
  { value: 'cart_value', label: 'Valor do carrinho', icon: 'payments' },
  { value: 'item_quantity', label: 'Quantidade de itens', icon: 'inventory_2' },
  { value: 'abandoned_cart', label: 'Carrinho abandonado', icon: 'remove_shopping_cart' },
  { value: 'progressive_time', label: 'Desconto crescente por tempo', icon: 'schedule' },
];

const unitLabel = (unit: DiscountTimeUnit) => unit === 'hours' ? 'horas' : 'dias';

const blankPolicy = (): DiscountPolicy => ({
  id: '',
  name: '',
  trigger: 'first_purchase',
  discountType: 'percentage',
  discountValue: 10,
  active: true,
  allProducts: true,
  productIds: [],
  duration: null,
  channels: ['email', 'whatsapp'],
  progressionSteps: [{ after: 24, unit: 'hours', discountValue: 15 }],
  createdAt: new Date().toISOString(),
});

const defaultTime = (): { value: number; unit: DiscountTimeUnit } => ({ value: 1, unit: 'days' });

const triggerDescription = (policy: DiscountPolicy) => {
  switch (policy.trigger) {
    case 'first_purchase': return 'Aplicar na primeira compra do cliente';
    case 'new_customer': return 'Aplicar para clientes identificados como novos';
    case 'returning_customer': return 'Aplicar para clientes com compra anterior';
    case 'birthday': return 'Campanha para o aniversário do cliente';
    case 'cart_value': {
      const min = policy.minCartValue ?? 0;
      const max = policy.maxCartValue ?? 0;
      if (policy.valueOperator === 'maximum') return `Carrinho abaixo de ${fmtBRL(max)}`;
      if (policy.valueOperator === 'between') return `Carrinho entre ${fmtBRL(min)} e ${fmtBRL(max)}`;
      return `Carrinho a partir de ${fmtBRL(min)}`;
    }
    case 'item_quantity': {
      const min = policy.minItems ?? 0;
      const max = policy.maxItems ?? 0;
      if (policy.quantityOperator === 'maximum') return `Até ${max} itens no carrinho`;
      if (policy.quantityOperator === 'between') return `Entre ${min} e ${max} itens no carrinho`;
      return `A partir de ${min} itens no carrinho`;
    }
    case 'abandoned_cart': return `Carrinho parado há ${policy.idleDuration?.value ?? 1} ${unitLabel(policy.idleDuration?.unit ?? 'days')}`;
    case 'progressive_time': return `${policy.progressionSteps.length} níveis de desconto por tempo`;
  }
};

const DiscountPolicyForm: React.FC<{
  initial: DiscountPolicy;
  onClose: () => void;
  onSave: (policy: DiscountPolicy) => void;
}> = ({ initial, onClose, onSave }) => {
  const [policy, setPolicy] = useState(initial);
  const toast = useToast();
  const patch = (changes: Partial<DiscountPolicy>) => setPolicy((current) => ({ ...current, ...changes }));
  const isProgressive = policy.trigger === 'progressive_time';
  const reject = (message: string) => toast.error('Revise os dados da política', message);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!policy.name.trim()) return reject('Informe o nome da política.');
    if (!(policy.discountValue > 0)) return reject('Informe um desconto maior que zero.');
    if (policy.discountType === 'percentage' && policy.discountValue > 100) return reject('O percentual máximo é 100%.');
    if (policy.active && !policy.allProducts && policy.productIds.length === 0) {
      return reject('Vincule ao menos um produto ou defina a política para todo o catálogo.');
    }
    if (policy.trigger === 'cart_value' && (policy.valueOperator ?? 'minimum') === 'minimum' && !(policy.minCartValue && policy.minCartValue > 0)) {
      return reject('Informe o valor mínimo do carrinho.');
    }
    if (policy.trigger === 'cart_value' && policy.valueOperator === 'maximum' && !(policy.maxCartValue && policy.maxCartValue > 0)) {
      return reject('Informe o valor máximo do carrinho.');
    }
    if (policy.trigger === 'cart_value' && policy.valueOperator === 'between' && !(policy.minCartValue && policy.maxCartValue)) {
      return reject('Informe os valores mínimo e máximo do carrinho.');
    }
    if (policy.trigger === 'cart_value' && policy.valueOperator === 'between' && (policy.maxCartValue ?? 0) <= (policy.minCartValue ?? 0)) {
      return reject('O valor final deve ser maior que o valor inicial.');
    }
    if (policy.trigger === 'item_quantity' && (policy.quantityOperator ?? 'minimum') === 'minimum' && !(policy.minItems && policy.minItems > 0)) {
      return reject('Informe a quantidade mínima de itens.');
    }
    if (policy.trigger === 'item_quantity' && policy.quantityOperator === 'maximum' && !(policy.maxItems && policy.maxItems > 0)) {
      return reject('Informe a quantidade máxima de itens.');
    }
    if (policy.trigger === 'item_quantity' && policy.quantityOperator === 'between' && !(policy.minItems && policy.maxItems)) {
      return reject('Informe as quantidades mínima e máxima.');
    }
    if (policy.trigger === 'item_quantity' && policy.quantityOperator === 'between' && (policy.maxItems ?? 0) <= (policy.minItems ?? 0)) {
      return reject('A quantidade final deve ser maior que a inicial.');
    }
    if (policy.trigger === 'abandoned_cart' && policy.channels.length === 0) {
      return reject('Selecione ao menos um canal previsto para recuperação.');
    }
    if (policy.trigger === 'abandoned_cart' && !(policy.idleDuration?.value && policy.idleDuration.value > 0)) {
      return reject('Informe por quanto tempo o carrinho deve ficar parado.');
    }
    if (policy.duration && !(policy.duration.value > 0)) return reject('A duração da política deve ser maior que zero.');
    if (isProgressive && policy.progressionSteps.some((step) => step.after <= 0 || step.discountValue <= 0)) {
      return reject('Preencha o tempo e o desconto de cada nível.');
    }
    if (isProgressive && policy.progressionSteps.some((step) => policy.discountType === 'percentage' && step.discountValue > 100)) {
      return reject('Os descontos progressivos não podem ultrapassar 100%.');
    }
    if (isProgressive && policy.progressionSteps.some((step, index, steps) => {
      if (index === 0) return step.discountValue <= policy.discountValue;
      const previous = steps[index - 1];
      const previousTime = previous.after * (previous.unit === 'days' ? 24 : 1);
      const currentTime = step.after * (step.unit === 'days' ? 24 : 1);
      return currentTime <= previousTime || step.discountValue <= previous.discountValue;
    })) {
      return reject('Cada nível progressivo deve ocorrer depois e oferecer desconto maior que o anterior.');
    }
    onSave({ ...policy, name: policy.name.trim() });
  };

  const toggleChannel = (channel: 'email' | 'whatsapp') => {
    const channels = policy.channels.includes(channel)
      ? policy.channels.filter((item) => item !== channel)
      : [...policy.channels, channel];
    patch({ channels });
  };

  return (
    <Modal title={initial.id ? 'Editar política de desconto' : 'Nova política de desconto'} onClose={onClose} wide fixedHeight>
      <form onSubmit={submit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da política" required className="sm:col-span-2">
            <input autoFocus className={inputCls} maxLength={80} placeholder="Ex.: Boas-vindas — primeira compra" value={policy.name} onChange={(event) => patch({ name: event.target.value })} />
          </Field>
          <Field label="Regra de ativação" required>
            <CustomSelect
              className={inputCls}
              value={policy.trigger}
              onChange={(trigger) => patch({ trigger })}
              options={triggerOptions}
            />
          </Field>
          <Field label="Status">
            <CustomSelect
              className={inputCls}
              value={policy.active ? 'active' : 'inactive'}
              onChange={(status) => patch({ active: status === 'active' })}
              options={[
                { value: 'active', label: 'Ativa' },
                { value: 'inactive', label: 'Pausada' },
              ]}
            />
          </Field>
          </div>

        {policy.trigger === 'cart_value' && (
          <div className="grid gap-4 rounded-xl border border-[#e8ebf1] bg-[#fafbfc] p-4 sm:grid-cols-3">
            <Field label="Condição">
              <CustomSelect
                className={inputCls}
                value={policy.valueOperator ?? 'minimum'}
                onChange={(valueOperator) => patch({ valueOperator })}
                options={[
                  { value: 'minimum', label: 'Acima de um valor' },
                  { value: 'maximum', label: 'Abaixo de um valor' },
                  { value: 'between', label: 'Entre dois valores' },
                ]}
              />
            </Field>
            {(policy.valueOperator ?? 'minimum') !== 'maximum' && (
              <Field label={policy.valueOperator === 'between' ? 'Valor mínimo (R$)' : 'Valor mínimo (R$)'}>
                <input type="number" min={0} step="0.01" className={inputCls} value={policy.minCartValue ?? ''} onChange={(event) => patch({ minCartValue: Number(event.target.value) })} />
              </Field>
            )}
            {(policy.valueOperator === 'maximum' || policy.valueOperator === 'between') && (
              <Field label="Valor máximo (R$)">
                <input type="number" min={0} step="0.01" className={inputCls} value={policy.maxCartValue ?? ''} onChange={(event) => patch({ maxCartValue: Number(event.target.value) })} />
              </Field>
            )}
          </div>
        )}

        {policy.trigger === 'item_quantity' && (
          <div className="grid gap-4 rounded-xl border border-[#e8ebf1] bg-[#fafbfc] p-4 sm:grid-cols-3">
            <Field label="Condição">
              <CustomSelect
                className={inputCls}
                value={policy.quantityOperator ?? 'minimum'}
                onChange={(quantityOperator) => patch({ quantityOperator })}
                options={[
                  { value: 'minimum', label: 'Acima de uma quantidade' },
                  { value: 'maximum', label: 'Abaixo de uma quantidade' },
                  { value: 'between', label: 'Entre duas quantidades' },
                ]}
              />
            </Field>
            {(policy.quantityOperator ?? 'minimum') !== 'maximum' && (
              <Field label="Quantidade mínima">
                <input type="number" min={1} step={1} className={inputCls} value={policy.minItems ?? ''} onChange={(event) => patch({ minItems: Number(event.target.value) })} />
              </Field>
            )}
            {(policy.quantityOperator === 'maximum' || policy.quantityOperator === 'between') && (
              <Field label="Quantidade máxima">
                <input type="number" min={1} step={1} className={inputCls} value={policy.maxItems ?? ''} onChange={(event) => patch({ maxItems: Number(event.target.value) })} />
              </Field>
            )}
          </div>
        )}

        {policy.trigger === 'abandoned_cart' && (
          <div className="space-y-3 rounded-xl border border-[#e8ebf1] bg-[#fafbfc] p-4">
            <p className="text-xs font-semibold text-[#34415e]">Considerar o carrinho parado após</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
              <input
                aria-label="Tempo sem atividade no carrinho"
                type="number"
                min={1}
                className={inputCls}
                value={policy.idleDuration?.value ?? 1}
                onChange={(event) => patch({ idleDuration: { ...(policy.idleDuration ?? defaultTime()), value: Number(event.target.value) } })}
              />
              <CustomSelect
                aria-label="Unidade de tempo sem atividade"
                className={inputCls}
                value={policy.idleDuration?.unit ?? 'days'}
                onChange={(unit) => patch({ idleDuration: { ...(policy.idleDuration ?? defaultTime()), unit } })}
                options={[
                  { value: 'hours', label: 'Horas' },
                  { value: 'days', label: 'Dias' },
                ]}
              />
            </div>
            <p className="text-xs font-semibold text-[#34415e]">Canais previstos para recuperação</p>
            <div className="flex flex-wrap gap-4">
              {(['email', 'whatsapp'] as const).map((channel) => (
                <label key={channel} className="flex items-center gap-2 text-xs font-medium text-[#47536a]">
                  <input type="checkbox" checked={policy.channels.includes(channel)} onChange={() => toggleChannel(channel)} className="h-4 w-4 accent-[#4156b8]" />
                  {channel === 'email' ? 'E-mail' : 'WhatsApp'}
                </label>
              ))}
            </div>
          </div>
        )}

        {isProgressive && (
          <div className="space-y-3 rounded-xl border border-[#e8ebf1] bg-[#fafbfc] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#34415e]">Níveis crescentes</p>
                <p className="mt-1 text-[11px] text-[#8992a4]">Cada nível define o desconto aplicado após o tempo indicado.</p>
              </div>
              <button type="button" className={ghostBtn} onClick={() => patch({ progressionSteps: [...policy.progressionSteps, { after: 48, unit: 'hours', discountValue: 20 }] })}>
                <span className="material-symbols-outlined text-[16px]">add</span>Adicionar nível
              </button>
            </div>
            {policy.progressionSteps.map((step, index) => (
              <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field label={`Nível ${index + 1} — após`}>
                  <input type="number" min={1} className={inputCls} value={step.after} onChange={(event) => patch({ progressionSteps: policy.progressionSteps.map((item, i) => i === index ? { ...item, after: Number(event.target.value) } : item) })} />
                </Field>
                <Field label="Unidade">
                  <CustomSelect
                    className={inputCls}
                    value={step.unit}
                    onChange={(unit) => patch({ progressionSteps: policy.progressionSteps.map((item, i) => i === index ? { ...item, unit } : item) })}
                    options={[
                      { value: 'hours', label: 'Horas' },
                      { value: 'days', label: 'Dias' },
                    ]}
                  />
                </Field>
                <Field label={`Desconto (${policy.discountType === 'percentage' ? '%' : 'R$'})`}>
                  <input type="number" min={0.01} max={policy.discountType === 'percentage' ? 100 : undefined} step="0.01" className={inputCls} value={step.discountValue} onChange={(event) => patch({ progressionSteps: policy.progressionSteps.map((item, i) => i === index ? { ...item, discountValue: Number(event.target.value) } : item) })} />
                </Field>
                <button type="button" aria-label={`Remover nível ${index + 1}`} disabled={policy.progressionSteps.length <= 1} onClick={() => patch({ progressionSteps: policy.progressionSteps.filter((_, i) => i !== index) })} className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#8992a4] hover:cursor-pointer hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}

          <div className="grid gap-4 rounded-xl border border-[#e8ebf1] p-4 sm:grid-cols-3">
          <Field label="Tipo de desconto">
            <CustomSelect
              className={inputCls}
              value={policy.discountType}
              onChange={(discountType) => patch({ discountType })}
              options={[
                { value: 'percentage', label: 'Percentual (%)' },
                { value: 'fixed', label: 'Valor fixo (R$)' },
              ]}
            />
          </Field>
          <Field label={policy.discountType === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'} required>
            <input type="number" min={0.01} max={policy.discountType === 'percentage' ? 100 : undefined} step="0.01" className={inputCls} value={policy.discountValue} onChange={(event) => patch({ discountValue: Number(event.target.value) })} />
          </Field>
          <Field label="Duração da política">
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                disabled={!policy.duration}
                className={inputCls}
                value={policy.duration?.value ?? ''}
                placeholder="Sem limite"
                onChange={(event) => patch({ duration: { ...(policy.duration ?? defaultTime()), value: Number(event.target.value) } })}
              />
              <CustomSelect
                aria-label="Unidade da duração da política"
                disabled={!policy.duration}
                className={`${inputCls} max-w-28`}
                value={policy.duration?.unit ?? 'days'}
                onChange={(unit) => patch({ duration: { ...(policy.duration ?? defaultTime()), unit } })}
                options={[
                  { value: 'hours', label: 'Horas' },
                  { value: 'days', label: 'Dias' },
                ]}
              />
            </div>
            <label className="mt-2 flex items-center gap-2 text-[11px] text-[#737d91]">
              <input type="checkbox" checked={!policy.duration} onChange={(event) => patch({ duration: event.target.checked ? null : defaultTime() })} className="h-3.5 w-3.5 accent-[#4156b8]" />
              Sem data de expiração
            </label>
          </Field>
          </div>

        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-[#eceef0] bg-white px-4 py-3 sm:px-8">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryBtn}>
            <span className="material-symbols-outlined text-[17px]">save</span>
            Salvar política
          </button>
        </div>
      </form>
    </Modal>
  );
};

const DiscountPoliciesTab: React.FC = () => {
  useSiteData();
  const toast = useToast();
  const policies = getDiscountPolicies();
  const [editing, setEditing] = useState<DiscountPolicy | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscountPolicy | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [message, setMessage] = useState<PolicyMessage>(null);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(policies.length / pageSize)));
  const visiblePolicies = policies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const productsById = new Map(CATALOG_PRODUCTS.map((product) => [product.id, product]));

  const save = (policy: DiscountPolicy) => {
    const next = {
      ...policy,
      id: policy.id || `policy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: policy.id ? policy.createdAt : new Date().toISOString(),
    };
    if (!saveDiscountPolicy(next)) {
      setMessage({ kind: 'error', text: STORAGE_FULL_MSG });
      toast.error('Não foi possível salvar a política', STORAGE_FULL_MSG);
      return;
    }
    setEditing(null);
    setExpandedId(next.id);
    setMessage({ kind: 'ok', text: 'Política salva. Regras e canais estão configurados como demonstração e ainda não são executados pelo checkout/CRM.' });
    toast.success(policy.id ? 'Política atualizada' : 'Política criada', next.name);
    if (!policy.id) setPage(Math.ceil((policies.length + 1) / pageSize));
  };

  const remove = () => {
    if (!confirmDelete) return;
    const policy = confirmDelete;
    if (!deleteDiscountPolicy(policy.id)) {
      setMessage({ kind: 'error', text: STORAGE_FULL_MSG });
      toast.error('Não foi possível excluir a política', STORAGE_FULL_MSG);
      return;
    }
    setConfirmDelete(null);
    setMessage({ kind: 'ok', text: 'Política removida.' });
    toast.success('Política excluída', policy.name);
    setPage((current) => Math.min(current, Math.max(1, Math.ceil((policies.length - 1) / pageSize))));
    if (expandedId === policy.id) setExpandedId(null);
  };

  const updateProducts = (policy: DiscountPolicy, productId: string, checked: boolean) => {
    const productIds = policy.allProducts
      ? CATALOG_PRODUCTS.filter((product) => checked || product.id !== productId).map((product) => product.id)
      : checked
        ? [...new Set([...policy.productIds, productId])]
        : policy.productIds.filter((id) => id !== productId);
    if (!saveDiscountPolicy({ ...policy, allProducts: false, productIds })) {
      setMessage({ kind: 'error', text: STORAGE_FULL_MSG });
      toast.error('Não foi possível atualizar os produtos da política', STORAGE_FULL_MSG);
    } else {
      setMessage(null);
      toast.success(checked ? 'Produto vinculado à política' : 'Vínculo removido', productsById.get(productId)?.name);
    }
  };

  const isExpired = (policy: DiscountPolicy) => {
    if (!policy.duration) return false;
    const durationMs = policy.duration.value * (policy.duration.unit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
    return Date.now() > new Date(policy.createdAt).getTime() + durationMs;
  };

  return (
    <div className="space-y-5">
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="flex items-start gap-3 rounded-xl border border-[#dfe5f4] bg-[#f5f7fd] p-4">
        <span className="material-symbols-outlined mt-0.5 text-[19px] text-[#4156b8]">info</span>
        <div>
          <p className="text-xs font-semibold text-[#34415e]">Configuração demonstrativa</p>
          <p className="mt-1 text-xs leading-relaxed text-[#737d91]">
            As políticas e os produtos vinculados ficam salvos neste navegador. Regras de cliente, carrinho, validade e envio por e-mail/WhatsApp são apenas configuradas aqui; ainda não são aplicadas no checkout nem integradas ao CRM.
          </p>
        </div>
      </div>

      <Card
        title="Políticas de desconto"
        subtitle={`${policies.length} ${policies.length === 1 ? 'política cadastrada' : 'políticas cadastradas'}`}
        action={
          <button type="button" className={primaryBtn} onClick={() => setEditing(blankPolicy())}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova política
          </button>
        }
      >
        {policies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9deea] px-5 py-10 text-center">
            <span className="material-symbols-outlined text-3xl text-[#9aa4b8]">sell</span>
            <p className="mt-2 text-sm font-semibold text-[#34415e]">Nenhuma política criada</p>
            <p className="mt-1 text-xs text-[#8992a4]">Crie regras promocionais e vincule os produtos que cada política deve abranger.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {visiblePolicies.map((policy) => {
                const expired = isExpired(policy);
                const active = policy.active && !expired;
                const expanded = expandedId === policy.id;
                const search = (productSearch[policy.id] ?? '').trim().toLocaleLowerCase('pt-BR');
                const matches = CATALOG_PRODUCTS.filter((product) => (
                  !search ||
                  product.name.toLocaleLowerCase('pt-BR').includes(search) ||
                  product.brand.toLocaleLowerCase('pt-BR').includes(search)
                ));
                const assignedProducts = policy.productIds.map((id) => productsById.get(id)).filter((product) => product !== undefined);
                const assignedProductPreview = assignedProducts.slice(0, 8);
                const trigger = triggerOptions.find((item) => item.value === policy.trigger);
                const durationText = policy.duration ? `${policy.duration.value} ${unitLabel(policy.duration.unit)}` : 'Sem expiração';
                const productScopeText = policy.allProducts ? 'Todos os produtos' : `${policy.productIds.length} produto(s)`;
                return (
                  <li key={policy.id} className="overflow-hidden rounded-xl border border-[#e8ebf1] bg-white">
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setExpandedId(expanded ? null : policy.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left hover:cursor-pointer"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef1fb] text-[#4156b8]">
                          <span className="material-symbols-outlined">{trigger?.icon ?? 'sell'}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[#142344]">{policy.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? 'bg-[#eff6d2] text-[#657000]' : expired ? 'bg-[#fff2df] text-[#966016]' : 'bg-[#f0f1f4] text-[#737d91]'}`}>
                              {expired ? 'Expirada' : active ? 'Ativa' : 'Pausada'}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-xs text-[#737d91]">{triggerDescription(policy)} · {productScopeText}</span>
                        </span>
                        <span className="hidden shrink-0 text-right sm:block">
                          <span className="block text-sm font-bold text-[#142344]">
                            {policy.discountType === 'percentage' ? `${policy.discountValue}%` : fmtBRL(policy.discountValue)}
                          </span>
                          <span className="text-[10px] text-[#8992a4]">{durationText}</span>
                        </span>
                        <span className={`material-symbols-outlined text-[#8992a4] transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button type="button" title={policy.active ? 'Pausar política' : 'Ativar política'} aria-label={policy.active ? `Pausar ${policy.name}` : `Ativar ${policy.name}`} onClick={() => {
                          if (!saveDiscountPolicy({ ...policy, active: !policy.active })) {
                            setMessage({ kind: 'error', text: STORAGE_FULL_MSG });
                            toast.error('Não foi possível atualizar a política', STORAGE_FULL_MSG);
                          } else {
                            toast.success(policy.active ? 'Política pausada' : 'Política ativada', policy.name);
                          }
                        }} className={`flex h-9 w-9 items-center justify-center rounded-lg hover:cursor-pointer ${policy.active ? 'text-[#657000] hover:bg-[#f4f9d0]' : 'text-[#737d91] hover:bg-[#f1f3f8]'}`}>
                          <span className="material-symbols-outlined text-[19px]">{policy.active ? 'pause_circle' : 'play_circle'}</span>
                        </button>
                        <button type="button" title="Editar política" aria-label={`Editar ${policy.name}`} onClick={() => setEditing({ ...policy })} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#737d91] hover:cursor-pointer hover:bg-[#f1f3f8]">
                          <span className="material-symbols-outlined text-[19px]">edit</span>
                        </button>
                        <button type="button" title="Excluir política" aria-label={`Excluir ${policy.name}`} onClick={() => setConfirmDelete(policy)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8992a4] hover:cursor-pointer hover:bg-red-50 hover:text-red-600">
                          <span className="material-symbols-outlined text-[19px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-[#edf0f5] bg-[#fafbfc] p-4">
                        <div className="mb-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-[#e8ebf1] bg-white p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8992a4]">Gatilho</p>
                            <p className="mt-1 text-xs font-semibold text-[#34415e]">{triggerDescription(policy)}</p>
                          </div>
                          <div className="rounded-lg border border-[#e8ebf1] bg-white p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8992a4]">Desconto e validade</p>
                            <p className="mt-1 text-xs font-semibold text-[#34415e]">
                              {policy.discountType === 'percentage' ? `${policy.discountValue}%` : fmtBRL(policy.discountValue)} · {durationText}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[#e8ebf1] bg-white p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8992a4]">Canais de recuperação</p>
                            <p className="mt-1 text-xs font-semibold text-[#34415e]">
                              {policy.trigger === 'abandoned_cart'
                                ? policy.channels.map((channel) => channel === 'email' ? 'E-mail' : 'WhatsApp').join(' e ') || 'Nenhum'
                                : 'Não aplicável'}
                            </p>
                          </div>
                        </div>
                        {policy.trigger === 'progressive_time' && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {policy.progressionSteps.map((step, index) => (
                              <span key={index} className="rounded-lg border border-[#dfe5f4] bg-white px-3 py-2 text-[11px] font-medium text-[#47536a]">
                                Após {step.after} {unitLabel(step.unit)}: {policy.discountType === 'percentage' ? `${step.discountValue}%` : fmtBRL(step.discountValue)}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-xs font-semibold text-[#34415e]">Produtos desta política</p>
                            <p className="mt-0.5 text-[11px] text-[#8992a4]">{policy.allProducts ? 'Abrange todo o catálogo.' : `${policy.productIds.length} selecionados`}</p>
                          </div>
                          <button type="button" onClick={() => {
                            const appliesToAll = !policy.allProducts;
                            if (!saveDiscountPolicy({ ...policy, allProducts: appliesToAll, productIds: [] })) {
                              setMessage({ kind: 'error', text: STORAGE_FULL_MSG });
                              toast.error('Não foi possível atualizar os produtos da política', STORAGE_FULL_MSG);
                            } else {
                              setMessage(null);
                              toast.success(appliesToAll ? 'Política aplicada ao catálogo' : 'Seleção de produtos ativada', policy.name);
                            }
                          }} className={`${ghostBtn} !py-1.5 !text-xs`}>
                            {policy.allProducts ? 'Escolher produtos' : 'Abranger todos'}
                          </button>
                          <div className="relative sm:w-64">
                            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#929bad]">search</span>
                            <input
                              className={`${inputCls} !py-1.5 !pl-8 !text-xs`}
                              aria-label={`Buscar produtos para a política ${policy.name}`}
                              placeholder="Buscar produto ou marca..."
                              value={productSearch[policy.id] ?? ''}
                              onChange={(event) => setProductSearch((current) => ({ ...current, [policy.id]: event.target.value }))}
                            />
                          </div>
                        </div>
                        {matches.length === 0 ? (
                          <p className="py-5 text-center text-xs text-[#8992a4]">Nenhum produto encontrado.</p>
                        ) : (
                          <ul className="max-h-64 divide-y divide-[#e8ebf1] overflow-y-auto rounded-lg border border-[#e8ebf1] bg-white">
                            {matches.map((product) => {
                              const assigned = policy.allProducts || policy.productIds.includes(product.id);
                              return (
                                <li key={product.id}>
                                  <label className={`flex items-center gap-3 px-3 py-2.5 transition hover:bg-[#f7f8fa] ${policy.allProducts ? 'cursor-pointer' : 'cursor-pointer'}`}>
                                    <input type="checkbox" checked={assigned} onChange={(event) => updateProducts(policy, product.id, event.target.checked)} className="h-4 w-4 accent-[#4156b8]" />
                                    <img src={product.image} alt="" className="h-9 w-11 rounded-md border border-[#eceef0] bg-white object-cover" />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-xs font-medium text-[#34415e]">{product.name}</span>
                                      <span className="block truncate text-[10px] text-[#8992a4]">{product.brand}</span>
                                    </span>
                                    <span className="shrink-0 text-[11px] font-semibold text-[#566176]">{fmtBRL(product.price)}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {!policy.allProducts && assignedProducts.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {assignedProductPreview.map((product) => (
                              <button key={product.id} type="button" onClick={() => updateProducts(policy, product.id, false)} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#eef1fb] px-2.5 py-1 text-[10px] font-medium text-[#4156b8] hover:cursor-pointer hover:bg-red-50 hover:text-red-600">
                                <span className="max-w-40 truncate">{product.name}</span>
                                <span className="material-symbols-outlined text-[13px]">close</span>
                              </button>
                            ))}
                            {assignedProducts.length > assignedProductPreview.length && (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#737d91]">
                                +{assignedProducts.length - assignedProductPreview.length} produtos
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              total={policies.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>
      {editing && <DiscountPolicyForm initial={editing} onClose={() => setEditing(null)} onSave={save} />}
      {confirmDelete && (
        <Modal title="Excluir política?" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-5">
            <div className="flex items-start gap-4 rounded-2xl border border-red-100 bg-red-50/70 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm ring-1 ring-red-100">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-bold text-[#8f2525]">Esta ação não pode ser desfeita</p>
                <p className="mt-1 text-xs leading-relaxed text-[#785b5b]">
                  A política será excluída permanentemente e deixará de aparecer na lista de descontos.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#e8ebf1] bg-[#fafbfc] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8992a4]">Política selecionada</p>
              <p className="mt-1 truncate text-sm font-semibold text-[#24324b]">{confirmDelete.name}</p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#edf0f5] pt-4 sm:flex-row sm:justify-end">
              <button type="button" className={`${ghostBtn} sm:min-w-28`} onClick={() => setConfirmDelete(null)}>
                Manter política
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#b42318] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#912018] focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 sm:min-w-36"
                onClick={remove}
              >
                <span className="material-symbols-outlined text-[17px]">delete</span>
                Excluir política
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DiscountPoliciesTab;
