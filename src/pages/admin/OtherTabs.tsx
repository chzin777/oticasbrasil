import React, { useRef, useState } from 'react';
import { AVAILABLE_COUPONS, CATALOG_PRODUCTS, Coupon } from '../../data/mockData';
import { THEME_CONFIG } from '../../components/HeroCapa';
import {
  applyBulkDiscount,
  changeAdminPassword,
  clearBulkDiscount,
  CustomBanner,
  deleteCustomBanner,
  exportData,
  BannerImages,
  HeroTexts,
  HeroTheme,
  importData,
  resetAll,
  saveCoupon,
  saveThemeBanner,
  SITE_CONFIG,
  setActiveBanner,
  useSiteData,
} from '../../lib/siteStore';
import { Card, Field, fmtBRL, ghostBtn, inputCls, Modal, Notice, primaryBtn, STORAGE_FULL_MSG } from './ui';
import BannerCanvasEditor from './BannerCanvasEditor';

type Msg = { kind: 'ok' | 'error'; text: string } | null;

const CATS = [
  { value: 'armacoes', label: 'Armações' },
  { value: 'oculos-de-sol', label: 'Óculos de Sol' },
  { value: 'lentes-de-grau', label: 'Lentes de Grau' },
  { value: 'rayban-meta', label: 'Ray-Ban Meta' },
];

export const DiscountsTab: React.FC = () => {
  useSiteData();
  const [scope, setScope] = useState('all');
  const [percent, setPercent] = useState(10);
  const [msg, setMsg] = useState<Msg>(null);
  const ids = CATALOG_PRODUCTS.filter((p) => scope === 'all' || p.category === scope).map((p) => p.id);

  const run = (ok: boolean, text: string) => setMsg(ok ? { kind: 'ok', text } : { kind: 'error', text: STORAGE_FULL_MSG });

  return (
    <div className="space-y-5">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Card title="Desconto em massa" subtitle="Aplica um percentual sobre o preço original de vários produtos de uma vez.">
        <div className="grid md:grid-cols-3 gap-5 items-end">
          <Field label="Aplicar em">
            <select className={inputCls} value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">Todos os produtos</option>
              {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Desconto (%)">
            <input type="number" min={1} max={90} className={inputCls} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
          </Field>
          <p className="text-sm text-[#767680] pb-2.5">{ids.length} produtos afetados</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            className={primaryBtn}
            onClick={() => {
              if (!(percent > 0 && percent < 100)) return setMsg({ kind: 'error', text: 'Informe um percentual entre 1 e 99.' });
              run(applyBulkDiscount(ids, percent), `${percent}% aplicado em ${ids.length} produtos.`);
            }}
          >
            Aplicar desconto
          </button>
          <button className={ghostBtn} onClick={() => run(clearBulkDiscount(ids), 'Descontos removidos.')}>Remover descontos</button>
        </div>
        {CATALOG_PRODUCTS.length > 0 && (
          <p className="text-xs text-[#767680] mt-4">
            Exemplo: {CATALOG_PRODUCTS[0].name} — {fmtBRL(CATALOG_PRODUCTS[0].price)}
          </p>
        )}
      </Card>
    </div>
  );
};

const blankCoupon = (): Coupon => ({ discountPercent: 10, desc: '', active: true });

export const CouponsTab: React.FC = () => {
  useSiteData();
  const [editing, setEditing] = useState<{ code: string; coupon: Coupon; prev?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const code = editing.code.trim().toUpperCase();
    const c = editing.coupon;
    if (!code) return setError('Informe o código.');
    if (code !== editing.prev && AVAILABLE_COUPONS[code]) return setError('Já existe um cupom com esse código.');
    if (!(c.discountPercent || c.discountAmount)) return setError('Informe um desconto.');
    if (c.discountPercent && c.discountPercent > 100) return setError('Percentual máximo é 100.');
    const clean: Coupon = { ...c, minSubtotal: c.minSubtotal || undefined, expiresAt: c.expiresAt || undefined };
    if (!saveCoupon(code, clean, editing.prev)) return setError(STORAGE_FULL_MSG);
    setEditing(null);
    setError(null);
  };

  const patch = (p: Partial<Coupon>) => setEditing((prev) => (prev ? { ...prev, coupon: { ...prev.coupon, ...p } } : prev));
  const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

  return (
    <div className="space-y-5">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Card
        title="Cupons"
        subtitle="Usados no resumo do pedido."
        action={
          <button className={primaryBtn} onClick={() => { setError(null); setEditing({ code: '', coupon: blankCoupon() }); }}>
            <span className="material-symbols-outlined text-[18px]">add</span>Novo cupom
          </button>
        }
      >
        <ul className="grid gap-3">
          {Object.entries(AVAILABLE_COUPONS).map(([code, c]) => (
            <li key={code}>
              <button
                type="button"
                className={`w-full flex items-center gap-4 text-left p-4 rounded-2xl border border-dashed cursor-pointer hover:border-[#4156b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4156b8] ${c.active === false ? 'border-[#c6c5d0] bg-[#f7f9fb] opacity-70' : 'border-[#4156b8]/40 bg-[#f4f6ff]'}`}
                onClick={() => { setError(null); setEditing({ code, coupon: { ...c }, prev: code }); }}
              >
                <div className="w-14 h-14 rounded-xl bg-[#061748] text-[#dbee2c] flex items-center justify-center font-black text-sm text-center leading-tight">
                  {c.discountPercent ? `${c.discountPercent}%` : 'R$'}
                </div>
                <div>
                  <p className="font-black tracking-wider text-[#061748]">
                    {code}
                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${c.active === false ? 'bg-[#eceef0] text-[#767680]' : 'bg-[#C4D600] text-[#061748]'}`}>
                      {c.active === false ? 'Inativo' : 'Ativo'}
                    </span>
                  </p>
                  <p className="text-xs text-[#767680]">
                    {c.discountPercent ? `${c.discountPercent}%` : fmtBRL(c.discountAmount ?? 0)} • {c.desc || 'sem descrição'}
                    {c.minSubtotal ? ` • mín. ${fmtBRL(c.minSubtotal)}` : ''}
                    {c.expiresAt ? ` • até ${c.expiresAt}` : ''}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {Object.keys(AVAILABLE_COUPONS).length === 0 && <p className="text-sm text-[#767680]">Nenhum cupom.</p>}
      </Card>

      {editing && (
        <Modal title={editing.prev ? 'Editar cupom' : 'Novo cupom'} onClose={() => setEditing(null)}>
          <form onSubmit={submit} className="space-y-5">
            {error && <Notice kind="error">{error}</Notice>}
            <Field label="Código">
              <input className={`${inputCls} uppercase`} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Desconto (%)">
                <input type="number" min={0} max={100} className={inputCls} value={editing.coupon.discountPercent ?? ''} onChange={(e) => patch({ discountPercent: numOrUndef(e.target.value), discountAmount: undefined })} />
              </Field>
              <Field label="ou valor fixo (R$)">
                <input type="number" min={0} step="0.01" className={inputCls} value={editing.coupon.discountAmount ?? ''} onChange={(e) => patch({ discountAmount: numOrUndef(e.target.value), discountPercent: undefined })} />
              </Field>
              <Field label="Compra mínima (R$)">
                <input type="number" min={0} className={inputCls} value={editing.coupon.minSubtotal ?? ''} onChange={(e) => patch({ minSubtotal: numOrUndef(e.target.value) })} />
              </Field>
              <Field label="Validade">
                <input type="date" className={inputCls} value={editing.coupon.expiresAt ?? ''} onChange={(e) => patch({ expiresAt: e.target.value || undefined })} />
              </Field>
            </div>
            <Field label="Descrição">
              <input className={inputCls} value={editing.coupon.desc} onChange={(e) => patch({ desc: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#061748]">
              <input type="checkbox" checked={editing.coupon.active !== false} onChange={(e) => patch({ active: e.target.checked })} />
              Cupom ativo
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" className={primaryBtn}>Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const HERO_FIELDS: { key: keyof HeroTexts; label: string }[] = [
  { key: 'brandBadge', label: 'Selo / marca' },
  { key: 'headlineCom', label: 'Título (início)' },
  { key: 'headlinePercent', label: 'Percentual' },
  { key: 'headlineOff', label: 'Título (final)' },
  { key: 'subtitle', label: 'Subtítulo' },
  { key: 'primaryCta', label: 'Botão principal' },
  { key: 'secondaryCta', label: 'Botão secundário' },
];

type BannerImageKey = keyof BannerImages;

const CanvasText: React.FC<{
  value: string;
  label: string;
  className: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}> = ({ value, label, className, onChange, multiline = false }) => {
  const [editing, setEditing] = useState(false);
  const Editor = multiline ? 'textarea' : 'input';

  return editing ? (
    <Editor
      autoFocus
      aria-label={`Editar ${label}`}
      value={value}
      rows={multiline ? 2 : undefined}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !multiline) setEditing(false);
        if (event.key === 'Escape') setEditing(false);
      }}
      className={`${className} max-w-full rounded-sm border-b border-dashed border-[#dbee2c] bg-black/30 px-1 outline-none`}
      style={{ width: `${Math.max(5, Math.min(value.length + 1, 48))}ch` }}
    />
  ) : (
    <button
      type="button"
      title={`Clique para editar: ${label}`}
      onClick={() => setEditing(true)}
      className={`${className} cursor-text rounded-sm hover:outline hover:outline-1 hover:outline-dashed hover:outline-[#dbee2c]`}
    >
      {value || <span className="opacity-60">Clique para editar</span>}
    </button>
  );
};

const readBannerImage = async (file: File, key: BannerImageKey): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = key === 'background' ? 1600 : 800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível processar a imagem.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Não foi possível processar a imagem.')),
        key === 'background' ? 'image/jpeg' : 'image/png',
        0.82,
      );
    });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler a imagem.'));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
};

const BannerPreview: React.FC<{
  theme: HeroTheme;
  hero: Record<string, string>;
  announcements: string[];
  images: BannerImages;
  onTextChange: (key: keyof HeroTexts, value: string) => void;
  onAnnouncementChange: (index: number, value: string) => void;
  onImageFile: (key: BannerImageKey, file: File) => void;
}> = ({ theme, hero, announcements, images, onTextChange, onAnnouncementChange, onImageFile }) => {
  const isBlackFriday = theme === 'blackfriday';
  const fileInputs = useRef<Record<BannerImageKey, HTMLInputElement | null>>({
    background: null,
    brandLogo: null,
    partnerLogo: null,
  });

  const editImage = (key: BannerImageKey, file?: File) => {
    if (file) onImageFile(key, file);
    if (fileInputs.current[key]) fileInputs.current[key]!.value = '';
  };

  const logoImage = (key: 'brandLogo' | 'partnerLogo', alt: string, className: string) => (
    <button
      type="button"
      title={`Clique para trocar ${alt}`}
      onClick={() => fileInputs.current[key]?.click()}
      className={`${className} cursor-pointer rounded outline-offset-2 hover:outline hover:outline-1 hover:outline-dashed hover:outline-[#dbee2c]`}
    >
      {images[key] ? <img src={images[key]} alt={alt} className="h-full w-auto object-contain" /> : <span className="text-[9px] text-white/75">+ {alt}</span>}
    </button>
  );

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#45464f] mb-2">Prévia — clique nos textos ou imagens para editar</p>
      {announcements.some((item) => item.trim()) && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 rounded-t-2xl bg-[#041030] px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
          {announcements.map((announcement, index) => announcement.trim() && (
            <span key={`${index}-${announcement}`} className="inline-flex items-center gap-3">
              <CanvasText value={announcement} label={`anúncio ${index + 1}`} className="text-[9px] font-bold uppercase sm:text-[10px]" onChange={(value) => onAnnouncementChange(index, value)} />
              {announcements.slice(index + 1).some((item) => item.trim()) && <span className="text-[#C4D600]">•</span>}
            </span>
          ))}
        </div>
      )}
      <div className={`relative isolate min-h-[260px] overflow-hidden ${announcements.some((item) => item.trim()) ? 'rounded-b-2xl' : 'rounded-2xl'} text-white ${isBlackFriday ? 'flex items-center justify-center text-center' : ''}`}>
        <button type="button" onClick={() => fileInputs.current.background?.click()} title="Clique para trocar a imagem de fundo" className="group absolute inset-0 z-0 cursor-pointer">
          <img src={images.background} alt="" className="h-full w-full object-cover" />
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[9px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">Trocar fundo</span>
        </button>
        <div className={`pointer-events-none absolute inset-0 z-[1] ${isBlackFriday ? 'bg-black/55' : 'bg-gradient-to-r from-black via-black/80 to-black/20'}`} />
        {isBlackFriday ? (
          <div className="relative z-10 w-full max-w-xl px-5 py-8 sm:px-10">
            <p className="inline-block rounded-md bg-[#C4D600] px-3 py-1 text-xs font-black tracking-wide text-[#061748]">
              <CanvasText value={hero.brandBadge} label="selo / marca" className="text-xs font-black uppercase tracking-wide text-[#061748]" onChange={(value) => onTextChange('brandBadge', value)} /> É NA
            </p>
            <div className="my-2 flex justify-center">{logoImage('brandLogo', 'logo da marca', 'h-16 sm:h-20')}</div>
            <p className="text-sm font-black uppercase sm:text-lg"><CanvasText value={hero.headlineCom} label="título inicial" className="text-sm font-black uppercase sm:text-lg" onChange={(value) => onTextChange('headlineCom', value)} /></p>
            <p className="text-5xl font-black leading-none text-[#C4D600] sm:text-7xl">
              <CanvasText value={hero.headlinePercent} label="percentual" className="text-5xl font-black leading-none text-[#C4D600] sm:text-7xl" onChange={(value) => onTextChange('headlinePercent', value)} />
              {' '}<CanvasText value={hero.headlineOff} label="texto do desconto" className="text-lg font-black text-white sm:text-2xl" onChange={(value) => onTextChange('headlineOff', value)} />
            </p>
            <p className="mx-auto mt-3 max-w-md text-xs text-white/85 sm:text-sm"><CanvasText multiline value={hero.subtitle} label="subtítulo" className="w-full text-xs text-white/85 sm:text-sm" onChange={(value) => onTextChange('subtitle', value)} /></p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <CanvasText value={hero.primaryCta} label="botão principal" className="rounded-lg bg-[#C4D600] px-3 py-2 text-xs font-bold text-[#061748]" onChange={(value) => onTextChange('primaryCta', value)} />
              <CanvasText value={hero.secondaryCta} label="botão secundário" className="rounded-lg border border-white/40 px-3 py-2 text-xs font-bold" onChange={(value) => onTextChange('secondaryCta', value)} />
            </div>
          </div>
        ) : (
          <>
            <div className="absolute left-4 top-3 z-10 flex h-10 items-center gap-1 sm:left-6 sm:top-4 sm:h-14 sm:gap-2">
              {logoImage('brandLogo', 'logo da marca', 'h-full')}
              <span className="h-7 w-px bg-white/40" />
              {logoImage('partnerLogo', 'logo parceiro', 'h-full')}
            </div>
            <div className="relative z-10 max-w-[70%] px-4 pb-5 pt-16 sm:max-w-[65%] sm:px-8 sm:pb-8 sm:pt-20">
              <p className="mb-2 inline-block rounded bg-[#C4D600] px-2 py-1 text-[10px] font-black uppercase text-[#061748] sm:text-xs">
                <CanvasText value={hero.brandBadge} label="selo / marca" className="text-[10px] font-black uppercase text-[#061748] sm:text-xs" onChange={(value) => onTextChange('brandBadge', value)} />
              </p>
              <p className="text-sm font-black uppercase sm:text-xl"><CanvasText value={hero.headlineCom} label="título inicial" className="text-sm font-black uppercase sm:text-xl" onChange={(value) => onTextChange('headlineCom', value)} /></p>
              <p className="text-5xl font-black leading-none text-[#C4D600] sm:text-7xl">
                <CanvasText value={hero.headlinePercent} label="percentual" className="text-5xl font-black leading-none text-[#C4D600] sm:text-7xl" onChange={(value) => onTextChange('headlinePercent', value)} />
                {' '}<CanvasText value={hero.headlineOff} label="texto do desconto" className="text-lg font-black text-white sm:text-2xl" onChange={(value) => onTextChange('headlineOff', value)} />
              </p>
              <p className="mt-2 line-clamp-2 max-w-md text-[10px] text-white/85 sm:text-xs"><CanvasText multiline value={hero.subtitle} label="subtítulo" className="w-full text-[10px] text-white/85 sm:text-xs" onChange={(value) => onTextChange('subtitle', value)} /></p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CanvasText value={hero.primaryCta} label="botão principal" className="rounded-lg bg-[#C4D600] px-3 py-2 text-[10px] font-bold text-[#061748] sm:text-xs" onChange={(value) => onTextChange('primaryCta', value)} />
                <CanvasText value={hero.secondaryCta} label="botão secundário" className="rounded-lg border border-white/40 px-3 py-2 text-[10px] font-bold sm:text-xs" onChange={(value) => onTextChange('secondaryCta', value)} />
              </div>
            </div>
          </>
        )}
        {(['background', 'brandLogo', 'partnerLogo'] as const).map((key) => (
          <input
            key={key}
            ref={(element) => { fileInputs.current[key] = element; }}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => editImage(key, event.target.files?.[0])}
          />
        ))}
      </div>
    </div>
  );
};

const BannerImageFields: React.FC<{ images: BannerImages; onChange: (images: BannerImages) => void }> = ({ images, onChange }) => (
  <details className="rounded-xl border border-[#eceef0] p-4">
    <summary className="cursor-pointer text-sm font-bold text-[#061748]">Imagens do banner — editar por URL</summary>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {([
        ['background', 'Imagem de fundo'],
        ['brandLogo', 'Logo da marca'],
        ['partnerLogo', 'Logo parceiro'],
      ] as const).map(([key, label]) => (
        <Field key={key} label={label}>
          <input className={inputCls} value={images[key]} placeholder="https://..." onChange={(event) => onChange({ ...images, [key]: event.target.value })} />
        </Field>
      ))}
    </div>
  </details>
);

const ThemeEditor: React.FC<{ theme: HeroTheme; title: string }> = ({ theme, title }) => {
  const defaults = THEME_CONFIG[theme] as unknown as Record<string, string>;
  const [ann, setAnn] = useState(SITE_CONFIG.announcements[theme].join('\n'));
  const [hero, setHero] = useState<Record<string, string>>(() => {
    const cur = { ...defaults, ...SITE_CONFIG.hero[theme] } as Record<string, string>;
    return Object.fromEntries(HERO_FIELDS.map((f) => [f.key, cur[f.key] ?? '']));
  });
  const [images, setImages] = useState<BannerImages>({ ...SITE_CONFIG.images[theme] });
  const [msg, setMsg] = useState<Msg>(null);
  const updateImageFile = async (key: BannerImageKey, file: File) => {
    try {
      const image = await readBannerImage(file, key);
      setImages((current) => ({ ...current, [key]: image }));
    } catch {
      setMsg({ kind: 'error', text: 'Não foi possível processar esta imagem.' });
    }
  };
  const changeAnnouncement = (index: number, value: string) => {
    const lines = ann.split('\n');
    lines[index] = value;
    setAnn(lines.join('\n'));
  };

  const save = () => {
    const items = ann.split('\n').map((s) => s.trim()).filter(Boolean);
    const ok = saveThemeBanner(theme, hero as unknown as Partial<HeroTexts>, items, images);
    setMsg(ok ? { kind: 'ok', text: 'Banner salvo.' } : { kind: 'error', text: STORAGE_FULL_MSG });
  };

  return (
    <Card title={title} subtitle="Clique nos elementos da prévia para editá-los; imagens também podem ser enviadas ou usadas por URL.">
      <div className="space-y-5">
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <BannerPreview
          theme={theme}
          hero={hero}
          announcements={ann.split('\n')}
          images={images}
          onTextChange={(key, value) => setHero((current) => ({ ...current, [key]: value }))}
          onAnnouncementChange={changeAnnouncement}
          onImageFile={updateImageFile}
        />
        <BannerImageFields images={images} onChange={setImages} />
        <Field label="Barra de anúncios" hint="Um anúncio por linha">
          <textarea rows={3} className={inputCls} value={ann} onChange={(e) => setAnn(e.target.value)} />
        </Field>
        <div className="grid md:grid-cols-2 gap-5">
          {HERO_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input className={inputCls} value={hero[f.key] ?? ''} onChange={(e) => setHero({ ...hero, [f.key]: e.target.value })} />
            </Field>
          ))}
        </div>
        <button className={primaryBtn} onClick={save}>Salvar banner</button>
      </div>
    </Card>
  );
};

export const BannersTab: React.FC = () => {
  useSiteData();
  const [msg, setMsg] = useState<Msg>(null);
  const [canvasBanner, setCanvasBanner] = useState<CustomBanner | null | undefined>(undefined);
  if (canvasBanner !== undefined) {
    return (
      <BannerCanvasEditor
        key={canvasBanner?.id ?? 'new-banner'}
        initialBanner={canvasBanner ?? undefined}
        onBack={() => setCanvasBanner(undefined)}
      />
    );
  }

  const changeActiveBanner = (id: string) => {
    const next = id || null;
    setMsg(setActiveBanner(next) ? { kind: 'ok', text: 'Exibição dos banners atualizada.' } : { kind: 'error', text: STORAGE_FULL_MSG });
  };

  return (
    <div className="space-y-5">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Card title="Banner da loja" subtitle="Escolha um banner personalizado ou mantenha a alternância atual entre os temas padrão.">
        <Field label="Banner em exibição">
          <select className={inputCls} value={SITE_CONFIG.activeBannerId ?? ''} onChange={(event) => changeActiveBanner(event.target.value)}>
            <option value="">Alternância atual da loja</option>
            <option value="default">Banner padrão</option>
            <option value="blackfriday">Banner Black Friday</option>
            {SITE_CONFIG.customBanners.map((banner) => <option key={banner.id} value={banner.id}>{banner.name || 'Banner sem nome'}</option>)}
            {SITE_CONFIG.customBanners.length > 1 && <option value="__rotation__">Alternar banners personalizados automaticamente</option>}
          </select>
        </Field>
        <button className={`${primaryBtn} mt-4`} onClick={() => setCanvasBanner(null)}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Criar banner do zero
        </button>
      </Card>
      <Card title="Meus banners" subtitle="Edite seus layouts personalizados no canvas.">
        {SITE_CONFIG.customBanners.length === 0 ? (
          <p className="text-sm text-[#767680]">Nenhum banner personalizado criado.</p>
        ) : (
          <ul className="grid gap-3">
            {SITE_CONFIG.customBanners.map((banner) => (
              <li key={banner.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eceef0] p-4">
                <div>
                  <p className="font-bold text-[#061748]">{banner.name || 'Banner sem nome'}</p>
                  <p className="text-xs text-[#767680]">{banner.theme === 'blackfriday' ? 'Black Friday' : 'Padrão'} · {banner.elements?.length ?? 0} elementos</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={ghostBtn} onClick={() => setCanvasBanner(banner)}>Editar no canvas</button>
                  <button
                    type="button"
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (!window.confirm(`Excluir o banner "${banner.name}"?`)) return;
                      setMsg(deleteCustomBanner(banner.id) ? { kind: 'ok', text: 'Banner excluído.' } : { kind: 'error', text: STORAGE_FULL_MSG });
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ThemeEditor theme="default" title="Banner padrão" />
      <ThemeEditor theme="blackfriday" title="Banner Black Friday" />
    </div>
  );
};

export const SettingsTab: React.FC = () => {
  const [msg, setMsg] = useState<Msg>(null);
  const [pw, setPw] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oticas-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (f?: File) => {
    if (!f) return;
    const ok = importData(await f.text());
    setMsg(ok ? { kind: 'ok', text: 'Backup importado.' } : { kind: 'error', text: 'Arquivo inválido ou grande demais.' });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Card title="Backup" subtitle="Exporte suas alterações ou leve-as para outro navegador.">
        <div className="flex flex-wrap gap-3">
          <button className={primaryBtn} onClick={download}>Exportar JSON</button>
          <button className={ghostBtn} onClick={() => fileRef.current?.click()}>Importar JSON</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          <button
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 cursor-pointer"
            onClick={() => window.confirm('Apagar TODAS as alterações e voltar ao original?') && (resetAll(), setMsg({ kind: 'ok', text: 'Dados restaurados.' }))}
          >
            Restaurar original
          </button>
        </div>
      </Card>
      <Card title="Senha do painel">
        <div className="flex flex-wrap gap-3 max-w-md">
          <input type="password" className={inputCls} placeholder="Nova senha (mín. 6)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button
            className={primaryBtn}
            onClick={() => {
              if (pw.length < 6) return setMsg({ kind: 'error', text: 'A senha precisa ter ao menos 6 caracteres.' });
              changeAdminPassword(pw);
              setPw('');
              setMsg({ kind: 'ok', text: 'Senha alterada.' });
            }}
          >
            Alterar
          </button>
        </div>
      </Card>
    </div>
  );
};
