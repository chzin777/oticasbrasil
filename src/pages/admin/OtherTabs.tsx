import React, { useRef, useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import { AVAILABLE_COUPONS, Coupon } from '../../data/mockData';
import { THEME_CONFIG } from '../../components/HeroCapa';
import {
  CustomBanner,
  deleteCoupon,
  deleteCustomBanner,
  BannerImages,
  HeroTexts,
  HeroTheme,
  saveCoupon,
  saveThemeBanner,
  SITE_CONFIG,
  setActiveBanner,
  useSiteData,
} from '../../lib/siteStore';
import { Card, Field, fmtBRL, ghostBtn, inputCls, Modal, Notice, Pagination, primaryBtn, STORAGE_FULL_MSG } from './ui';
import { ConfirmDialog } from './controls';
import BannerCanvasEditor from './BannerCanvasEditor';

type Msg = { kind: 'ok' | 'error'; text: string } | null;

export { default as DiscountsTab } from './DiscountPoliciesTab';

const blankCoupon = (): Coupon => ({ discountPercent: 10, desc: '', active: true });

export const CouponsTab: React.FC = () => {
  useSiteData();
  const toast = useToast();
  const [editing, setEditing] = useState<{ code: string; coupon: Coupon; prev?: string } | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const coupons = Object.entries(AVAILABLE_COUPONS);
  const pageCount = Math.max(1, Math.ceil(coupons.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleCoupons = coupons.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const code = editing.code.trim().toUpperCase();
    const c = editing.coupon;
    if (!code) return toast.error('Código obrigatório', 'Informe o código do cupom.');
    if (code !== editing.prev && AVAILABLE_COUPONS[code]) return toast.error('Cupom já existe', 'Já existe um cupom com esse código.');
    if (!(c.discountPercent || c.discountAmount)) return toast.error('Desconto obrigatório', 'Informe um desconto para o cupom.');
    if (c.discountPercent && c.discountPercent > 100) return toast.error('Desconto inválido', 'O percentual máximo é 100%.');
    const clean: Coupon = { ...c, minSubtotal: c.minSubtotal || undefined, expiresAt: c.expiresAt || undefined };
    const isNew = !editing.prev;
    if (!saveCoupon(code, clean, editing.prev)) {
      toast.error('Não foi possível salvar o cupom', STORAGE_FULL_MSG);
      return;
    }
    setEditing(null);
    setPage(isNew ? Math.ceil(Object.keys(AVAILABLE_COUPONS).length / pageSize) : 1);
    toast.success(isNew ? 'Cupom criado' : 'Cupom atualizado', code);
  };

  const patch = (p: Partial<Coupon>) => setEditing((prev) => (prev ? { ...prev, coupon: { ...prev.coupon, ...p } } : prev));
  const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

  const confirmDeleteCoupon = () => {
    if (!couponToDelete) return;
    setDeleting(true);
    try {
      if (!deleteCoupon(couponToDelete)) {
        toast.error('Não foi possível excluir o cupom', STORAGE_FULL_MSG);
        return;
      }
      toast.success('Cupom excluído', couponToDelete);
      setCouponToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Card
        title="Cupons"
        subtitle="Usados no resumo do pedido."
        action={
          <button className={primaryBtn} onClick={() => { setEditing({ code: '', coupon: blankCoupon() }); }}>
            <span className="material-symbols-outlined text-[18px]">add</span>Novo cupom
          </button>
        }
      >
        <ul className="grid gap-3">
          {visibleCoupons.map(([code, c]) => (
            <li key={code}>
              <div className={`flex items-center gap-2 rounded-2xl border border-dashed p-2 ${c.active === false ? 'border-[#c6c5d0] bg-[#f7f9fb] opacity-70' : 'border-[#4156b8]/40 bg-[#f4f6ff]'}`}>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4156b8]"
                  onClick={() => { setEditing({ code, coupon: { ...c }, prev: code }); }}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#061748] text-center text-sm font-black leading-tight text-[#dbee2c]">
                    {c.discountPercent ? `${c.discountPercent}%` : 'R$'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black tracking-wider text-[#061748]">
                      {code}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${c.active === false ? 'bg-[#eceef0] text-[#767680]' : 'bg-[#C4D600] text-[#061748]'}`}>
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
                <button
                  type="button"
                  aria-label={`Excluir cupom ${code}`}
                  title={`Excluir cupom ${code}`}
                  onClick={() => setCouponToDelete(code)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:cursor-pointer hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
        {coupons.length === 0 && <p className="text-sm text-[#767680]">Nenhum cupom.</p>}
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={coupons.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </Card>

      {editing && (
        <Modal title={editing.prev ? 'Editar cupom' : 'Novo cupom'} onClose={() => setEditing(null)}>
          <form onSubmit={submit} className="space-y-5">
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
      {couponToDelete && (
        <ConfirmDialog
          title="Excluir cupom?"
          heading="O cupom deixará de estar disponível"
          message="Essa ação remove o cupom da loja e não pode ser desfeita."
          subjectLabel="Cupom selecionado"
          subject={couponToDelete}
          confirmLabel="Excluir cupom"
          cancelLabel="Manter cupom"
          busy={deleting}
          onConfirm={confirmDeleteCoupon}
          onClose={() => setCouponToDelete(null)}
        />
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
  const toast = useToast();
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
    if (ok) toast.success('Tema atualizado', title);
    else toast.error('Não foi possível salvar o tema', STORAGE_FULL_MSG);
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

const CustomBannerPreview: React.FC<{ banner: CustomBanner }> = ({ banner }) => (
  <div
    className="relative aspect-[16/6] min-h-28 overflow-hidden rounded-xl bg-[#061748] text-white"
    style={{
      backgroundColor: banner.canvasBackgroundColor || '#061748',
      backgroundImage: banner.images.background ? `url("${banner.images.background}")` : undefined,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      containerType: 'inline-size',
    }}
  >
    {banner.images.background && <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />}
    {(banner.elements ?? []).length > 0 ? (
      banner.elements?.map((element) => (
        <div
          key={element.id}
          className="absolute flex items-center justify-center overflow-hidden whitespace-pre-wrap text-center leading-tight"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            transform: `rotate(${element.rotation ?? 0}deg)`,
            color: element.color || '#fff',
            backgroundColor: element.type === 'shape' || element.type === 'button' ? element.backgroundColor : undefined,
            borderRadius: element.type === 'shape' && element.shape === 'circle' ? '50%' : `${element.borderRadius ?? 0}px`,
            fontSize: `${((element.fontSize ?? 24) / 1440) * 100}cqw`,
            fontWeight: element.fontWeight ?? 700,
          }}
        >
          {(element.type === 'image' || element.type === 'logo') && element.src
            ? <img src={element.src} alt="" className="h-full w-full object-contain" />
            : (element.type === 'text' || element.type === 'button') ? element.text : null}
        </div>
      ))
    ) : (
      <div className="absolute inset-0 flex flex-col justify-center p-[6%]">
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#dbee2c]">{banner.hero.brandBadge || 'ÓTICAS BRASIL'}</span>
        <span className="mt-1 max-w-[70%] text-[clamp(12px,3cqw,24px)] font-black leading-tight">
          {banner.hero.headlineCom || 'Sua próxima composição começa aqui'}
        </span>
        <span className="mt-1 text-[clamp(9px,1.6cqw,14px)] text-white/80">{banner.hero.subtitle || 'Um banner pronto para personalizar'}</span>
      </div>
    )}
    <span className="absolute bottom-2 right-2 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[9px] font-semibold text-white/85 backdrop-blur-sm">
      {banner.elements?.length ?? 0} {(banner.elements?.length ?? 0) === 1 ? 'elemento' : 'elementos'}
    </span>
  </div>
);

export const BannersTab: React.FC = () => {
  useSiteData();
  const toast = useToast();
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
    const saved = setActiveBanner(next);
    setMsg(saved ? { kind: 'ok', text: 'Exibição dos banners atualizada.' } : { kind: 'error', text: STORAGE_FULL_MSG });
    if (saved) toast.success('Banner atualizado', 'A campanha em exibição foi alterada.');
    else toast.error('Não foi possível atualizar o banner', STORAGE_FULL_MSG);
  };

  const activeBanner = SITE_CONFIG.customBanners.find((banner) => banner.id === SITE_CONFIG.activeBannerId);
  const activeLabel = activeBanner?.name
    || (SITE_CONFIG.activeBannerId === 'default' ? 'Banner padrão'
      : SITE_CONFIG.activeBannerId === 'blackfriday' ? 'Banner Black Friday'
        : SITE_CONFIG.activeBannerId === '__rotation__' ? 'Alternância automática'
          : 'Alternância atual da loja');

  return (
    <div className="space-y-6">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#061748] via-[#10265e] to-[#263e83] px-5 py-6 text-white shadow-[0_16px_40px_rgba(6,23,72,0.16)] sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full bg-[#dbee2c]/10 blur-3xl" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#e7f17a]">
              <span className="material-symbols-outlined text-[15px]">campaign</span>
              Marketing da loja
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Banners e vitrines</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
              Controle o banner em exibição, crie campanhas personalizadas e mantenha a comunicação da loja sempre atualizada.
            </p>
          </div>
          <button type="button" className={`${primaryBtn} shrink-0 !rounded-xl !bg-[#dbee2c] !px-5 !py-3 !text-[#061748] shadow-lg shadow-black/10 hover:!bg-[#e8f56b]`} onClick={() => setCanvasBanner(null)}>
            <span className="material-symbols-outlined text-[19px]">add</span>
            Criar banner
          </button>
        </div>
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="h-2 w-2 rounded-full bg-[#dbee2c] shadow-[0_0_12px_rgba(219,238,44,0.7)]" />
            Em exibição: <strong className="max-w-[220px] truncate text-white">{activeLabel}</strong>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="material-symbols-outlined text-[16px] text-white/50">wallpaper</span>
            {SITE_CONFIG.customBanners.length} {SITE_CONFIG.customBanners.length === 1 ? 'banner personalizado' : 'banners personalizados'}
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <div className="overflow-hidden rounded-2xl border border-[#e5e9f0] bg-white shadow-[0_2px_10px_rgba(20,35,68,0.04)]">
          <div className="flex items-start gap-3 border-b border-[#edf0f5] px-5 py-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef1fb] text-[#4156b8]">
              <span className="material-symbols-outlined">visibility</span>
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#142344]">Banner em exibição</h2>
              <p className="mt-1 text-xs text-[#7b8497]">Escolha a campanha que aparece na página inicial.</p>
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] md:items-center">
            <div className="overflow-hidden rounded-xl border border-[#e6eaf0] bg-[#f5f7fb]">
              {activeBanner ? (
                <CustomBannerPreview banner={activeBanner} />
              ) : (
                <div className="flex aspect-[16/6] min-h-28 items-center justify-center gap-3 bg-gradient-to-br from-[#071a45] to-[#263e83] px-4 text-center text-white">
                  <span className="material-symbols-outlined text-3xl text-[#dbee2c]">auto_awesome</span>
                  <div>
                    <p className="text-sm font-bold">{activeLabel}</p>
                    <p className="mt-1 text-[11px] text-white/65">A loja alterna entre os temas configurados.</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Field label="Selecionar campanha">
                <CustomSelect
                  className={inputCls}
                  value={SITE_CONFIG.activeBannerId ?? ''}
                  onChange={changeActiveBanner}
                  options={[
                    { value: '', label: 'Alternância atual da loja' },
                    { value: 'default', label: 'Banner padrão' },
                    { value: 'blackfriday', label: 'Banner Black Friday' },
                    ...SITE_CONFIG.customBanners.map((banner) => ({ value: banner.id, label: banner.name || 'Banner sem nome' })),
                    ...(SITE_CONFIG.customBanners.length > 1
                      ? [{ value: '__rotation__', label: 'Alternar banners personalizados automaticamente' }]
                      : []),
                  ]}
                />
              </Field>
              <p className="mt-3 text-[11px] leading-relaxed text-[#8992a4]">
                A alteração é salva imediatamente e pode ser trocada a qualquer momento.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5e9f0] bg-white p-5 shadow-[0_2px_10px_rgba(20,35,68,0.04)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f5d7] text-[#728000]">
              <span className="material-symbols-outlined">tips_and_updates</span>
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#142344]">Dica de campanha</h2>
              <p className="mt-1 text-xs text-[#7b8497]">Destaque uma mensagem por vez.</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#657087]">
            Use imagens horizontais de boa resolução e chamadas curtas. Você pode criar um layout no canvas e selecionar a campanha assim que salvar.
          </p>
          <button type="button" onClick={() => setCanvasBanner(null)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#4156b8] transition hover:text-[#061748]">
            Abrir estúdio de criação
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#142344]">Meus banners</h2>
            <p className="mt-1 text-sm text-[#7b8497]">Gerencie os layouts criados para as campanhas da loja.</p>
          </div>
          {SITE_CONFIG.customBanners.length > 0 && (
            <span className="rounded-full bg-[#eef1fb] px-3 py-1 text-xs font-semibold text-[#4156b8]">
              {SITE_CONFIG.customBanners.length} {SITE_CONFIG.customBanners.length === 1 ? 'layout' : 'layouts'}
            </span>
          )}
        </div>
        {SITE_CONFIG.customBanners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#ccd4e2] bg-white px-5 py-10 text-center shadow-[0_2px_10px_rgba(20,35,68,0.03)]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef1fb] text-[#4156b8]">
              <span className="material-symbols-outlined text-[28px]">wallpaper</span>
            </span>
            <h3 className="mt-4 text-base font-bold text-[#142344]">Sua biblioteca está vazia</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#7b8497]">Crie seu primeiro banner personalizado para divulgar novidades, ofertas e campanhas.</p>
            <button type="button" className={`${primaryBtn} mt-5`} onClick={() => setCanvasBanner(null)}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Criar primeiro banner
            </button>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {SITE_CONFIG.customBanners.map((banner) => {
              const isActive = SITE_CONFIG.activeBannerId === banner.id;
              return (
                <li key={banner.id} className="group overflow-hidden rounded-2xl border border-[#e5e9f0] bg-white shadow-[0_2px_10px_rgba(20,35,68,0.04)] transition hover:-translate-y-0.5 hover:border-[#c7d0e2] hover:shadow-[0_10px_28px_rgba(20,35,68,0.09)]">
                  <div className="p-3">
                    <CustomBannerPreview banner={banner} />
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-[#142344]">{banner.name || 'Banner sem nome'}</h3>
                        <p className="mt-1 text-xs text-[#8992a4]">
                          {banner.theme === 'blackfriday' ? 'Tema Black Friday' : 'Tema padrão'}
                          <span className="mx-1.5 text-[#c6cbd5]">·</span>
                          {banner.elements?.length ?? 0} elementos
                        </p>
                      </div>
                      {isActive && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f3f7dc] px-2.5 py-1 text-[10px] font-bold text-[#637000]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#a4b400]" />
                          Em exibição
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-[#edf0f5] pt-3">
                      <button type="button" className={`${primaryBtn} flex-1 !py-2`} onClick={() => setCanvasBanner(banner)}>
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                        Editar layout
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${banner.name || 'banner sem nome'}`}
                        title="Excluir banner"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#f0dada] text-[#b54747] transition hover:bg-red-50"
                        onClick={() => {
                          if (!window.confirm(`Excluir o banner "${banner.name}"?`)) return;
                          const deleted = deleteCustomBanner(banner.id);
                          setMsg(deleted ? { kind: 'ok', text: 'Banner excluído.' } : { kind: 'error', text: STORAGE_FULL_MSG });
                          if (deleted) toast.success('Banner excluído', banner.name || 'Banner sem nome');
                          else toast.error('Não foi possível excluir o banner', STORAGE_FULL_MSG);
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 border-t border-[#e5e9f0] pt-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#142344]">Temas da loja</h2>
          <p className="mt-1 text-sm text-[#7b8497]">Personalize os banners padrão que ficam disponíveis na alternância automática.</p>
        </div>
        <details className="group rounded-2xl border border-[#e5e9f0] bg-white shadow-[0_2px_10px_rgba(20,35,68,0.04)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef1fb] text-[#4156b8]">
                <span className="material-symbols-outlined">light_mode</span>
              </span>
              <span>
                <span className="block text-sm font-bold text-[#142344]">Banner padrão</span>
                <span className="mt-1 block text-xs text-[#7b8497]">Identidade visual principal da loja</span>
              </span>
            </span>
            <span className="material-symbols-outlined text-[#8992a4] transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="border-t border-[#edf0f5] p-3 sm:p-5"><ThemeEditor theme="default" title="Banner padrão" /></div>
        </details>
        <details className="group rounded-2xl border border-[#e5e9f0] bg-white shadow-[0_2px_10px_rgba(20,35,68,0.04)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff2e7] text-[#b86627]">
                <span className="material-symbols-outlined">local_fire_department</span>
              </span>
              <span>
                <span className="block text-sm font-bold text-[#142344]">Banner Black Friday</span>
                <span className="mt-1 block text-xs text-[#7b8497]">Tema promocional para campanhas especiais</span>
              </span>
            </span>
            <span className="material-symbols-outlined text-[#8992a4] transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="border-t border-[#edf0f5] p-3 sm:p-5"><ThemeEditor theme="blackfriday" title="Banner Black Friday" /></div>
        </details>
      </section>
    </div>
  );
};
