import React, { useMemo, useRef, useState } from 'react';
import { CATALOG_PRODUCTS } from '../../data/mockData';
import { EyewearProduct } from '../../types';
import {
  createProduct,
  deleteProduct,
  fileToDataUrl,
  getRemovedProducts,
  isCustomProduct,
  restoreProduct,
  saveProduct,
  useSiteData,
} from '../../lib/siteStore';
import { Card, Field, fmtBRL, ghostBtn, inputCls, Modal, Notice, primaryBtn, STORAGE_FULL_MSG } from './ui';

const CATEGORIES: { value: EyewearProduct['category']; label: string }[] = [
  { value: 'armacoes', label: 'Armações' },
  { value: 'oculos-de-sol', label: 'Óculos de Sol' },
  { value: 'lentes-de-grau', label: 'Lentes de Grau' },
  { value: 'rayban-meta', label: 'Ray-Ban Meta' },
];

const FORM_TABS = [
  { id: 'photos', label: 'Fotos', icon: 'photo_library' },
  { id: 'details', label: 'Detalhes', icon: 'tune' },
  { id: 'specs', label: 'Especificações', icon: 'straighten' },
] as const;

const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const blankProduct = (): EyewearProduct => ({
  id: '',
  name: '',
  category: 'armacoes',
  brand: 'Óticas Brasil Atelier',
  price: 0,
  rating: 5,
  reviewCount: 0,
  image: '',
  gallery: [],
  colorName: 'Preto',
  colorHex: '#1e1e1e',
  availableColors: [{ name: 'Preto', hex: '#1e1e1e' }],
  material: '',
  shape: '',
  calibre: 'M (50mm)',
  availableCalibres: ['P (48mm)', 'M (50mm)', 'G (52mm)'],
  description: '',
  fullStory: '',
  specs: { lensWidth: '', bridgeWidth: '', templeLength: '', weight: '', hingeType: '', origin: '' },
});

const ProductForm: React.FC<{ initial: EyewearProduct; isNew: boolean; onClose: () => void; onDelete?: () => void }> = ({ initial, isNew, onClose, onDelete }) => {
  const [p, setP] = useState<EyewearProduct>(initial);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EyewearProduct>(key: K, value: EyewearProduct[K]) => setP((prev) => ({ ...prev, [key]: value }));
  const setSpec = (key: keyof EyewearProduct['specs'], value: string) =>
    setP((prev) => ({ ...prev, specs: { ...prev.specs, [key]: value } }));

  const gallery = p.gallery.length ? p.gallery : p.image ? [p.image] : [];

  const setGallery = (next: string[]) => setP((prev) => ({ ...prev, gallery: next, image: next[0] ?? '' }));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => fileToDataUrl(f)));
      setGallery([...gallery, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao processar a imagem');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    setGallery([...gallery, url]);
    setUrlInput('');
  };

  const moveFoto = (from: number, to: number) => {
    if (from === to || to < 0 || to >= gallery.length) return;
    const next = [...gallery];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setGallery(next);
  };
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!p.name.trim()) return setError('Informe o nome do produto.');
    if (!(p.price > 0)) return setError('Informe um preço maior que zero.');
    if (!gallery.length) return setError('Adicione ao menos uma foto.');

    const next: EyewearProduct = {
      ...p,
      name: p.name.trim(),
      image: gallery[0],
      gallery,
      originalPrice: p.originalPrice && p.originalPrice > p.price ? p.originalPrice : undefined,
      badge: p.badge?.trim() || undefined,
      availableColors: p.availableColors.some((c) => c.name === p.colorName)
        ? p.availableColors.map((c) => (c.name === p.colorName ? { ...c, hex: p.colorHex } : c))
        : [{ name: p.colorName, hex: p.colorHex }, ...p.availableColors],
    };

    if (isNew) {
      let id = slugify(next.name) || `produto-${Date.now()}`;
      if (CATALOG_PRODUCTS.some((x) => x.id === id)) id = `${id}-${Date.now().toString(36)}`;
      next.id = id;
    }

    const ok = isNew ? createProduct(next) : saveProduct(next);
    if (!ok) return setError(STORAGE_FULL_MSG);
    onClose();
  };

  const num = (v: string) => (v === '' ? 0 : Number(v));
  const discountPct = p.originalPrice && p.originalPrice > p.price && p.price > 0 ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const applyPercent = (pct: number) => {
    const base = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price;
    if (!(base > 0)) return;
    if (!(pct > 0)) return setP((prev) => ({ ...prev, price: base, originalPrice: undefined }));
    const safe = Math.min(pct, 95);
    setP((prev) => ({ ...prev, originalPrice: base, price: Math.round(base * (1 - safe / 100) * 100) / 100 }));
  };
  const [tab, setTab] = useState<(typeof FORM_TABS)[number]['id']>('photos');
  const tabCls = (id: string) => (tab === id ? 'admin-tab-enter' : 'hidden');
  const show = (id: string) => (tab === id ? 'admin-tab-enter' : 'hidden');

  return (
    <Modal title={isNew ? 'Novo produto' : 'Editar produto'} onClose={onClose} wide flush>
      <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
        <div className="flex gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-5 pb-4 shrink-0">
          <div className="hidden sm:flex w-[72px] h-[72px] shrink-0 rounded-2xl overflow-hidden bg-[#eceef0] border border-[#eceef0] flex items-center justify-center">
            {gallery[0] ? <img src={gallery[0]} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[#b0b3ba] text-3xl">image</span>}
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-12 gap-x-3 gap-y-2.5">
            <Field label="Nome" className="col-span-2 md:col-span-6">
              <input className={`${inputCls} !py-2`} value={p.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Marca" className="col-span-1 md:col-span-3">
              <input className={`${inputCls} !py-2`} value={p.brand} onChange={(e) => set('brand', e.target.value)} />
            </Field>
            <Field label="Categoria" className="col-span-1 md:col-span-3">
              <select className={`${inputCls} !py-2`} value={p.category} onChange={(e) => set('category', e.target.value as EyewearProduct['category'])}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Preço (R$)" className="col-span-1 md:col-span-3">
              <input type="number" min={0} step="0.01" className={`${inputCls} !py-2`} value={p.price || ''} onChange={(e) => set('price', num(e.target.value))} />
            </Field>
            <Field label="Preço original (R$)" className="col-span-1 md:col-span-3">
              <input type="number" min={0} step="0.01" className={`${inputCls} !py-2`} value={p.originalPrice ?? ''} onChange={(e) => set('originalPrice', e.target.value === '' ? undefined : num(e.target.value))} />
            </Field>
            <Field label="Desconto (%)" className="col-span-1 md:col-span-2">
              <input
                type="number"
                min={0}
                max={95}
                step="1"
                placeholder="0"
                className={`${inputCls} !py-2`}
                value={discountPct || ''}
                onChange={(e) => applyPercent(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </Field>
            <Field label="Selo" className="col-span-2 md:col-span-4">
              <input className={`${inputCls} !py-2`} placeholder="Ex.: Mais Vendido" value={p.badge ?? ''} onChange={(e) => set('badge', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex gap-1 px-4 sm:px-6 overflow-x-auto border-b border-[#eceef0] shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FORM_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
                tab === t.id ? 'border-[#061748] text-[#061748]' : 'border-transparent text-[#767680] hover:text-[#061748]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="px-4 sm:px-6 pt-4 shrink-0"><Notice kind="error">{error}</Notice></div>}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 bg-[#f7f9fb]">
        <div className={tabCls('photos')}>
          <p className="text-xs text-[#767680] mb-3">
            Esta é a ordem em que as fotos aparecem na página do produto. A foto 1 é a principal. Arraste as fotos para reordenar.
          </p>
          <div className="grid grid-cols-2 min-[420px]:grid-cols-3 md:grid-cols-5 gap-3">
            {gallery.map((src, i) => (
              <div
                key={`${i}-${src.slice(-20)}`}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIdx(i);
                }}
                onDrop={() => {
                  if (dragIdx !== null) moveFoto(dragIdx, i);
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-[#eceef0] cursor-grab active:cursor-grabbing transition-all ${
                  dragIdx === i ? 'opacity-40 border-[#4156b8] scale-95' : overIdx === i ? 'border-[#4156b8]' : 'border-transparent'
                }`}
              >
                <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
                <span className="absolute top-1.5 left-1.5 min-w-6 h-6 px-1.5 rounded-full bg-[#061748] text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-[#dbee2c] text-[#061748] text-[9px] font-black uppercase px-2 py-1 rounded-full">Principal</span>
                )}
                <button
                  type="button"
                  draggable={false}
                  onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}
                  title="Remover foto"
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-red-600 shadow flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-[#c6c5d0] text-[#767680] hover:border-[#4156b8] hover:text-[#4156b8] transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined">{uploading ? 'hourglass_top' : 'add_photo_alternate'}</span>
              <span className="text-[11px] font-bold">{uploading ? 'Enviando...' : 'Enviar foto'}</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <div className="flex gap-2 mt-3">
            <input
              className={inputCls}
              placeholder="ou cole o link de uma imagem (https://...)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
            />
            <button type="button" onClick={addUrl} className={ghostBtn}>Adicionar</button>
          </div>
        </div>

        <div className={`grid md:grid-cols-6 gap-5 ${show('details')}`}>
          <Field label="Cor principal" className="md:col-span-2">
            <input className={inputCls} value={p.colorName} onChange={(e) => set('colorName', e.target.value)} />
          </Field>
          <Field label="Cor (código)" className="md:col-span-2">
            <div className="flex gap-2">
              <input type="color" className="h-[42px] w-14 rounded-xl border border-[#c6c5d0] bg-white p-1 cursor-pointer" value={p.colorHex} onChange={(e) => set('colorHex', e.target.value)} />
              <input className={inputCls} value={p.colorHex} onChange={(e) => set('colorHex', e.target.value)} />
            </div>
          </Field>
          <Field label="Formato" className="md:col-span-2">
            <input className={inputCls} value={p.shape} onChange={(e) => set('shape', e.target.value)} />
          </Field>
          <Field label="Material" className="md:col-span-3">
            <input className={inputCls} value={p.material} onChange={(e) => set('material', e.target.value)} />
          </Field>
          <Field label="Calibres disponíveis" hint="Separados por vírgula" className="md:col-span-3">
            <input
              className={inputCls}
              value={p.availableCalibres.join(', ')}
              onChange={(e) => {
                const list = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                setP((prev) => ({ ...prev, availableCalibres: list, calibre: list.includes(prev.calibre) ? prev.calibre : list[0] ?? prev.calibre }));
              }}
            />
          </Field>
          <Field label="Descrição curta" className="md:col-span-6">
            <textarea rows={2} className={inputCls} value={p.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="História completa" className="md:col-span-6">
            <textarea rows={3} className={inputCls} value={p.fullStory ?? ''} onChange={(e) => set('fullStory', e.target.value)} />
          </Field>
        </div>

        <div className={tabCls('specs')}>
          <h4 className="text-sm font-bold text-[#061748] mb-3">Especificações técnicas</h4>
          <div className="grid md:grid-cols-3 gap-5">
            <Field label="Largura da lente"><input className={inputCls} value={p.specs.lensWidth} onChange={(e) => setSpec('lensWidth', e.target.value)} /></Field>
            <Field label="Ponte"><input className={inputCls} value={p.specs.bridgeWidth} onChange={(e) => setSpec('bridgeWidth', e.target.value)} /></Field>
            <Field label="Haste"><input className={inputCls} value={p.specs.templeLength} onChange={(e) => setSpec('templeLength', e.target.value)} /></Field>
            <Field label="Peso"><input className={inputCls} value={p.specs.weight} onChange={(e) => setSpec('weight', e.target.value)} /></Field>
            <Field label="Charneira"><input className={inputCls} value={p.specs.hingeType} onChange={(e) => setSpec('hingeType', e.target.value)} /></Field>
            <Field label="Origem"><input className={inputCls} value={p.specs.origin} onChange={(e) => setSpec('origin', e.target.value)} /></Field>
          </div>
        </div>

        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center px-4 sm:px-6 py-4 border-t border-[#eceef0] bg-white shrink-0">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer sm:mr-auto"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Excluir produto
            </button>
          )}
          <button type="button" onClick={onClose} className={`${ghostBtn} ${onDelete ? '' : 'sm:ml-auto'}`}>Cancelar</button>
          <button type="submit" className={primaryBtn}>{isNew ? 'Criar produto' : 'Salvar alterações'}</button>
        </div>
      </form>
    </Modal>
  );
};

export const ProductsTab: React.FC = () => {
  useSiteData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<{ product: EyewearProduct; isNew: boolean } | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const q = query.trim().toLowerCase();
  const products = CATALOG_PRODUCTS.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.id.includes(q))
  );
  const removed = useMemo(() => getRemovedProducts(), [products.length, CATALOG_PRODUCTS.length]);

  const remove = (p: EyewearProduct) => {
    if (!window.confirm(`Excluir "${p.name}" do site?`)) return;
    const ok = deleteProduct(p.id);
    if (ok) setEditing(null);
    setMessage(ok ? { kind: 'ok', text: 'Produto excluído.' } : { kind: 'error', text: STORAGE_FULL_MSG });
  };

  return (
    <div className="space-y-5">
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <Card
        title="Produtos"
        subtitle={`${CATALOG_PRODUCTS.length} produtos no catálogo`}
        action={
          <button onClick={() => setEditing({ product: blankProduct(), isNew: true })} className={primaryBtn}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo produto
          </button>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8d96] text-[18px]">search</span>
            <input className={`${inputCls} pl-9`} placeholder="Buscar por nome ou marca..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className={`${inputCls} sm:w-56`} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Todas as categorias</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#767680]">
                <th className="px-2 py-2 font-bold">Produto</th>
                <th className="px-2 py-2 font-bold">Categoria</th>
                <th className="px-2 py-2 font-bold">Preço</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const discount = p.originalPrice && p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setEditing({ product: p, isNew: false })}
                    className="border-t border-[#eceef0] hover:bg-[#f2f5ff] transition-colors cursor-pointer"
                  >
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt="" className="w-20 h-14 rounded-xl object-cover bg-[#eceef0] border border-[#eceef0]" />
                        <div className="min-w-0">
                          <p className="font-bold text-[#061748] truncate max-w-[180px] lg:max-w-[260px]">{p.name}</p>
                          <p className="text-[11px] text-[#767680]">{p.brand}{isCustomProduct(p.id) && ' • novo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-[11px] font-bold bg-[#eef1fb] text-[#4156b8] px-2.5 py-1 rounded-full">{categoryLabel(p.category)}</span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="font-bold text-[#061748]">{fmtBRL(p.price)}</span>
                      {discount > 0 && (
                        <span className="ml-2 text-[10px] font-black bg-[#C4D600] text-[#061748] px-2 py-0.5 rounded-full">-{discount}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center text-sm text-[#767680] py-10">Nenhum produto encontrado.</p>}
        </div>
      </Card>

      {removed.length > 0 && (
        <Card title="Produtos excluídos" subtitle="Restaure se excluiu por engano.">
          <ul className="divide-y divide-[#eceef0]">
            {removed.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-[#45464f]">{p.name}</span>
                <button onClick={() => restoreProduct(p.id)} className="text-xs font-bold text-[#4156b8] hover:underline cursor-pointer">Restaurar</button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && <ProductForm initial={editing.product} isNew={editing.isNew} onClose={() => setEditing(null)} onDelete={editing.isNew ? undefined : () => remove(editing.product)} />}
    </div>
  );
};

