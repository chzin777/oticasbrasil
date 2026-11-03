import React, { useEffect, useState } from 'react';
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

interface DashboardStats {
  kpis: {
    totalRevenue: number;
    periodRevenue: number;
    totalOrders: number;
    periodOrders: number;
    avgTicket: number;
    activeProducts: number;
    brandsCount: number;
    avgPrice: number;
    activeCoupons: number;
    totalCoupons: number;
  };
  timeSeries: { date: string; orders: number; revenue: number }[];
  categoryMix: Record<string, number>;
  topProducts: { name: string; image: string; brand: string; revenue: number; units: number }[];
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  armacoes: { label: 'Armações', color: T.teal },
  'oculos-de-sol': { label: 'Óculos de Sol', color: T.amber },
  'lentes-de-grau': { label: 'Lentes de Grau', color: T.navy },
  'rayban-meta': { label: 'Ray-Ban Meta', color: '#6366f1' },
};

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
  accent: 'teal' | 'amber' | 'navy';
}> = ({ icon, label, value, sub, accent }) => {
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
  const max = Math.ceil(Math.max(...data, 1) / 10) * 10;
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
  const max = Math.ceil(Math.max(...visits, ...orders, 1) / 10) * 10;
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
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/dashboard/stats?period=${period}`, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DashboardStats>;
      })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar dados.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [period]);

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

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="material-symbols-outlined text-4xl text-red-400">error</span>
        <p className="text-sm text-slate-500">{error}</p>
        <button onClick={() => setPeriod(period)} className="text-xs font-bold text-teal-600 hover:underline">Tentar novamente</button>
      </div>
    );
  }

  const kpis = stats?.kpis;
  const timeSeries = stats?.timeSeries ?? [];
  const categoryMix = stats?.categoryMix ?? {};
  const topProducts = stats?.topProducts ?? [];

  const catSlices = Object.entries(categoryMix)
    .map(([key, value]) => ({
      label: CATEGORY_META[key]?.label ?? key,
      color: CATEGORY_META[key]?.color ?? '#94a3b8',
      value,
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const priceBuckets = [
    { label: 'Até R$200', min: 0, max: 200 },
    { label: 'R$200–400', min: 200, max: 400 },
    { label: 'R$400–600', min: 400, max: 600 },
    { label: 'R$600–1k', min: 600, max: 1000 },
    { label: 'R$1k+', min: 1000, max: Infinity },
  ];

  // Price buckets require product-level data not available in current API
  // Using placeholder until product stats endpoint is added
  const priceBucketRows = priceBuckets.map((b) => ({
    label: b.label,
    value: 0,
    display: '—',
  }));

  const tsLabels = timeSeries.map((t) => {
    const d = new Date(t.date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const tsRevenue = timeSeries.map((t) => t.revenue);
  const tsOrders = timeSeries.map((t) => t.orders);

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
        <HeroKpi icon="payments" label="Receita no Período" value={fmtBRL(kpis?.periodRevenue ?? 0)} sub={`Total acumulado: ${fmtBRL(kpis?.totalRevenue ?? 0)}`} accent="teal" />
        <HeroKpi icon="shopping_bag" label="Pedidos no Período" value={String(kpis?.periodOrders ?? 0)} sub={`Ticket médio: ${fmtBRL(kpis?.avgTicket ?? 0)}`} accent="amber" />
        <HeroKpi icon="inventory_2" label="Produtos Vendidos" value={String(kpis?.activeProducts ?? 0)} sub={`${kpis?.brandsCount ?? 0} marcas distintas`} accent="navy" />
      </div>

      {/* CHART: Receita */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <SectionTitle title="Evolução da Receita" subtitle="Faturamento diário real" action={<PeriodToggle />} />
        {tsRevenue.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Sem dados de receita no período selecionado.</p>
        ) : (
          <AreaChart data={tsRevenue} labels={tsLabels} color={T.teal} height={170} />
        )}
      </div>

      {/* SAÚDE DO CATÁLOGO */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <SectionTitle title="Saúde do Catálogo" subtitle="Indicadores em tempo real dos produtos vendidos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat icon="inventory_2" label="Produtos Vendidos" value={String(kpis?.activeProducts ?? 0)} sub="Itens únicos" accent="navy" />
          <MiniStat icon="local_offer" label="Em Promoção" value="—" sub="Dados via pedidos" accent="rose" />
          <MiniStat icon="star" label="Avaliação Média" value="—" sub="Integração futura" accent="amber" />
          <MiniStat icon="confirmation_number" label="Cupons Ativos" value={String(kpis?.activeCoupons ?? 0)} sub={`de ${kpis?.totalCoupons ?? 0} criados`} accent="teal" />
          <MiniStat icon="brand_family" label="Marcas" value={String(kpis?.brandsCount ?? 0)} sub="Parceiros" accent="navy" />
          <MiniStat icon="account_balance_wallet" label="Ticket Médio" value={fmtBRL(kpis?.avgTicket ?? 0).replace('R$ ', '')} sub="Por pedido" accent="teal" />
        </div>
      </div>

      {/* CHART: Pedidos */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <SectionTitle title="Pedidos por Dia" subtitle="Volume real de pedidos confirmados" />
        <div className="flex items-center gap-5 mb-3 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full" style={{ background: T.amber }} />Pedidos</span>
        </div>
        {tsOrders.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Sem pedidos no período selecionado.</p>
        ) : (
          <AreaChart data={tsOrders} labels={tsLabels} color={T.amber} height={170} />
        )}
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <SectionTitle title="Mix de Categorias" subtitle="Distribuição real por vendas" />
          {catSlices.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sem dados de categorias no período.</p>
          ) : (
            <RadialBars slices={catSlices} />
          )}
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <SectionTitle title="Faixas de Preço" subtitle="Concentração por valor" />
          <HeatBar rows={priceBucketRows} color={T.amber} />
        </div>
      </div>

      {/* TOP PRODUTOS */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <SectionTitle title="Top Produtos" subtitle="Mais vendidos no período por receita" />
        {topProducts.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Nenhum produto vendido no período selecionado.</p>
        ) : (
          <SparkRow items={topProducts.map((p) => ({
            name: p.name || 'Produto sem nome',
            img: p.image || 'https://placehold.co/48x48/e2e8f0/94a3b8?text=?',
            badge: fmtBRL(p.revenue),
            detail: `${p.units} unid. · ${p.brand || '—'}`,
            badgeColor: T.teal,
          }))} />
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mt-2">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-600">Dados reais:</span> Todas as métricas são calculadas a partir de pedidos confirmados no banco de dados. Dados de catálogo (produtos, preços, avaliações) são agregados em tempo real.
        </p>
      </div>
    </div>
  );
};