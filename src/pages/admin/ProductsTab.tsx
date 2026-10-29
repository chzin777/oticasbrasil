import React, { useMemo, useRef, useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import { EyewearProduct } from '../../types';
import {
  createProduct,
  deleteProduct,
  fileToDataUrl,
  getProductTags,
  getRemovedProducts,
  isCustomProduct,
  restoreProduct,
  saveProduct,
  useCatalogProducts,
  useSiteData,
} from '../../lib/siteStore';
import { Card, Field, fmtBRL, ghostBtn, inputCls, Modal, Notice, Pagination, primaryBtn, STORAGE_FULL_MSG } from './ui';

const CATEGORIES: { value: EyewearProduct['category']; label: string }[] = [
  { value: 'armacoes', label: 'Armações' },
  { value: 'oculos-de-sol', label: 'Óculos de Sol' },
  { value: 'lentes-de-grau', label: 'Lentes de Grau' },
  { value: 'rayban-meta', label: 'Ray-Ban Meta' },
];

const PRODUCT_STEPS = [
  { id: 'basics', label: 'Informações', icon: 'edit_note', description: 'Nome, categoria e preço' },
  { id: 'photos', label: 'Fotos', icon: 'photo_library', description: 'Adicione e organize as imagens' },
  { id: 'details', label: 'Detalhes', icon: 'tune', description: 'Características e descrição' },
  { id: 'specs', label: 'Especificações', icon: 'straighten', description: 'Medidas e informações técnicas' },
  { id: 'seo', label: 'SEO', icon: 'travel_explore', description: 'Como o produto aparece nas buscas' },
] as const;

const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

const formatPriceInput = (value: number) =>
  value > 0
    ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const priceFromDigits = (digits: string) => Number(digits || '0') / 100;

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
  seoTitle: '',
  seoDescription: '',
  specs: { lensWidth: '', bridgeWidth: '', templeLength: '', weight: '', hingeType: '', origin: '' },
});

const ProductForm: React.FC<{ initial: EyewearProduct; isNew: boolean; onClose: () => void; onSaved: (isNew: boolean, name: string) => void; onDelete?: () => void }> = ({ initial, isNew, onClose, onSaved, onDelete }) => {
  useSiteData();
  const toast = useToast();
  const [p, setP] = useState<EyewearProduct>(initial);
  const [priceInput, setPriceInput] = useState(() => initial.price > 0 ? formatPriceInput(initial.price) : '0,00');
  const [invalidFields, setInvalidFields] = useState<{ name: boolean; price: boolean; photos: boolean }>({
    name: false,
    price: false,
    photos: false,
  });
  const [selectedTagIds, setSelectedTagIds] = useState(() => getProductTags()
    .filter((tag) => tag.assignedProductIds?.includes(initial.id))
    .map((tag) => tag.id));
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EyewearProduct>(key: K, value: EyewearProduct[K]) => setP((prev) => ({ ...prev, [key]: value }));
  const setSpec = (key: keyof EyewearProduct['specs'], value: string) =>
    setP((prev) => ({ ...prev, specs: { ...prev.specs, [key]: value } }));

  const gallery = p.gallery.length ? p.gallery : p.image ? [p.image] : [];

  const setGallery = (next: string[]) => setP((prev) => ({ ...prev, gallery: next, image: next[0] ?? '' }));

  const clearInvalidField = (field: keyof typeof invalidFields) => {
    setInvalidFields((current) => current[field] ? { ...current, [field]: false } : current);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => fileToDataUrl(f)));
      setGallery([...gallery, ...urls]);
      clearInvalidField('photos');
    } catch (e) {
      toast.error('Não foi possível adicionar as imagens', e instanceof Error ? e.message : 'Falha ao processar a imagem');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    setGallery([...gallery, url]);
    clearInvalidField('photos');
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
    if (isNew && step !== PRODUCT_STEPS.length - 1) {
      if (step === 0) {
        const missingName = !p.name.trim();
        const missingPrice = !(p.price > 0);
        setInvalidFields((current) => ({ ...current, name: missingName, price: missingPrice }));
        if (missingName || missingPrice) {
          const missing = [
            ...(missingName ? ['nome'] : []),
            ...(missingPrice ? ['preço'] : []),
          ];
          toast.error('Revise os campos obrigatórios', `Preencha ${missing.join(' e ')} para continuar.`);
          return;
        }
      }
      if (step === 1 && !gallery.length) {
        setInvalidFields((current) => ({ ...current, photos: true }));
        toast.error('Foto obrigatória', 'Adicione ao menos uma foto para continuar.');
        return;
      }
      if (step === 1) clearInvalidField('photos');
      setStep((current) => Math.min(current + 1, PRODUCT_STEPS.length - 1));
      return;
    }
    const missingName = !p.name.trim();
    const missingPrice = !(p.price > 0);
    const missingPhotos = !gallery.length;
    setInvalidFields({ name: missingName, price: missingPrice, photos: missingPhotos });
    if (missingName || missingPrice || missingPhotos) {
      const missing = [
        ...(missingName ? ['nome'] : []),
        ...(missingPrice ? ['preço'] : []),
        ...(missingPhotos ? ['ao menos uma foto'] : []),
      ];
      toast.error('Revise os campos obrigatórios', `Preencha ${missing.join(', ')} antes de salvar.`);
      return;
    }

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
      if (catalogProducts.some((x) => x.id === id)) id = `${id}-${Date.now().toString(36)}`;
      next.id = id;
    }

    const ok = isNew ? createProduct(next, selectedTagIds) : saveProduct(next, selectedTagIds);
    if (!ok) {
      toast.error('Não foi possível salvar o produto', STORAGE_FULL_MSG);
      return;
    }
    onSaved(isNew, next.name);
    onClose();
  };

  const num = (v: string) => (v === '' ? 0 : Number(v));
  const discountPct = p.originalPrice && p.originalPrice > p.price && p.price > 0 ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const applyPercent = (pct: number) => {
    const base = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price;
    if (!(base > 0)) return;
    if (!(pct > 0)) {
      setPriceInput(formatPriceInput(base) || '0,00');
      return setP((prev) => ({ ...prev, price: base, originalPrice: undefined }));
    }
    const safe = Math.min(pct, 95);
    const price = Math.round(base * (1 - safe / 100) * 100) / 100;
    setPriceInput(formatPriceInput(price) || '0,00');
    setP((prev) => ({ ...prev, originalPrice: base, price }));
  };
  const [step, setStep] = useState(0);
  const [editTab, setEditTab] = useState<(typeof PRODUCT_STEPS)[number]['id']>('basics');
  const activeStep = PRODUCT_STEPS[step];
  const stepCls = (id: string) => {
    if (!isNew) return editTab === id ? 'admin-tab-enter' : 'hidden';
    return activeStep.id === id ? 'admin-tab-enter' : 'hidden';
  };
  const goToStep = (index: number) => {
    if (index < step) {
      setStep(index);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Voltar para produtos" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e5ec] bg-white text-[#566176] transition hover:cursor-pointer hover:bg-[#f7f8fa]">
            <span className="material-symbols-outlined text-[19px]">arrow_back</span>
          </button>
          <div>
            <p className="text-[11px] font-medium text-[#8992a4]">Produtos <span className="mx-1 text-[#c6cbd5]">/</span> {isNew ? 'Novo produto' : 'Editar produto'}</p>
            <h2 className="mt-0.5 text-lg font-semibold text-[#142344]">{isNew ? 'Cadastrar produto' : 'Editar produto'}</h2>
          </div>
        </div>
        {isNew && (
          <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-[#737d91] ring-1 ring-[#e8ebf1]">
            Etapa {step + 1} de {PRODUCT_STEPS.length}
          </span>
        )}
      </div>

      {isNew && <div className="rounded-2xl border border-[#e8ebf1] bg-white px-3 py-4 shadow-[0_1px_3px_rgba(20,35,68,0.04)] sm:px-6">
        <div className="relative">
          <div className="absolute left-[10%] right-[10%] top-4 h-0.5 rounded-full bg-[#e5e9f0] sm:top-[18px]">
            <div
              className="h-full rounded-full bg-[#4156b8] transition-[width] duration-300 ease-out"
              style={{ width: `${(step / (PRODUCT_STEPS.length - 1)) * 100}%` }}
            />
          </div>
        <ol className="relative flex items-start">
          {PRODUCT_STEPS.map((item, index) => {
            const completed = index < step;
            const current = index === step;
            const state = current ? 'current' : completed ? 'completed' : 'upcoming';
            return (
              <li key={item.id} data-step-state={state} className="flex min-w-0 flex-1 flex-col items-center">
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  disabled={!completed}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`${item.label}: ${current ? 'etapa atual' : completed ? 'concluída' : 'pendente'}`}
                  className={`relative z-[2] flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 sm:h-9 sm:w-9 ${
                    current
                      ? 'scale-110 border-[#071a45] bg-[#071a45] text-white ring-4 ring-[#eef1fb]'
                      : completed
                        ? 'border-[#4156b8] bg-[#4156b8] text-white hover:cursor-pointer'
                        : 'border-[#dfe3ea] bg-white text-[#929bad]'
                  } disabled:cursor-default`}
                >
                  <span className="material-symbols-outlined text-[17px]">{completed ? 'check' : item.icon}</span>
                </button>
                <span className={`mt-2 max-w-full truncate text-center text-[10px] font-medium sm:text-xs ${current ? 'text-[#142344]' : completed ? 'text-[#4156b8]' : 'text-[#929bad]'}`}>
                  {item.label}
                </span>
                <span className={`mt-0.5 text-[9px] font-semibold sm:text-[10px] ${current ? 'text-[#4156b8]' : completed ? 'text-[#7a86b5]' : 'text-transparent'}`}>
                  {current ? 'Atual' : completed ? 'Concluída' : 'Pendente'}
                </span>
              </li>
            );
          })}
        </ol>
        </div>
      </div>}

      {!isNew && (
        <nav aria-label="Seções do produto" className="flex gap-1 overflow-x-auto rounded-xl border border-[#e8ebf1] bg-white p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRODUCT_STEPS.map((item) => {
            const active = editTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setEditTab(item.id)}
                className={`inline-flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:cursor-pointer sm:px-4 ${
                  active ? 'bg-[#eef1fb] text-[#344da8]' : 'text-[#737d91] hover:bg-[#f7f8fa] hover:text-[#34415e]'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      )}

      <Card
        title={isNew ? activeStep.label : PRODUCT_STEPS.find((item) => item.id === editTab)?.label}
        subtitle={isNew ? activeStep.description : PRODUCT_STEPS.find((item) => item.id === editTab)?.description}
      >
        <div className={stepCls('basics')}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-12">
            <Field label="Nome" required className="col-span-2 md:col-span-6">
              <input
                autoFocus
                aria-invalid={invalidFields.name}
                className={`${inputCls} ${invalidFields.name ? '!border-red-500 !ring-2 !ring-red-200' : ''}`}
                placeholder="Ex.: Aura Titanium Round"
                value={p.name}
                onChange={(e) => {
                  set('name', e.target.value);
                  if (e.target.value.trim()) clearInvalidField('name');
                }}
              />
            </Field>
            <Field label="Marca" className="col-span-1 md:col-span-3">
              <input className={inputCls} placeholder="Marca do produto" value={p.brand} onChange={(e) => set('brand', e.target.value)} />
            </Field>
            <Field label="Categoria" className="col-span-1 md:col-span-3">
              <CustomSelect
                className={inputCls}
                value={p.category}
                onChange={(value) => set('category', value)}
                options={CATEGORIES}
              />
            </Field>
            <Field label="Preço (R$)" required className="col-span-1 md:col-span-3">
              <input
                type="text"
                inputMode="decimal"
                aria-invalid={invalidFields.price}
                className={`${inputCls} ${invalidFields.price ? '!border-red-500 !ring-2 !ring-red-200' : ''}`}
                placeholder="0,00"
                value={priceInput}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey || e.altKey) return;
                  const input = e.currentTarget;
                  const selectedAll = input.selectionStart === 0 && input.selectionEnd === input.value.length;
                  const currentDigits = selectedAll ? '0' : String(Math.round(p.price * 100));

                  if (/^\d$/.test(e.key)) {
                    e.preventDefault();
                    if (currentDigits.length >= 14) return;
                    const price = priceFromDigits(`${currentDigits}${e.key}`);
                    setPriceInput(formatPriceInput(price) || '0,00');
                    set('price', price);
                    if (price > 0) clearInvalidField('price');
                    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
                    return;
                  }

                  if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                    const digits = selectedAll ? '0' : currentDigits.slice(0, -1) || '0';
                    const price = priceFromDigits(digits);
                    setPriceInput(formatPriceInput(price) || '0,00');
                    set('price', price);
                    if (price > 0) clearInvalidField('price');
                    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').trim();
                  const digits = pasted.replace(/\D/g, '');
                  if (!digits) return;
                  const hasDecimalSeparator = /[,.]/.test(pasted);
                  const price = hasDecimalSeparator
                    ? Number(pasted.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
                    : priceFromDigits(digits);
                  if (!Number.isFinite(price) || price < 0) return;
                  setPriceInput(formatPriceInput(price) || '0,00');
                  set('price', price);
                  if (price > 0) clearInvalidField('price');
                }}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const price = priceFromDigits(digits);
                  setPriceInput(formatPriceInput(price) || '0,00');
                  set('price', price);
                  if (price > 0) clearInvalidField('price');
                }}
              />
            </Field>
            <Field label="Preço original (R$)" className="col-span-1 md:col-span-3">
              <input type="number" min={0} step="0.01" className={inputCls} placeholder="Opcional" value={p.originalPrice ?? ''} onChange={(e) => set('originalPrice', e.target.value === '' ? undefined : num(e.target.value))} />
            </Field>
            <Field label="Desconto (%)" className="col-span-1 md:col-span-2">
              <input
                type="number"
                min={0}
                max={95}
                step="1"
                placeholder="0"
                className={inputCls}
                value={discountPct || ''}
                onChange={(e) => applyPercent(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </Field>
            <Field label="Selo" className="col-span-2 md:col-span-4">
              <input className={inputCls} placeholder="Ex.: Mais Vendido (opcional)" value={p.badge ?? ''} onChange={(e) => set('badge', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className={stepCls('photos')}>
          <p className="text-xs text-[#767680] mb-1">
            Esta é a ordem em que as fotos aparecem na página do produto. A foto 1 é a principal. Arraste as fotos para reordenar.
          </p>
          <p className="mb-3 text-xs font-semibold text-[#596276]">
            Fotos <span className="text-red-600" aria-hidden="true">*</span>
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
              aria-invalid={invalidFields.photos}
              className={`aspect-square rounded-xl border-2 border-dashed text-[#767680] hover:border-[#4156b8] hover:text-[#4156b8] transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer ${
                invalidFields.photos ? 'border-red-500 bg-red-50 text-red-600 ring-2 ring-red-200' : 'border-[#c6c5d0]'
              }`}
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

        <div className={`grid gap-5 md:grid-cols-6 ${stepCls('details')}`}>
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
          <div className="md:col-span-6">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#596276]">Tags do produto</p>
            {getProductTags().length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#d9deea] px-3 py-3 text-xs text-[#8992a4]">
                Nenhuma tag cadastrada. Crie tags na seção Tags do painel.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {getProductTags().map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedTagIds((current) => (
                        selected ? current.filter((id) => id !== tag.id) : [...current, tag.id]
                      ))}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:cursor-pointer ${
                        selected ? 'border-transparent ring-2 ring-[#4156b8]/20' : 'border-[#e1e5ec] bg-white'
                      }`}
                      style={selected ? { backgroundColor: `${tag.color}1A`, color: tag.color } : undefined}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                      {selected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={stepCls('specs')}>
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

        <div className={`${stepCls('seo')} space-y-5`}>
          <div>
            <h4 className="text-sm font-bold text-[#061748]">SEO da página do produto</h4>
            <p className="mt-1 text-xs text-[#767680]">
              Campos opcionais. Se ficarem vazios, o título e a descrição do produto serão usados automaticamente.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Título para buscadores" hint="Ideal: até 60 caracteres">
              <input
                className={inputCls}
                maxLength={70}
                placeholder={p.name ? `${p.name} | Óticas Brasil` : 'Nome do produto | Óticas Brasil'}
                value={p.seoTitle ?? ''}
                onChange={(e) => set('seoTitle', e.target.value)}
              />
              <span className="mt-1 block text-right text-[11px] text-[#8992a4]">{(p.seoTitle ?? '').length}/70</span>
            </Field>
            <Field label="Descrição para buscadores" hint="Resumo exibido nos resultados. Ideal: até 160 caracteres">
              <textarea
                rows={3}
                className={inputCls}
                maxLength={160}
                placeholder={p.description || 'Descreva o produto de forma clara e objetiva.'}
                value={p.seoDescription ?? ''}
                onChange={(e) => set('seoDescription', e.target.value)}
              />
              <span className="mt-1 block text-right text-[11px] text-[#8992a4]">{(p.seoDescription ?? '').length}/160</span>
            </Field>
          </div>
          <div className="rounded-xl border border-[#e4e8f0] bg-white p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8992a4]">Prévia nos resultados</p>
            <p className="truncate text-sm font-medium text-[#1a0dab]">{p.seoTitle?.trim() || (p.name ? `${p.name} | Óticas Brasil` : 'Nome do produto | Óticas Brasil')}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#4d5156]">{p.seoDescription?.trim() || p.description || 'A descrição do produto será usada como resumo nos resultados de busca.'}</p>
          </div>
          <p className="text-xs text-[#767680]">
            A página também usa o endereço do produto como URL canônica e inclui dados estruturados de produto e preço.
          </p>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
            <button type="button" onClick={onClose} className={ghostBtn}>Cancelar</button>
            {isNew && step > 0 && (
              <button type="button" onClick={() => { setStep((current) => Math.max(current - 1, 0)); }} className={ghostBtn}>
                <span className="material-symbols-outlined text-[17px]">arrow_back</span>
                Voltar
              </button>
            )}
            <button type="submit" className={primaryBtn}>
              {isNew && step < PRODUCT_STEPS.length - 1 ? (
                <>Continuar <span className="material-symbols-outlined text-[17px]">arrow_forward</span></>
              ) : (
                <><span className="material-symbols-outlined text-[17px]">check</span>{isNew ? 'Criar produto' : 'Salvar alterações'}</>
              )}
            </button>
          </div>
      </div>
      </div>
    </form>
  );
};

export const ProductsTab: React.FC = () => {
  useSiteData();
  const { products: catalogProducts } = useCatalogProducts();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [editing, setEditing] = useState<{ product: EyewearProduct; isNew: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EyewearProduct | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const q = query.trim().toLowerCase();
  const kpis = [
    { id: 'all', label: 'Todos os produtos', value: catalogProducts.length, icon: 'inventory_2', color: 'blue' },
    { id: 'discounted', label: 'Em promoção', value: catalogProducts.filter((p) => p.originalPrice && p.originalPrice > p.price).length, icon: 'sell', color: 'lime' },
    ...CATEGORIES.map((c) => ({
      id: c.value,
      label: c.label,
      value: catalogProducts.filter((p) => p.category === c.value).length,
      icon: c.value === 'armacoes' ? 'eyeglasses' : c.value === 'oculos-de-sol' ? 'light_mode' : c.value === 'lentes-de-grau' ? 'visibility' : 'smart_toy',
      color: 'blue',
    })),
  ];
  const products = catalogProducts.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      (quickFilter === 'all' ||
        (quickFilter === 'discounted'
          ? Boolean(p.originalPrice && p.originalPrice > p.price)
          : p.category === quickFilter)) &&
      (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.id.includes(q))
  );
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const removed = useMemo(() => getRemovedProducts(), [products.length, catalogProducts.length]);

  const remove = () => {
    if (!confirmDelete) return;
    if (!deleteProduct(confirmDelete.id)) {
      setDeleteError(STORAGE_FULL_MSG);
      toast.error('Não foi possível excluir o produto', STORAGE_FULL_MSG);
      return;
    }
    setConfirmDelete(null);
    setDeleteError(null);
    setEditing(null);
    setMessage({ kind: 'ok', text: 'Produto excluído.' });
    toast.success('Produto excluído', confirmDelete.name);
  };

  if (editing) {
    return (
      <>
        <ProductForm
          initial={editing.product}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSaved={(isNew, name) => toast.success(isNew ? 'Produto criado' : 'Produto atualizado', name)}
          onDelete={editing.isNew ? undefined : () => {
            setDeleteError(null);
            setConfirmDelete(editing.product);
          }}
        />
        {confirmDelete && (
          <Modal title="Excluir produto?" onClose={() => {
            setConfirmDelete(null);
            setDeleteError(null);
          }}>
            <div className="space-y-5">
              {deleteError && <Notice kind="error">{deleteError}</Notice>}
              <div className="flex items-start gap-4 rounded-2xl border border-red-100 bg-red-50/70 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm ring-1 ring-red-100">
                  <span className="material-symbols-outlined text-[22px]">delete_forever</span>
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-[#8f2525]">Esta ação não pode ser desfeita</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#785b5b]">
                    O produto será removido da loja. Produtos do catálogo original podem ser restaurados depois.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#e8ebf1] bg-[#fafbfc] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8992a4]">Produto selecionado</p>
                <p className="mt-1 truncate text-sm font-semibold text-[#24324b]">{confirmDelete.name}</p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[#edf0f5] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={`${ghostBtn} sm:min-w-28`}
                  onClick={() => {
                    setConfirmDelete(null);
                    setDeleteError(null);
                  }}
                >
                  Manter produto
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#b42318] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#912018] focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 sm:min-w-36"
                  onClick={remove}
                >
                  <span className="material-symbols-outlined text-[17px]">delete</span>
                  Excluir produto
                </button>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const active = quickFilter === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setQuickFilter(kpi.id);
                setCategory('all');
                setPage(1);
              }}
              className={`group rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                active ? 'border-[#4156b8] bg-[#f4f6ff] ring-2 ring-[#4156b8]/15' : 'border-[#e8ebf1] bg-white hover:border-[#cbd3e5]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold leading-tight text-[#737d91]">{kpi.label}</span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  kpi.color === 'lime' ? 'bg-[#f4f9d0] text-[#657000]' : 'bg-[#eef1fb] text-[#4156b8]'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
                </span>
              </div>
              <p className="mt-2.5 text-xl font-semibold tracking-tight text-[#142344]">{kpi.value}</p>
              <p className={`mt-1 text-[11px] font-semibold ${active ? 'text-[#4156b8]' : 'text-[#929aad]'}`}>
                {active ? 'Filtro selecionado' : 'Clique para filtrar'}
              </p>
            </button>
          );
        })}
      </div>
      <Card
        title="Produtos"
        subtitle={`${products.length} ${products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`}
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
            <input className={`${inputCls} pl-9`} placeholder="Buscar por nome ou marca..." value={query} onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }} />
          </div>
          <CustomSelect
            className={`${inputCls} sm:w-56`}
            value={category}
            onChange={(value) => {
              setCategory(value);
              setQuickFilter('all');
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Todas as categorias' },
              ...CATEGORIES,
            ]}
          />
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#767680]">
                <th className="px-2 py-2 font-bold">Produto</th>
                <th className="px-2 py-2 font-bold">SKU</th>
                <th className="px-2 py-2 font-bold">Categoria</th>
                <th className="px-2 py-2 font-bold">Subcategoria</th>
                <th className="px-2 py-2 font-bold">Marca</th>
                <th className="px-2 py-2 font-bold">Custo</th>
                <th className="px-2 py-2 font-bold">Estoque</th>
                <th className="px-2 py-2 font-bold">Preço</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => {
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
                      <span className="text-[11px] font-mono text-[#475569]">{p.sku || p.id}</span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-[11px] font-bold bg-[#eef1fb] text-[#4156b8] px-2.5 py-1 rounded-full">{categoryLabel(p.category)}</span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-[11px] text-[#475569] truncate max-w-[120px] block">{p.subcategory || '—'}</span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-[11px] text-[#475569] truncate max-w-[100px] block">{p.brand}</span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-[11px] text-[#767680]">{p.cost != null ? fmtBRL(p.cost) : '—'}</span>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`text-[11px] font-bold ${p.stock != null && p.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {p.stock ?? 0}
                      </span>
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
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={products.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </Card>

      {removed.length > 0 && (
        <Card title="Produtos excluídos" subtitle="Restaure se excluiu por engano.">
          <ul className="divide-y divide-[#eceef0]">
            {removed.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-[#45464f]">{p.name}</span>
                <button onClick={() => {
                  if (restoreProduct(p.id)) toast.success('Produto restaurado', p.name);
                  else toast.error('Não foi possível restaurar o produto', STORAGE_FULL_MSG);
                }} className="text-xs font-bold text-[#4156b8] hover:underline cursor-pointer">Restaurar</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
