import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../components/ToastContext';
import { StoreSettings } from '../../../lib/storeSettings';
import { Card, Field, ghostBtn, inputCls, primaryBtn } from '../ui';
import { ConfirmDialog, Toggle } from '../controls';

interface SectionProps {
  settings: StoreSettings;
  saving: boolean;
  onSave: (next: StoreSettings, message?: string) => Promise<boolean>;
}

const SaveBar: React.FC<{ dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }> = ({ dirty, saving, onSave, onReset }) => (
  <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[#edf0f5] pt-4">
    {dirty && <span className="mr-auto text-xs font-semibold text-[#b86627]">Alterações não salvas</span>}
    <button type="button" className={ghostBtn} disabled={!dirty || saving} onClick={onReset}>Descartar</button>
    <button type="button" className={primaryBtn} disabled={!dirty || saving} onClick={onSave}>
      {saving ? 'Salvando...' : 'Salvar alterações'}
    </button>
  </div>
);

const useDraft = <T,>(source: T) => {
  const [draft, setDraft] = useState(source);
  useEffect(() => setDraft(source), [source]);
  return { draft, setDraft, dirty: JSON.stringify(draft) !== JSON.stringify(source) };
};

export const StoreInfoSection: React.FC<SectionProps> = ({ settings, saving, onSave }) => {
  const toast = useToast();
  const { draft, setDraft, dirty } = useDraft(settings.store);
  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [key]: event.target.value });

  const save = () => {
    if (!draft.name.trim()) {
      toast.error('Informe o nome da loja', 'O nome é obrigatório.');
      return;
    }
    void onSave({ ...settings, store: draft }, 'Dados da loja salvos');
  };

  return (
    <Card title="Dados da loja" subtitle="Informações institucionais e de contato usadas pela loja.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da loja" required><input className={inputCls} value={draft.name} onChange={set('name')} maxLength={80} /></Field>
        <Field label="Razão social"><input className={inputCls} value={draft.legalName} onChange={set('legalName')} maxLength={120} /></Field>
        <Field label="CNPJ"><input className={inputCls} value={draft.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" maxLength={20} /></Field>
        <Field label="E-mail de contato"><input type="email" className={inputCls} value={draft.email} onChange={set('email')} maxLength={160} /></Field>
        <Field label="Telefone"><input className={inputCls} value={draft.phone} onChange={set('phone')} placeholder="(00) 0000-0000" maxLength={30} /></Field>
        <Field label="WhatsApp"><input className={inputCls} value={draft.whatsapp} onChange={set('whatsapp')} placeholder="(00) 00000-0000" maxLength={30} /></Field>
        <Field label="Instagram"><input className={inputCls} value={draft.instagram} onChange={set('instagram')} placeholder="@oticasbrasil" maxLength={80} /></Field>
        <Field label="Endereço"><input className={inputCls} value={draft.address} onChange={set('address')} maxLength={240} /></Field>
        <Field label="Descrição da loja" hint="Resumo curto usado em buscadores e compartilhamentos." className="sm:col-span-2">
          <textarea className={`${inputCls} min-h-20 resize-none`} value={draft.description} onChange={set('description')} maxLength={300} />
        </Field>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onReset={() => setDraft(settings.store)} />
    </Card>
  );
};

export const CheckoutSection: React.FC<SectionProps> = ({ settings, saving, onSave }) => {
  const toast = useToast();
  const source = useMemo(() => ({ payment: settings.payment, delivery: settings.delivery }), [settings.payment, settings.delivery]);
  const { draft, setDraft, dirty } = useDraft(source);
  const { payment, delivery } = draft;

  const save = () => {
    if (!payment.pix.enabled && !payment.card.enabled && !payment.boleto.enabled) {
      toast.error('Nenhuma forma de pagamento ativa', 'Mantenha pelo menos uma forma de pagamento.');
      return;
    }
    if (!delivery.homeEnabled && !delivery.pickupEnabled) {
      toast.error('Nenhuma forma de entrega ativa', 'Mantenha pelo menos uma forma de entrega.');
      return;
    }
    void onSave({ ...settings, payment, delivery }, 'Checkout atualizado');
  };

  return (
    <div className="space-y-5">
      <Card title="Formas de pagamento" subtitle="Escolha o que o cliente pode usar no checkout.">
        <div className="space-y-3">
          <Toggle
            label="Pix"
            description="Pagamento instantâneo, com desconto opcional."
            checked={payment.pix.enabled}
            onChange={(enabled) => setDraft({ ...draft, payment: { ...payment, pix: { ...payment.pix, enabled } } })}
          />
          {payment.pix.enabled && (
            <div className="max-w-xs pl-1">
              <Field label="Desconto no Pix (%)" hint="Use 0 para não conceder desconto.">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  className={inputCls}
                  value={payment.pix.discountPercent}
                  onChange={(e) => setDraft({ ...draft, payment: { ...payment, pix: { ...payment.pix, discountPercent: Number(e.target.value) } } })}
                />
              </Field>
            </div>
          )}
          <Toggle
            label="Cartão de crédito"
            description="Pagamento parcelado."
            checked={payment.card.enabled}
            onChange={(enabled) => setDraft({ ...draft, payment: { ...payment, card: { ...payment.card, enabled } } })}
          />
          {payment.card.enabled && (
            <div className="max-w-xs pl-1">
              <Field label="Máximo de parcelas" hint="De 1 a 12 parcelas.">
                <input
                  type="number"
                  min={1}
                  max={12}
                  className={inputCls}
                  value={payment.card.maxInstallments}
                  onChange={(e) => setDraft({ ...draft, payment: { ...payment, card: { ...payment.card, maxInstallments: Number(e.target.value) } } })}
                />
              </Field>
            </div>
          )}
          <Toggle
            label="Boleto"
            description="Pagamento por boleto bancário."
            checked={payment.boleto.enabled}
            onChange={(enabled) => setDraft({ ...draft, payment: { ...payment, boleto: { enabled } } })}
          />
        </div>
      </Card>
      <Card title="Formas de entrega" subtitle="Defina como o cliente recebe o pedido.">
        <div className="space-y-3">
          <Toggle
            label="Entrega pelos Correios"
            description="Envio para o endereço do cliente."
            checked={delivery.homeEnabled}
            onChange={(homeEnabled) => setDraft({ ...draft, delivery: { ...delivery, homeEnabled } })}
          />
          <Toggle
            label="Retirada na loja"
            description="O cliente retira o pedido em uma unidade."
            checked={delivery.pickupEnabled}
            onChange={(pickupEnabled) => setDraft({ ...draft, delivery: { ...delivery, pickupEnabled } })}
          />
        </div>
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onReset={() => setDraft(source)}
        />
      </Card>
    </div>
  );
};

export const MaintenanceSection: React.FC<SectionProps> = ({ settings, saving, onSave }) => {
  const toast = useToast();
  const [message, setMessage] = useState(settings.maintenance.message);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setMessage(settings.maintenance.message), [settings.maintenance.message]);
  const { enabled } = settings.maintenance;

  const apply = async (nextEnabled: boolean) => {
    if (!message.trim()) {
      toast.error('Informe a mensagem de manutenção', 'Ela é exibida aos visitantes.');
      return;
    }
    const ok = await onSave(
      { ...settings, maintenance: { enabled: nextEnabled, message: message.trim() } },
      nextEnabled ? 'Modo manutenção ativado' : 'Loja reaberta',
    );
    if (ok) setConfirming(false);
  };

  return (
    <Card title="Modo manutenção" subtitle="Tire a loja do ar temporariamente. O painel continua acessível.">
      <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${enabled ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        <span className="material-symbols-outlined text-[22px]">{enabled ? 'construction' : 'storefront'}</span>
        <div>
          <p className="text-sm font-bold">{enabled ? 'Loja em manutenção' : 'Loja no ar'}</p>
          <p className="text-xs opacity-80">{enabled ? 'Visitantes veem a mensagem abaixo e não conseguem comprar.' : 'Clientes podem navegar e comprar normalmente.'}</p>
        </div>
      </div>
      <Field label="Mensagem para os visitantes">
        <textarea className={`${inputCls} min-h-20 resize-none`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={240} />
      </Field>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {enabled && (
          <button type="button" className={ghostBtn} disabled={saving || message.trim() === settings.maintenance.message} onClick={() => void apply(true)}>
            Salvar mensagem
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          className={enabled ? primaryBtn : 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#b86627] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#9a5420] hover:cursor-pointer disabled:opacity-50'}
          onClick={() => (enabled ? void apply(false) : setConfirming(true))}
        >
          {enabled ? 'Reabrir a loja' : 'Ativar manutenção'}
        </button>
      </div>
      {confirming && (
        <ConfirmDialog
          title="Ativar manutenção?"
          heading="A loja ficará indisponível"
          message="Visitantes não poderão navegar nem finalizar compras até você reabrir a loja."
          subjectLabel="Mensagem exibida"
          subject={message.trim() || 'Sem mensagem'}
          confirmLabel="Ativar manutenção"
          cancelLabel="Manter loja no ar"
          icon="construction"
          danger={false}
          busy={saving}
          onConfirm={() => void apply(true)}
          onClose={() => setConfirming(false)}
        />
      )}
    </Card>
  );
};
