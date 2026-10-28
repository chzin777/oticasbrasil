import React, { useState } from 'react';
import { AVAILABLE_COUPONS, CATALOG_PRODUCTS } from '../../data/mockData';
import { useSiteData } from '../../lib/siteStore';
import { fmtBRL } from './ui';

const CATEGORY_META: { value: string; label: string; color: string }[] = [
  { value: 'armacoes', label: 'Armações', color: '#061748' },
  { value: 'oculos-de-sol', label: 'Óculos de Sol', color: '#4156b8' },
  { value: 'lentes-de-grau', label: 'Lentes de Grau', color: '#C4D600' },
  { value: 'rayban-meta', label: 'Ray-Ban Meta', color: '#9aa5d6' },
];

type AnalyticsPeriod = '7d' | '30d' | '90d';

const PERFORMANCE_DATA: Record<AnalyticsPeriod, { labels: string[]; visits: number[]; orders: number[] }> = {
  '7d': {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    visits: [42, 58, 51, 76, 63, 94, 82],
    orders: [8, 12, 10, 18, 15, 23, 20],
  },
  '30d': {
    labels: ['1', '4', '7', '10', '13', '16', '19', '22', '25', '28'],
    visits: [48, 66, 55, 82, 71, 96, 78, 108, 92, 124],
    orders: [9, 14, 11, 18, 16, 22, 19, 27, 23, 31],
  },
  '90d': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8', 'Sem 9', 'Sem 10', 'Sem 11', 'Sem 12'],
    visits: [45, 54, 49, 67, 61, 73, 68, 86, 78, 99, 91, 116],
    orders: [9, 11, 10, 14, 13, 16, 15, 19, 18, 22, 21, 26],
  },
};

const chartPath = (values: number[], max: number) => {
  const points = values.map((value, index) => ({
    x: 44 + (index * 576) / Math.max(values.length - 1, 1),
    y: 12 + 150 - (value / max) * 150,
  }));
  if (!points.length) return '';
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
};

const Panel: React.FC<{ title: string; subtitle?: string; className?: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  className = '',
  action,
  children,
}) => (
  <section className={`bg-white rounded-2xl border border-[#e8ebf1] shadow-[0_1px_3px_rgba(20,35,68,0.04)] p-5 sm:p-6 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-sm font-bold text-[#142344]">{title}</h3>
        {subtitle && <p className="text-xs text-[#7b8497] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const KpiCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  sub: string;
  trend?: { value: string; positive: boolean };
  tone?: 'navy' | 'lime';
}> = ({ icon, label, value, sub, trend, tone = 'navy' }) => (
  <div className="bg-white rounded-2xl border border-[#e8ebf1] shadow-[0_1px_3px_rgba(20,35,68,0.04)] p-5 flex flex-col justify-between min-h-[140px]">
    <div className="flex items-center justify-between mb-3">
      <span
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          tone === 'lime' ? 'bg-[#f4f9d0] text-[#061748]' : 'bg-[#eef1fb] text-[#4156b8]'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>
      {trend && (
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <span className="material-symbols-outlined text-[14px]">{trend.positive ? 'trending_up' : 'trending_down'}</span>
          {trend.value}
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#767680] mb-1">{label}</p>
      <p className="text-3xl font-black text-[#142344] tracking-tight leading-none">{value}</p>
      <p className="text-[11px] text-[#7b8497] mt-2">{sub}</p>
    </div>
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
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
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
  const performance = PERFORMANCE_DATA[period];
  const chartMax = Math.ceil(Math.max(...performance.visits) / 20) * 20;
  const visitsPath = chartPath(performance.visits, chartMax);
  const ordersPath = chartPath(performance.orders, chartMax);
  const chartPoints = performance.visits.map((_, index) => ({
    x: 44 + (index * 576) / Math.max(performance.visits.length - 1, 1),
    label: performance.labels[index],
  }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-xl font-black text-[#142344]">Visão Geral</h2>
          <p className="text-sm text-[#7b8497] mt-0.5">Acompanhe métricas e desempenho da loja</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8ebf1] bg-white px-3 py-1.5 text-xs font-semibold text-[#737d91] shadow-sm self-start sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Dados demonstrativos · últimos 30 dias
        </span>
      </div>

      {/* Primary KPIs - Revenue Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon="payments"
          label="Faturamento Estimado"
          value="R$ 48.290"
          sub="Volume total de vendas"
          tone="lime"
          trend={{ value: '+12,5%', positive: true }}
        />
        <KpiCard
          icon="visibility"
          label="Visitantes Únicos"
          value="12.840"
          sub="Tráfego qualificado na loja"
          trend={{ value: '+8,2%', positive: true }}
        />
        <KpiCard
          icon="conversion_path"
          label="Taxa de Conversão"
          value="3,8%"
          sub="Pedidos por visita"
          tone="lime"
          trend={{ value: '-0,4%', positive: false }}
        />
        <KpiCard
          icon="shopping_cart"
          label="Ticket Médio"
          value={fmtBRL(avgPrice)}
          sub={`${brands.size} marcas ativas`}
        />
      </div>

      {/* Secondary KPIs - Catalog Health */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-[#e8ebf1] p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#767680] mb-1">Produtos</p>
          <p className="text-xl font-black text-[#142344]">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8ebf1] p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#767680] mb-1">Em Promoção</p>
          <p className="text-xl font-black text-[#142344]">{discounted.length}</p>
          <p className="text-[10px] text-[#7b8497]">{avgDiscount.toFixed(0)}% off médio</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8ebf1] p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#767680] mb-1">Avaliação</p>
          <p className="text-xl font-black text-[#142344]">{avgRating.toFixed(1)}</p>
          <p className="text-[10px] text-[#7b8497]">{totalReviews} reviews</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8ebf1] p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#767680] mb-1">Cupons Ativos</p>
          <p className="text-xl font-black text-[#142344]">{activeCoupons.length}</p>
          <p className="text-[10px] text-[#7b8497]">de {coupons.length} totais</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8ebf1] p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#767680] mb-1">Categorias</p>
          <p className="text-xl font-black text-[#142344]">{slices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8ebf1] p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#767680] mb-1">Valor Total</p>
          <p className="text-xl font-black text-[#142344]">{fmtBRL(totalValue).replace('R$ ', '')}</p>
        </div>
      </div>

      {/* Main Chart Section */}
      <Panel
        title="Tendência de Tráfego e Vendas"
        subtitle="Evolução de visitas e pedidos ao longo do tempo"
        action={
          <div className="inline-flex rounded-lg border border-[#e4e8f0] bg-[#f8f9fc] p-0.5" aria-label="Período do gráfico">
            {([
              ['7d', '7D'],
              ['30d', '30D'],
              ['90d', '90D'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                  period === value ? 'bg-[#071a45] text-white shadow-sm' : 'text-[#737d91] hover:text-[#34415e]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-[#737d91]">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#4156b8]" />Visitas</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#22a699]" />Pedidos</span>
          <span className="ml-auto text-[10px] font-medium text-[#9aa2b1] italic">Dados fictícios para demonstração</span>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 640 205" role="img" aria-label={`Gráfico demonstrativo de visitas e pedidos nos últimos ${period === '7d' ? '7' : period === '30d' ? '30' : '90'} dias`} className="w-full min-w-[460px]">
            <defs>
              <linearGradient id="dashboard-visits-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4156b8" stopOpacity=".16" />
                <stop offset="100%" stopColor="#4156b8" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((line) => {
              const y = 12 + (150 * line) / 3;
              return <line key={line} x1="44" x2="620" y1={y} y2={y} stroke="#edf0f5" strokeDasharray="4 5" />;
            })}
            <path d={`${visitsPath} L 620 162 L 44 162 Z`} fill="url(#dashboard-visits-area)" />
            <path d={visitsPath} fill="none" stroke="#4156b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={ordersPath} fill="none" stroke="#22a699" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {chartPoints.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                <circle cx={point.x} cy={12 + 150 - (performance.visits[index] / chartMax) * 150} r="3.5" fill="white" stroke="#4156b8" strokeWidth="2" />
                <circle cx={point.x} cy={12 + 150 - (performance.orders[index] / chartMax) * 150} r="3.5" fill="white" stroke="#22a699" strokeWidth="2" />
                <text x={point.x} y="190" textAnchor="middle" fill="#8992a4" fontSize="10">{point.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </Panel>

      {/* Analytics Grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Distribuição por Categoria" subtitle="Composição do catálogo ativo">
          <Donut slices={slices} />
        </Panel>
        <Panel title="Faixas de Preço" subtitle="Concentração de produtos por valor">
          <VBars rows={buckets} />
          <div className="flex gap-3 mt-2">
            {buckets.map((b) => (
              <span key={b.label} className="flex-1 text-center text-[10px] font-semibold text-[#767680]">{b.label}</span>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Preço Médio por Categoria" subtitle="Comparativo de posicionamento">
          <HBars rows={avgByCategory} />
        </Panel>
        <Panel title="Principais Marcas" subtitle="Top marcas por volume de produtos">
          <HBars rows={brandRows} color="#061748" />
        </Panel>
      </div>

      {/* Top Products Section */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Maiores Descontos" subtitle="Produtos com maior agressividade promocional">
          {topDiscounts.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-4xl text-[#e8ebf1] mb-2">local_offer</span>
              <p className="text-sm text-[#767680]">Nenhum produto em promoção no momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#eceef0]">
              {topDiscounts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <img src={p.image} alt="" className="w-14 h-12 rounded-lg object-cover bg-[#eceef0] border border-[#e8ebf1]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#061748] truncate">{p.name}</p>
                    <p className="text-xs text-[#767680] mt-0.5">
                      <s className="opacity-60">{fmtBRL(p.originalPrice!)}</s> <span className="text-[#061748] font-semibold">→ {fmtBRL(p.price)}</span>
                    </p>
                  </div>
                  <span className="text-xs font-black bg-[#C4D600] text-[#061748] px-2.5 py-1 rounded-full whitespace-nowrap">-{discountPct(p).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Melhores Avaliados" subtitle="Produtos com maior satisfação dos clientes">
          {topRated.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-4xl text-[#e8ebf1] mb-2">star_off</span>
              <p className="text-sm text-[#767680]">Nenhum produto avaliado ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#eceef0]">
              {topRated.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <img src={p.image} alt="" className="w-14 h-12 rounded-lg object-cover bg-[#eceef0] border border-[#e8ebf1]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#061748] truncate">{p.name}</p>
                    <p className="text-xs text-[#767680] mt-0.5">{p.reviewCount} avaliações</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-black text-[#061748] bg-[#f8f9fc] px-2.5 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-[16px] text-[#C4D600]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {p.rating.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Footer Disclaimer */}
      <div className="bg-[#f8f9fc] rounded-xl border border-[#e8ebf1] p-4 mt-4">
        <p className="text-[11px] text-[#767680] leading-relaxed">
          <span className="font-bold text-[#45464f]">Nota:</span> Métricas de vendas, visitas, conversão e cliques são valores fictícios para fins de demonstração da interface. Indicadores de catálogo (produtos, preços, avaliações, cupons) são calculados em tempo real a partir dos dados atuais.
        </p>
      </div>
    </div>
  );
};