import React, { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../components/CustomSelect';
import { CATALOG_PRODUCTS } from '../data/mockData';
import { EyewearProduct } from '../types';

/**
 * Taxas padrão do gateway Asaas (tabela pública).
 * Usadas para estimar o custo das faturas quando não há retorno real da API.
 */
export interface AsaasRates {
  pixFixed: number;
  pixPercent: number;
  boletoFixed: number;
  boletoPercent: number;
  creditFixed: number;
  creditOneShot: number;
  credit2to6: number;
  credit7to12: number;
  credit13to21: number;
  debitFixed: number;
  debitPercent: number;
  extraPerCharge: number;
  tedWithdraw: number;
}

export const DEFAULT_ASAAS_RATES: AsaasRates = {
  pixFixed: 1.99,
  pixPercent: 0,
  boletoFixed: 1.99,
  boletoPercent: 0,
  creditFixed: 0.49,
  creditOneShot: 2.99,
  credit2to6: 3.49,
  credit7to12: 3.99,
  credit13to21: 4.29,
  debitFixed: 0.35,
  debitPercent: 1.89,
  extraPerCharge: 0,
  tedWithdraw: 5,
};

type PaymentMethodKey = 'pix' | 'boleto' | 'credit1' | 'credit2_6' | 'credit7_12' | 'credit13_21' | 'debit';

interface PaymentOption {
  key: PaymentMethodKey;
  label: string;
  short: string;
  installments: number;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { key: 'pix',         label: 'Pix',              short: 'Pix',          installments: 1 },
  { key: 'boleto',      label: 'Boleto',           short: 'Boleto',       installments: 1 },
  { key: 'debit',       label: 'Cartão de Débito', short: 'Débito',       installments: 1 },
  { key: 'credit1',     label: 'Crédito à vista',  short: 'Crédito 1x',   installments: 1 },
  { key: 'credit2_6',   label: 'Crédito 2 a 6x',   short: 'Crédito 2-6x', installments: 3 },
  { key: 'credit7_12',  label: 'Crédito 7 a 12x',  short: 'Crédito 7-12x',installments: 9 },
  { key: 'credit13_21', label: 'Crédito 13 a 21x', short: 'Crédito 13-21x',installments: 15 },
];

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const pct = (value: number) => `${value.toFixed(2).replace('.', ',')}%`;

function feeFor(method: PaymentMethodKey, amount: number, rates: AsaasRates): { fixed: number; percent: number; total: number } {
  switch (method) {
    case 'pix':        return combine(rates.pixFixed,      rates.pixPercent,      amount);
    case 'boleto':     return combine(rates.boletoFixed,   rates.boletoPercent,   amount);
    case 'debit':      return combine(rates.debitFixed,    rates.debitPercent,    amount);
    case 'credit1':    return combine(rates.creditFixed,   rates.creditOneShot,   amount);
    case 'credit2_6':  return combine(rates.creditFixed,   rates.credit2to6,      amount);
    case 'credit7_12': return combine(rates.creditFixed,   rates.credit7to12,     amount);
    case 'credit13_21':return combine(rates.creditFixed,   rates.credit13to21,    amount);
  }
}

function combine(fixed: number, percent: number, amount: number) {
  const percentValue = (amount * percent) / 100;
  return { fixed, percent, total: fixed + percentValue };
}

/* ─── Rate field (inline edit) ─── */
interface RateFieldProps {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  onChange: (v: number) => void;
}

function RateField({ label, value, suffix, hint, onChange }: RateFieldProps) {
  const [draft, setDraft] = useState<string>(value.toFixed(2).replace('.', ','));

  useEffect(() => {
    setDraft(value.toFixed(2).replace('.', ','));
  }, [value]);

  const commit = () => {
    const normalized = draft.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    onChange(Number.isFinite(num) ? num : 0);
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-[#061748]">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="w-full rounded-lg border border-[#dfe3ea] bg-white px-3 py-2.5 pr-10 text-sm text-[#191c1e] outline-none transition focus:border-[#061748] focus:ring-2 focus:ring-[#061748]/10"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] leading-tight text-[#6b7280]">{hint}</span>}
    </label>
  );
}

/* ─── Multi-client row ─── */
interface ClientRow {
  id: string;
  label: string;
  amountStr: string;
  method: PaymentMethodKey;
  installments: number;
}

let _rowCounter = 0;
function makeRow(label: string, amountStr: string, method: PaymentMethodKey = 'pix', installments = 1): ClientRow {
  return { id: `row-${++_rowCounter}`, label, amountStr, method, installments };
}

function parseAmount(str: string): number {
  const n = str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */
export const TaxasAsaasPage: React.FC = () => {
  const [rates, setRates] = useState<AsaasRates>({ ...DEFAULT_ASAAS_RATES });

  // Simulador — single mode
  const [mode, setMode] = useState<'value' | 'product' | 'multi'>('value');
  const [customAmount, setCustomAmount] = useState<string>('890,00');
  const [selectedProductId, setSelectedProductId] = useState<string>(CATALOG_PRODUCTS[0]?.id ?? '');
  const [quantity, setQuantity] = useState<number>(1);
  const [method, setMethod] = useState<PaymentMethodKey>('pix');
  const [installments, setInstallments] = useState<number>(1);

  // Simulador — multi-client mode
  const [rows, setRows] = useState<ClientRow[]>([
    makeRow('Cliente 1', '1.500,00', 'pix'),
    makeRow('Cliente 2', '2.000,00', 'credit1', 1),
    makeRow('Cliente 3', '1.500,00', 'boleto'),
  ]);

  const selectedProduct = useMemo<EyewearProduct | undefined>(
    () => CATALOG_PRODUCTS.find((p) => p.id === selectedProductId),
    [selectedProductId]
  );

  const baseAmount = useMemo<number>(() => {
    if (mode === 'product') {
      return (selectedProduct?.price ?? 0) * Math.max(1, quantity);
    }
    if (mode === 'multi') {
      return rows.reduce((sum, r) => sum + parseAmount(r.amountStr), 0);
    }
    return parseAmount(customAmount);
  }, [mode, customAmount, selectedProduct, quantity, rows]);

  const effectiveMethod: PaymentMethodKey = useMemo(() => {
    if (method.startsWith('credit')) {
      if (installments <= 1) return 'credit1';
      if (installments <= 6) return 'credit2_6';
      if (installments <= 12) return 'credit7_12';
      return 'credit13_21';
    }
    return method;
  }, [method, installments]);

  // Single-mode fee
  const fee = useMemo(() => feeFor(effectiveMethod, baseAmount, rates), [effectiveMethod, baseAmount, rates]);
  const feeWithExtra = fee.total + rates.extraPerCharge;
  const netReceived = Math.max(0, baseAmount - feeWithExtra);
  const effectiveRatePct = baseAmount > 0 ? (feeWithExtra / baseAmount) * 100 : 0;
  const installmentValue = installments > 1 && baseAmount > 0 ? baseAmount / installments : baseAmount;

  // Multi-client aggregated results
  const multiResults = useMemo(() => {
    return rows.map((r) => {
      const amt = parseAmount(r.amountStr);
      const effMethod: PaymentMethodKey = r.method.startsWith('credit')
        ? (r.installments <= 1 ? 'credit1' : r.installments <= 6 ? 'credit2_6' : r.installments <= 12 ? 'credit7_12' : 'credit13_21')
        : r.method;
      const f = feeFor(effMethod, amt, rates);
      const totalFee = f.total + rates.extraPerCharge;
      return {
        ...r,
        amount: amt,
        effectiveMethod: effMethod,
        feeTotal: totalFee,
        net: Math.max(0, amt - totalFee),
        ratePct: amt > 0 ? (totalFee / amt) * 100 : 0,
      };
    });
  }, [rows, rates]);

  const multiTotalAmount = multiResults.reduce((s, r) => s + r.amount, 0);
  const multiTotalFee = multiResults.reduce((s, r) => s + r.feeTotal, 0);
  const multiTotalNet = multiResults.reduce((s, r) => s + r.net, 0);
  const multiEffectivePct = multiTotalAmount > 0 ? (multiTotalFee / multiTotalAmount) * 100 : 0;

  // Comparison (single mode)
  const comparison = useMemo(() => {
    return PAYMENT_OPTIONS.map((opt) => {
      const f = feeFor(opt.key, baseAmount, rates);
      const total = f.total + rates.extraPerCharge;
      return {
        ...opt,
        feeTotal: total,
        net: Math.max(0, baseAmount - total),
        ratePct: baseAmount > 0 ? (total / baseAmount) * 100 : 0,
      };
    });
  }, [baseAmount, rates]);

  const updateRate = (key: keyof AsaasRates) => (v: number) =>
    setRates((prev) => ({ ...prev, [key]: v }));

  const handleReset = () => {
    setRates({ ...DEFAULT_ASAAS_RATES });
  };

  const maxInstallments =
    method === 'credit2_6' ? 6 :
    method === 'credit7_12' ? 12 :
    method === 'credit13_21' ? 21 : 1;

  // Multi-client helpers
  const addRow = () => {
    setRows((prev) => [...prev, makeRow(`Cliente ${prev.length + 1}`, '0,00')]);
  };
  const removeRow = (id: string) => {
    setRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
  };
  const updateRow = (id: string, patch: Partial<ClientRow>) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  const isMulti = mode === 'multi';

  return (
    <div className="w-full bg-[#f7f9fb] min-h-screen pb-24">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#061748] via-[#0a2160] to-[#061748] text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-12 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dbee2c]/15 border border-[#dbee2c]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#dbee2c]">
            <span className="material-symbols-outlined text-[14px]">payments</span>
            Gateway Asaas
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Taxas de Pagamento &amp; Simulador de Vendas
          </h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base text-white/75 leading-relaxed">
            Consulte a tabela de tarifas do Asaas, ajuste os valores conforme seu plano contratado e simule
            quanto sua loja realmente recebe em cada método de pagamento — por valor livre, produto do catálogo
            ou múltiplos clientes com valores e métodos diferentes.
          </p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            <StatTile label="Pix" value={`${pct(rates.pixPercent)} + ${brl(rates.pixFixed)}`} />
            <StatTile label="Boleto" value={`${pct(rates.boletoPercent)} + ${brl(rates.boletoFixed)}`} />
            <StatTile label="Crédito 1x" value={`${pct(rates.creditOneShot)} + ${brl(rates.creditFixed)}`} />
            <StatTile label="Débito" value={`${pct(rates.debitPercent)} + ${brl(rates.debitFixed)}`} />
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-12 -mt-10 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── TABELA DE TAXAS ── */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-[#e6e9ef] shadow-sm p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#061748]">Tabela de taxas do gateway</h2>
              <p className="mt-1 text-sm text-[#45464f] max-w-xl">
                Usada só para <strong>estimar</strong> o custo de faturas sem retorno do Asaas e alimentar o
                simulador. Fatura já paga usa sempre a taxa real. Padrões = tabela pública do Asaas.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-[#061748] hover:text-[#dbee2c] hover:bg-[#061748] px-3 py-1.5 rounded-md transition"
            >
              Restaurar padrão
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <RateField label="Pix — fixo (R$)" value={rates.pixFixed} hint="Por cobrança Pix recebida." onChange={updateRate('pixFixed')} />
            <RateField label="Pix — percentual (%)" value={rates.pixPercent} suffix="%" onChange={updateRate('pixPercent')} />
            <RateField label="Boleto — fixo (R$)" value={rates.boletoFixed} hint="Por boleto pago." onChange={updateRate('boletoFixed')} />
            <RateField label="Boleto — percentual (%)" value={rates.boletoPercent} suffix="%" onChange={updateRate('boletoPercent')} />
            <RateField label="Crédito — fixo (R$)" value={rates.creditFixed} onChange={updateRate('creditFixed')} />
            <RateField label="Crédito — à vista (%)" value={rates.creditOneShot} suffix="%" onChange={updateRate('creditOneShot')} />
            <RateField label="Crédito — 2 a 6x (%)" value={rates.credit2to6} suffix="%" onChange={updateRate('credit2to6')} />
            <RateField label="Crédito — 7 a 12x (%)" value={rates.credit7to12} suffix="%" onChange={updateRate('credit7to12')} />
            <RateField label="Crédito — 13 a 21x (%)" value={rates.credit13to21} suffix="%" onChange={updateRate('credit13to21')} />
            <RateField label="Débito — fixo (R$)" value={rates.debitFixed} onChange={updateRate('debitFixed')} />
            <RateField label="Débito — percentual (%)" value={rates.debitPercent} suffix="%" onChange={updateRate('debitPercent')} />
            <RateField label="Extra por cobrança (R$)" value={rates.extraPerCharge} hint="Notificações e afins somados a qualquer método." onChange={updateRate('extraPerCharge')} />
            <RateField label="TED / saque (R$)" value={rates.tedWithdraw} hint="Informativo — não entra no custo da fatura." onChange={updateRate('tedWithdraw')} />
          </div>
        </section>

        {/* ── SIMULADOR ── */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-[#e6e9ef] shadow-sm p-6 sm:p-8 self-start lg:sticky lg:top-28">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#dbee2c] text-xl">calculate</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#061748]">Simulador de vendas</h2>
          </div>
          <p className="mt-1 text-sm text-[#45464f]">
            Escolha um valor, um produto do catálogo ou simule múltiplos clientes e veja quanto você recebe líquido.
          </p>

          {/* Toggle modo — 3 opções */}
          <div className="mt-5 inline-flex rounded-lg bg-[#f2f4f6] p-1 text-xs font-semibold">
            {([
              ['value', 'Valor livre'],
              ['product', 'Produto'],
              ['multi', 'Múltiplos clientes'],
            ] as const).map(([key, lbl]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`px-3 py-1.5 rounded-md transition ${mode === key ? 'bg-white text-[#061748] shadow-sm' : 'text-[#6b7280]'}`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* ── MODO: VALOR LIVRE ── */}
          {mode === 'value' && (
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-[#061748]">Valor da venda (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#dfe3ea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#061748] focus:ring-2 focus:ring-[#061748]/10"
              />
            </label>
          )}

          {/* ── MODO: PRODUTO ── */}
          {mode === 'product' && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#061748]">Produto</span>
                <CustomSelect
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  className="mt-1 w-full rounded-lg border border-[#dfe3ea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#061748] focus:ring-2 focus:ring-[#061748]/10"
                  options={CATALOG_PRODUCTS.map((product) => ({
                    value: product.id,
                    label: `${product.name} — ${brl(product.price)}`,
                  }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#061748]">Quantidade</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="mt-1 w-full rounded-lg border border-[#dfe3ea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#061748] focus:ring-2 focus:ring-[#061748]/10"
                />
              </label>
              {selectedProduct && (
                <div className="flex items-center gap-3 rounded-lg border border-[#eef0f4] bg-[#fafbfc] p-3">
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-12 h-12 object-cover rounded-md" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#061748] truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-[#6b7280] truncate">{selectedProduct.colorName} • {selectedProduct.calibre}</p>
                  </div>
                  <span className="ml-auto text-sm font-bold text-[#061748]">{brl(selectedProduct.price * quantity)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── MODO: MÚLTIPLOS CLIENTES ── */}
          {mode === 'multi' && (
            <div className="mt-4 space-y-3">
              <p className="text-[11px] text-[#6b7280] leading-relaxed">
                Cada linha é uma cobrança separada — o Asaas aplica a taxa <strong>individualmente</strong> em cada uma.
                Isso mostra o impacto real quando vários clientes pagam valores e métodos diferentes.
              </p>
              {rows.map((row, idx) => {
                const amt = parseAmount(row.amountStr);
                const effM: PaymentMethodKey = row.method.startsWith('credit')
                  ? (row.installments <= 1 ? 'credit1' : row.installments <= 6 ? 'credit2_6' : row.installments <= 12 ? 'credit7_12' : 'credit13_21')
                  : row.method;
                const f = feeFor(effM, amt, rates);
                const rowFee = f.total + rates.extraPerCharge;
                const rowNet = Math.max(0, amt - rowFee);
                return (
                  <div key={row.id} className="rounded-xl border border-[#eef0f4] bg-[#fafbfc] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => updateRow(row.id, { label: e.target.value })}
                        className="text-xs font-bold text-[#061748] bg-transparent border-none outline-none w-32"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#6b7280]">líquido</span>
                        <span className="text-xs font-bold text-[#061748]">{brl(rowNet)}</span>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="w-5 h-5 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition text-[14px] leading-none"
                            aria-label="Remover"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-semibold text-[#6b7280]">Valor (R$)</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.amountStr}
                          onChange={(e) => updateRow(row.id, { amountStr: e.target.value })}
                          className="mt-0.5 w-full rounded-md border border-[#dfe3ea] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#061748]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold text-[#6b7280]">Método</span>
                        <CustomSelect
                          value={row.method}
                          onChange={(m) => {
                            const opt = PAYMENT_OPTIONS.find(o => o.key === m);
                            updateRow(row.id, { method: m, installments: opt?.installments ?? 1 });
                          }}
                          className="mt-0.5 !min-h-0 w-full rounded-md border border-[#dfe3ea] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#061748]"
                          options={PAYMENT_OPTIONS.map((option) => ({ value: option.key, label: option.short }))}
                        />
                      </label>
                    </div>
                    {row.method.startsWith('credit') && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-[#6b7280] whitespace-nowrap">Parcelas</span>
                        <input
                          type="range"
                          min={1}
                          max={row.method === 'credit2_6' ? 6 : row.method === 'credit7_12' ? 12 : row.method === 'credit13_21' ? 21 : 1}
                          value={row.installments}
                          onChange={(e) => updateRow(row.id, { installments: parseInt(e.target.value, 10) })}
                          className="flex-1 accent-[#061748] h-1"
                        />
                        <span className="text-[10px] font-bold text-[#061748] w-8 text-right">{row.installments}x</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-[#6b7280] border-t border-[#eef0f4] pt-1.5">
                      <span>taxa {pct(amt > 0 ? (rowFee / amt) * 100 : 0)}</span>
                      <span>− {brl(rowFee)}</span>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addRow}
                className="w-full rounded-lg border border-dashed border-[#dfe3ea] py-2 text-xs font-semibold text-[#061748] hover:border-[#061748] hover:bg-[#f4f6fb] transition flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Adicionar cliente
              </button>
            </div>
          )}

          {/* ── Método de pagamento (single modes only) ── */}
          {!isMulti && (
            <>
              <div className="mt-5">
                <span className="text-xs font-semibold text-[#061748]">Método de pagamento</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setMethod(opt.key); setInstallments(opt.installments); }}
                      className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                        method === opt.key
                          ? 'border-[#061748] bg-[#061748] text-white'
                          : 'border-[#dfe3ea] bg-white text-[#061748] hover:border-[#061748]/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {method.startsWith('credit') && (
                <label className="mt-4 block">
                  <span className="text-xs font-semibold text-[#061748]">
                    Número de parcelas (máx. {maxInstallments})
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={maxInstallments}
                    value={Math.min(installments, maxInstallments)}
                    onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                    className="mt-2 w-full accent-[#061748]"
                  />
                  <div className="flex justify-between text-[11px] text-[#6b7280] mt-1">
                    <span>1x</span>
                    <span className="font-semibold text-[#061748]">{installments}x de {brl(installmentValue)}</span>
                    <span>{maxInstallments}x</span>
                  </div>
                </label>
              )}
            </>
          )}

          {/* ── RESULTADO ── */}
          {isMulti ? (
            <div className="mt-6 rounded-xl bg-gradient-to-br from-[#061748] to-[#0a2160] text-white p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-white/70">Total vendido ({rows.length} cobranças)</span>
                <span className="text-lg font-bold">{brl(multiTotalAmount)}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-white/85 text-sm">
                <span>Total de taxas Asaas</span>
                <span>− {brl(multiTotalFee)}</span>
              </div>
              <div className="my-3 h-px bg-white/15" />
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-[#dbee2c]">Você recebe</span>
                <span className="text-2xl font-extrabold text-[#dbee2c]">{brl(multiTotalNet)}</span>
              </div>
              <div className="mt-1 text-right text-[11px] text-white/70">
                taxa efetiva {pct(multiEffectivePct)} • {rows.length} cobrança{rows.length > 1 ? 's' : ''} individual{rows.length > 1 ? 'is' : ''}
              </div>

              {/* Breakdown per client */}
              <div className="mt-4 space-y-1.5">
                {multiResults.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-[11px] bg-white/5 rounded-md px-2.5 py-1.5">
                    <span className="text-white/80 truncate mr-2">{r.label}</span>
                    <span className="text-white/60">{brl(r.amount)}</span>
                    <span className="text-red-300/80 mx-1.5">−{brl(r.feeTotal)}</span>
                    <span className="font-bold text-[#dbee2c]">{brl(r.net)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-gradient-to-br from-[#061748] to-[#0a2160] text-white p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-white/70">Valor da venda</span>
                <span className="text-lg font-bold">{brl(baseAmount)}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-white/85 text-sm">
                <span>Taxa Asaas ({pct(fee.percent)} + {brl(fee.fixed)})</span>
                <span>− {brl(fee.total)}</span>
              </div>
              {rates.extraPerCharge > 0 && (
                <div className="flex items-baseline justify-between text-white/85 text-sm">
                  <span>Extra por cobrança</span>
                  <span>− {brl(rates.extraPerCharge)}</span>
                </div>
              )}
              <div className="my-3 h-px bg-white/15" />
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-[#dbee2c]">Você recebe</span>
                <span className="text-2xl font-extrabold text-[#dbee2c]">{brl(netReceived)}</span>
              </div>
              <div className="mt-1 text-right text-[11px] text-white/70">
                taxa efetiva {pct(effectiveRatePct)} • método {PAYMENT_OPTIONS.find(o => o.key === effectiveMethod)?.short}
              </div>
            </div>
          )}

          {/* Comparativo (single modes only) */}
          {!isMulti && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#061748]">Comparativo entre métodos</h3>
              <div className="mt-3 space-y-2">
                {comparison
                  .slice()
                  .sort((a, b) => b.net - a.net)
                  .map((row) => {
                    const widthPct = baseAmount > 0 ? Math.max(4, (row.net / baseAmount) * 100) : 0;
                    const active = row.key === effectiveMethod;
                    return (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => { setMethod(row.key); setInstallments(row.installments); }}
                        className={`w-full text-left rounded-lg border p-3 transition ${
                          active ? 'border-[#061748] bg-[#f4f6fb]' : 'border-[#eef0f4] bg-white hover:border-[#061748]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#061748]">{row.label}</span>
                          <span className="text-[#6b7280]">taxa {pct(row.ratePct)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-[#eef0f4] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#061748] to-[#dbee2c]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-[#6b7280]">líquido</span>
                          <span className="font-bold text-[#061748]">{brl(row.net)}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <p className="mt-5 text-[11px] leading-relaxed text-[#6b7280]">
            Os valores são estimativas com base na tabela configurada acima. Para valores oficiais, consulte o
            extrato da sua conta Asaas ou a documentação em{' '}
            <a href="https://docs.asaas.com" target="_blank" rel="noreferrer" className="underline text-[#061748]">
              docs.asaas.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-sm font-bold text-white truncate">{value}</p>
    </div>
  );
}

export default TaxasAsaasPage;