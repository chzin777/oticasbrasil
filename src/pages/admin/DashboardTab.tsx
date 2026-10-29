import React, { useState } from 'react';
import { AVAILABLE_COUPONS, CATALOG_PRODUCTS } from '../../data/mockData';
import { useSiteData } from '../../lib/siteStore';
import { fmtBRL } from './ui';

const T = {
  teal: '#0d9488',
  tealLight: '#ccfbf1',
  tealDark: '#0f766e',
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  navy: '#0f172a',
  slate: '#64748b',
  grid: '#f1f5f9',
};

type Period = '7d' | '30d' | '90d';

const PERF: Record<Period, { labels: string[]; visits: number[]; orders: number[]; revenue: number[] }> = {
  '7d': {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    visits: [320, 410, 385, 520, 475, 680, 590],
    orders: [18, 24, 21, 32, 28, 42, 36],
    revenue: [4200, 5800, 4900, 7600, 6500, 9800, 8400],
  },
  '30d': {
    labels: ['1', '4', '7', '10', '13', '16', '19', '22', '25', '28'],
    visits: [280, 350, 310, 420, 390, 480, 440, 560, 510, 620],
    orders: [15, 20, 17, 25, 22, 29, 26, 34, 30, 38],
    revenue: [3500, 4700, 3900, 5900, 5100, 6800, 6100, 7900, 7100, 8900],
  },
  '90d': {
    labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'],
    visits: [1800, 2100, 1950, 2400, 2250, 2700, 2550, 3100, 2900, 3400, 3200, 3800],
    orders: [95, 115, 105, 135, 125, 150, 140, 175, 160, 195, 180, 215],
    revenue: [22000, 27000, 24500, 32000, 29500, 36000, 33000, 42000, 38500, 47000, 43000, 52000],
  },
};

const CATEGORY_META = [
  { value: 'armacoes', label: 'Armações', color: T.teal },
  { value: 'oculos-de-sol', label: 'Óculos de Sol', color: T.amber },
  { value: 'lentes-de-grau', label: 'Lentes de Grau', color: T.navy },
  { value: 'rayban-meta', label: 'Ray-Ban Meta', color: '#6366f1' },
];

const smoothPath = (vals: number[], max: number, w: number, h: number, padX = 40, padY = 16) => {
  const pts = vals.map((v, i) => ({
    x: padX + (i * (w - padX * 2)) / Math.max(vals.length - 1, 1),
    y: padY + (h - padY * 2) - (v / max) * (h - padY * 2),
  }));
  if (!pts.length) return '';
  return pts.slice(1).reduce((d, p, i) => {
    const prev = pts[i];
    const cx = (prev.x + p.x) / 2;
    return `${d} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, `M ${pts[0].x} ${pts[0].y}`);
};

const HeroKpi: React.FC<{
  icon: string; label: string; value: string; sub: string;
  trend?: { v: string; up: boolean }; accent: 'teal' | 'amber' | 'navy';
}> = ({ icon, label, value, sub, trend, accent }) => {
  const accents = {
    teal: { bg: T.tealLight, text: T.tealDark, bar: T.teal },
    amber: { bg: T.amberLight, text: '#92400e', bar: T.amber },
    navy: { bg: '#e2e8f0', text: T.navy, bar: T.navy },
  };
  const a = accents[accent];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-[#e2e8f0] shadow-sm p-5 flex flex-col justify-between min-h-[156px] group hover:shadow-md transition-shadow">
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: a.bar }} />
      <div className="flex items-center justify-between mb-2">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: a.bg, color: a.text }}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </span>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-0.5 ${trend.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <span className="material-symbols-outlined text-[14px]">{trend.up ? 'trending_up' : 'trending_down'}</span>
            {trend.v}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-black tracking-tight leading-none" style={{ color: T.navy }}>{value}</p>
        <p className="text-[11px] text-slate-400 mt-2">{sub}</p>
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ icon: string; label: string; value: string; sub?: string; accent?: 'teal' | 'amber' | 'navy' | 'rose' }> = ({ icon, label, value, sub, accent = 'teal' }) => {
  const accents = {
    teal: { bg: T.tealLight, text: T.tealDark },
    amber: { bg: T.amberLight, text: '#92400e' },
    navy: { bg: '#e2e8f0', text: T.navy },
    rose: { bg: '#ffe4e6', text: '#be123c' },
  };
  const a = accents[accent];
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white border border-[#e2e8f0] p-4 flex items-center gap-3.5 hover:shadow-md hover:border-slate-300 transition-all">
      <span
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ background: a.bg, color: a.text }}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">{label}</p>
        <p className="text-xl font-black text-slate-800 leading-none tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-1 font-medium leading-none">{sub}</p>}
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between gap-3 mb-4">
    <div>
      <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const AreaChart: React.FC<{ data: number[]; labels: string[]; color: string; height?: number }> = ({ data, labels, color, height = 180 }) => {
  const max = Math.ceil(Math.max(...data) / 10) * 10 || 10;
  const w = 600;
  const h = height;
  const path = smoothPath(data, max, w, h);
  const lastX = 40 + ((data.length - 1) * (w - 80)) / Math.max(data.length - 1, 1);
  const areaPath = `${path} L ${lastX} ${h - 16} L 40 ${h - 16} Z`;
  const gradId = `area-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Gráfico de área">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="40" x2={w - 40} y1={16 + (h - 32) * (1 - f)} y2={16 + (h - 32) * (1 - f)} stroke={T.grid} strokeWidth="1" />
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = 40 + (i * (w - 80)) / Math.max(data.length - 1, 1);
        const y = 16 + (h - 32) - (v / max) * (h - 32);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" className="opacity-0 hover:opacity-100 transition-opacity" />
            <text x={x} y={h - 2} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
};

const DualLineChart: React.FC<{ visits: number[]; orders: number[]; labels: string[] }> = ({ visits, orders, labels }) => {
  const max = Math.ceil(Math.max(...visits, ...orders) / 10) * 10 || 10;
  const w = 600;
  const h = 200;
  const vPath = smoothPath(visits, max, w, h);
  const oPath = smoothPath(orders, max, w, h);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Gráfico de visitas e pedidos">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="40" x2={w - 40} y1={16 + (h - 32) * (1 - f)} y2={16 + (h - 32) * (1 - f)} stroke={T.grid} strokeWidth="1" />
      ))}
      <path d={vPath} fill="none" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round" />
      <path d={oPath} fill="none" stroke={T.amber} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" />
      {visits.map((_, i) => {
        const x = 40 + (i * (w - 80)) / Math.max(visits.length - 1, 1);
        return <text key={i} x={x} y={h - 2} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">{labels[i]}</text>;
      })}
    </svg>
  );
};

const RadialBars: React.FC<{ slices: { label: string; value: number; color: string }[] }> = ({ slices }) => {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const maxVal = Math.max(...slices.map((s) => s.value), 1);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          {slices.map((s, i) => {
            const r = 30 + i * 16;
            const circ = 2 * Math.PI * r;
            const pct = s.value / maxVal;
            return (
              <circle key={s.label} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${circ * pct} ${circ}`} opacity="0.85" />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800">{total}</span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Total</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-bold text-slate-800">{s.value} <span className="text-slate-400 text-xs font-medium">({Math.round((s.value / total) * 100)}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const HeatBar: React.FC<{ rows: { label: string; value: number; display: string }[]; color: string }> = ({ rows, color }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-slate-600 truncate pr-2">{r.label}</span>
            <span className="font-bold text-slate-800">{r.display}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const SparkRow: React.FC<{ items: { name: string; img: string; badge: string; detail: string; badgeColor: string }[] }> = ({ items }) => (
  <ul className="divide-y divide-slate-100">
    {items.map((item, i) => (
      <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-slate-50/50 rounded-lg px-1 -mx-1 transition-colors">
        <img src={item.img} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
          <p className="text-[11px] text-slate-400">{item.detail}</p>
        </div>
        <span className="text-[11px] font-black px-2 py-1 rounded-full whitespace-nowrap" style={{ background: item.badgeColor + '20', color: item.badgeColor }}>
          {item.badge}
        </span>
      </li>
    ))}
  </ul>
);

export const DashboardTab: React.FC = () => {
  useSiteData();
  const [period, setPeriod] = useState<Period>('30d');
  const products = CATALOG_PRODUCTS;
  const n = products.length || 1;

  const totalValue = products.reduce((s, p) => s + p.price, 0);
  const avgPrice = totalValue / n;
  const discounted = products.filter((p) => p.originalPrice && p.originalPrice > p.price);
  const discPct = (p: (typeof products)[number]) => ((p.originalPrice! - p.price) / p.originalPrice!) * 100;
  const avgDisc = discounted.length ? discounted.reduce((s, p) => s + discPct(p), 0) / discounted.length : 0;
  const rated = products.filter((p) => p.rating > 0);
  const avgRating = rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : 0;
  const totalReviews = products.reduce((s, p) => s + (p.reviewCount || 0), 0);
  const coupons = Object.entries(AVAILABLE_COUPONS);
  const activeCoupons = coupons.filter(([, c]) => c.active !== false);
  const brands = new Set(products.map((p) => p.brand));

  const catSlices = CATEGORY_META.map((c) => ({
    label: c.label, color: c.color,
    value: products.filter((p) => p.category === c.value).length,
  })).filter((s) => s.value > 0);

  const brandRows = Object.entries(
    products.reduce<Record<string, number>>((a, p) => ({ ...a, [p.brand]: (a[p.brand] || 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([label, value]) => ({ label, value, display: `${value} prod.` }));

  const priceBuckets = [
    { label: 'Até R$200', min: 0, max: 200 },
    { label: 'R$200–400', min: 200, max: 400 },
    { label: 'R$400–600', min: 400, max: 600 },
    { label: 'R$600–1k', min: 600, max: 1000 },
    { label: 'R$1k+', min: 1000, max: Infinity },
  ].map((b) => ({
    label: b.label,
    value: products.filter((p) => p.price >= b.min && p.price < b.max).length,
    display: `${products.filter((p) => p.price >= b.min && p.price < b.max).length} prod.`,
  }));

  const perf = PERF[period];
  const topDisc = [...discounted].sort((a, b) => discPct(b) - discPct(a)).slice(0, 4);
  const topRated = [...rated].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount).slice(0, 4);

  const PeriodToggle = () => (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {(['7d', '30d', '90d'] as const).map((v) => (
        <button key={v} type="button" onClick={() => setPeriod(v)}
          className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${period === v ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          {{ '7d': '7D', '30d': '30D', '90d': '90D' }[v]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-10 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Loja ativa
        </span>
      </div>

      {/* HERO KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HeroKpi icon="payments" label="Receita Estimada" value="R$ 47.200" sub="Acumulado no período" accent="teal" trend={{ v: '+14,2%', up: true }} />
        <HeroKpi icon="group" label="Visitantes" value="4.380" sub="Tráfego qualificado" accent="amber" trend={{ v: '+9,7%', up: true }} />
        <HeroKpi icon="shopping_bag" label="Pedidos" value="201" sub={`Ticket médio ${fmtBRL(avgPrice)}`} accent="navy" trend={{ v: '+6,3%', up: true }} />
      </div>

      {/* CHART: Receita */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <SectionTitle title="Evolução da Receita" subtitle="Faturamento diário estimado" action={<PeriodToggle />} />
        <AreaChart data={perf.revenue} labels={perf.labels} color={T.teal} height={170} />
      </div>

      {/* SAÚDE DO CATÁLOGO */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <SectionTitle title="Saúde do Catálogo" subtitle="Indicadores em tempo real dos produtos ativos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat icon="inventory_2" label="Produtos" value={String(products.length)} sub="Itens ativos" accent="navy" />
          <MiniStat icon="local_offer" label="Em Promoção" value={String(discounted.length)} sub={`${avgDisc.toFixed(0)}% off médio`} accent="rose" />
          <MiniStat icon="star" label="Avaliação Média" value={avgRating.toFixed(1)} sub={`${totalReviews} avaliações`} accent="amber" />
          <MiniStat icon="confirmation_number" label="Cupons Ativos" value={String(activeCoupons.length)} sub={`de ${coupons.length} criados`} accent="teal" />
          <MiniStat icon="brand_family" label="Marcas" value={String(brands.size)} sub="Parceiros" accent="navy" />
          <MiniStat icon="account_balance_wallet" label="Valor Total" value={fmtBRL(totalValue).replace('R$ ', '')} sub="Estoque precificado" accent="teal" />
        </div>
      </div>

      {/* CHART: Visitas vs Pedidos */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <SectionTitle title="Tráfego × Conversões" subtitle="Comparativo de visitas e pedidos" />
        <div className="flex items-center gap-5 mb-3 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full" style={{ background: T.teal }} />Visitas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full border-t-2 border-dashed" style={{ borderColor: T.amber }} />Pedidos</span>
        </div>
        <DualLineChart visits={perf.visits} orders={perf.orders} labels={perf.labels} />
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <SectionTitle title="Mix de Categorias" subtitle="Distribuição do catálogo" />
          <RadialBars slices={catSlices} />
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <SectionTitle title="Faixas de Preço" subtitle="Concentração por valor" />
          <HeatBar rows={priceBuckets} color={T.amber} />
        </div>
      </div>

      {/* MARCAS + TOP PRODUTOS */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <SectionTitle title="Top Marcas" subtitle="Por volume de produtos" />
          <HeatBar rows={brandRows} color={T.navy} />
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6 lg:col-span-2">
          <SectionTitle title="Destaques" subtitle="Maiores descontos e melhores avaliados" />
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-3">🔥 Maiores Descontos</p>
              {topDisc.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Nenhum produto em promoção.</p>
              ) : (
                <SparkRow items={topDisc.map((p) => ({
                  name: p.name, img: p.image,
                  badge: `-${discPct(p).toFixed(0)}%`,
                  detail: `${fmtBRL(p.originalPrice!)} → ${fmtBRL(p.price)}`,
                  badgeColor: T.teal,
                }))} />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-3">⭐ Melhores Avaliados</p>
              {topRated.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Nenhum produto avaliado.</p>
              ) : (
                <SparkRow items={topRated.map((p) => ({
                  name: p.name, img: p.image,
                  badge: `${p.rating.toFixed(1)} ★`,
                  detail: `${p.reviewCount} avaliações`,
                  badgeColor: T.amber,
                }))} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mt-2">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-600">Nota:</span> Métricas de vendas, visitas e conversão são fictícias para demonstração. Dados de catálogo (produtos, preços, avaliações, cupons) são calculados em tempo real.
        </p>
      </div>
    </div>
  );
};