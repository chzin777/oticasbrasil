import React from 'react';
import { AVAILABLE_COUPONS, CATALOG_PRODUCTS } from '../../data/mockData';
import { useSiteData } from '../../lib/siteStore';
import { fmtBRL } from './ui';

const CATEGORY_META: { value: string; label: string; color: string }[] = [
  { value: 'armacoes', label: 'Armações', color: '#061748' },
  { value: 'oculos-de-sol', label: 'Óculos de Sol', color: '#4156b8' },
  { value: 'lentes-de-grau', label: 'Lentes de Grau', color: '#C4D600' },
  { value: 'rayban-meta', label: 'Ray-Ban Meta', color: '#9aa5d6' },
];

const Panel: React.FC<{ title: string; subtitle?: string; className?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  className = '',
  children,
}) => (
  <section className={`bg-white rounded-3xl border border-[#eceef0] shadow-sm p-6 ${className}`}>
    <h3 className="text-base font-bold text-[#061748]">{title}</h3>
    {subtitle && <p className="text-xs text-[#767680] mt-0.5">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const Kpi: React.FC<{ icon: string; label: string; value: string; sub: string; tone?: 'navy' | 'lime' }> = ({
  icon,
  label,
  value,
  sub,
  tone = 'navy',
}) => (
  <div className="bg-white rounded-3xl border border-[#eceef0] shadow-sm p-5">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#767680]">{label}</p>
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          tone === 'lime' ? 'bg-[#f4f9d0] text-[#061748]' : 'bg-[#eef1fb] text-[#4156b8]'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
    </div>
    <p className="text-3xl font-black text-[#061748] mt-3 tracking-tight">{value}</p>
    <p className="text-xs text-[#767680] mt-1">{sub}</p>
  </div>
);

const Donut: React.FC<{ slices: { label: string; value: number; color: string }[] }> = ({ slices }) => {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 140 140" className="w-40 h-40 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#eceef0" strokeWidth="18" />
        {slices.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
        <g className="rotate-90 origin-center">
          <text x="70" y="68" textAnchor="middle" className="fill-[#061748]" style={{ fontSize: 26, fontWeight: 900 }}>
            {total}
          </text>
          <text x="70" y="86" textAnchor="middle" className="fill-[#767680]" style={{ fontSize: 9, fontWeight: 700 }}>
            PRODUTOS
          </text>
        </g>
      </svg>
      <ul className="w-full space-y-2.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[#45464f] font-semibold">
              <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-bold text-[#061748]">
              {s.value} <span className="text-[#767680] font-semibold text-xs">({Math.round((s.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const HBars: React.FC<{ rows: { label: string; value: number; display: string }[]; color?: string }> = ({ rows, color = '#4156b8' }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#45464f] truncate pr-2">{r.label}</span>
            <span className="font-bold text-[#061748]">{r.display}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#eceef0] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const VBars: React.FC<{ rows: { label: string; value: number }[] }> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex items-end gap-3 h-48 border-b border-[#eceef0]">
      {rows.map((r) => (
        <div key={r.label} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5">
          <span className="text-xs font-bold text-[#061748]">{r.value}</span>
          <div
            className="w-full max-w-[56px] rounded-t-lg bg-[#4156b8] hover:bg-[#061748] transition-colors"
            style={{ height: `${Math.max((r.value / max) * 82, r.value ? 4 : 0)}%` }}
          />
        </div>
      ))}
    </div>
  );
};

export const DashboardTab: React.FC = () => {
  useSiteData();
  const products = CATALOG_PRODUCTS;
  const n = products.length || 1;

  const totalValue = products.reduce((s, p) => s + p.price, 0);
  const avgPrice = totalValue / n;
  const discounted = products.filter((p) => p.originalPrice && p.originalPrice > p.price);
  const discountPct = (p: (typeof products)[number]) => ((p.originalPrice! - p.price) / p.originalPrice!) * 100;
  const avgDiscount = discounted.length ? discounted.reduce((s, p) => s + discountPct(p), 0) / discounted.length : 0;
  const rated = products.filter((p) => p.rating > 0);
  const avgRating = rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : 0;
  const totalReviews = products.reduce((s, p) => s + (p.reviewCount || 0), 0);
  const coupons = Object.entries(AVAILABLE_COUPONS);
  const activeCoupons = coupons.filter(([, c]) => c.active !== false);
  const brands = new Set(products.map((p) => p.brand));
  const cheapest = products.reduce((a, b) => (b.price < a.price ? b : a), products[0]);
  const priciest = products.reduce((a, b) => (b.price > a.price ? b : a), products[0]);

  const slices = CATEGORY_META.map((c) => ({
    label: c.label,
    color: c.color,
    value: products.filter((p) => p.category === c.value).length,
  })).filter((s) => s.value > 0);

  const buckets = [
    { label: 'até 200', min: 0, max: 200 },
    { label: '200–400', min: 200, max: 400 },
    { label: '400–600', min: 400, max: 600 },
    { label: '600–1000', min: 600, max: 1000 },
    { label: '1000+', min: 1000, max: Infinity },
  ].map((b) => ({ label: `R$ ${b.label}`, value: products.filter((p) => p.price >= b.min && p.price < b.max).length }));

  const brandRows = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.brand]: (acc[p.brand] || 0) + 1 }), {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, display: `${value} produto${value > 1 ? 's' : ''}` }));

  const avgByCategory = CATEGORY_META.map((c) => {
    const list = products.filter((p) => p.category === c.value);
    const avg = list.length ? list.reduce((s, p) => s + p.price, 0) / list.length : 0;
    return { label: c.label, value: avg, display: fmtBRL(avg) };
  }).filter((r) => r.value > 0);

  const topDiscounts = [...discounted].sort((a, b) => discountPct(b) - discountPct(a)).slice(0, 5);
  const topRated = [...rated].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount).slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon="inventory_2" label="Produtos" value={String(products.length)} sub={`${brands.size} marcas no catálogo`} />
        <Kpi icon="payments" label="Preço médio" value={fmtBRL(avgPrice)} sub={`Catálogo somado: ${fmtBRL(totalValue)}`} />
        <Kpi
          icon="sell"
          label="Em promoção"
          value={`${discounted.length}`}
          sub={`${Math.round((discounted.length / n) * 100)}% do catálogo • média ${avgDiscount.toFixed(0)}% off`}
          tone="lime"
        />
        <Kpi icon="star" label="Avaliação média" value={avgRating.toFixed(1)} sub={`${totalReviews.toLocaleString('pt-BR')} avaliações`} tone="lime" />
        <Kpi
          icon="confirmation_number"
          label="Cupons ativos"
          value={`${activeCoupons.length}/${coupons.length}`}
          sub={coupons.length - activeCoupons.length > 0 ? `${coupons.length - activeCoupons.length} inativo(s)` : 'Todos ativos'}
        />
        <Kpi icon="arrow_downward" label="Mais barato" value={cheapest ? fmtBRL(cheapest.price) : '—'} sub={cheapest?.name ?? ''} />
        <Kpi icon="arrow_upward" label="Mais caro" value={priciest ? fmtBRL(priciest.price) : '—'} sub={priciest?.name ?? ''} />
        <Kpi icon="category" label="Categorias" value={String(slices.length)} sub="Com produtos publicados" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Produtos por categoria" subtitle="Distribuição do catálogo">
          <Donut slices={slices} />
        </Panel>
        <Panel title="Faixas de preço" subtitle="Quantidade de produtos por faixa">
          <VBars rows={buckets} />
          <div className="flex gap-3 mt-2">
            {buckets.map((b) => (
              <span key={b.label} className="flex-1 text-center text-[10px] font-semibold text-[#767680]">{b.label}</span>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Preço médio por categoria">
          <HBars rows={avgByCategory} />
        </Panel>
        <Panel title="Principais marcas" subtitle="Por número de produtos">
          <HBars rows={brandRows} color="#061748" />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Maiores descontos" subtitle="Produtos com maior percentual off">
          {topDiscounts.length === 0 ? (
            <p className="text-sm text-[#767680]">Nenhum produto em promoção. Use a aba Descontos.</p>
          ) : (
            <ul className="divide-y divide-[#eceef0]">
              {topDiscounts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <img src={p.image} alt="" className="w-12 h-10 rounded-lg object-cover bg-[#eceef0]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#061748] truncate">{p.name}</p>
                    <p className="text-xs text-[#767680]">
                      <s>{fmtBRL(p.originalPrice!)}</s> → {fmtBRL(p.price)}
                    </p>
                  </div>
                  <span className="text-xs font-black bg-[#C4D600] text-[#061748] px-2.5 py-1 rounded-full">-{discountPct(p).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Mais bem avaliados" subtitle="Nota e quantidade de avaliações">
          <ul className="divide-y divide-[#eceef0]">
            {topRated.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <img src={p.image} alt="" className="w-12 h-10 rounded-lg object-cover bg-[#eceef0]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#061748] truncate">{p.name}</p>
                  <p className="text-xs text-[#767680]">{p.reviewCount} avaliações</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-black text-[#061748]">
                  <span className="material-symbols-outlined text-[16px] text-[#C4D600]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  {p.rating.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="text-xs text-[#767680] px-1">
        Os indicadores são calculados a partir do catálogo atual. Vendas e visitas ainda não aparecem aqui porque o site não tem backend de pedidos.
      </p>
    </div>
  );
};
