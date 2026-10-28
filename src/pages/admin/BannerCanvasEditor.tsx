import React, { useRef, useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import type {
  BannerCanvasElement,
  BannerCanvasElementType,
  BannerImages,
  CustomBanner,
  HeroTheme,
} from '../../lib/siteStore';
import { saveCustomBanner } from '../../lib/siteStore';
import { Card, Field, inputCls, Notice, primaryBtn } from './ui';
import { STORAGE_FULL_MSG } from './ui';

interface BannerCanvasEditorProps {
  initialBanner?: CustomBanner;
  onBack: () => void;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_SIZE = 3;

const RESIZE_HANDLES: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
  { handle: 'nw', style: { left: 0, top: 0 }, cursor: 'nwse-resize' },
  { handle: 'n', style: { left: '50%', top: 0 }, cursor: 'ns-resize' },
  { handle: 'ne', style: { left: '100%', top: 0 }, cursor: 'nesw-resize' },
  { handle: 'e', style: { left: '100%', top: '50%' }, cursor: 'ew-resize' },
  { handle: 'se', style: { left: '100%', top: '100%' }, cursor: 'nwse-resize' },
  { handle: 's', style: { left: '50%', top: '100%' }, cursor: 'ns-resize' },
  { handle: 'sw', style: { left: 0, top: '100%' }, cursor: 'nesw-resize' },
  { handle: 'w', style: { left: 0, top: '50%' }, cursor: 'ew-resize' },
];

const makeId = () => `element-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;

const resizeImage = async (file: File, background: boolean): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, (background ? 1600 : 1000) / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível processar a imagem.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Não foi possível processar a imagem.')),
        background ? 'image/jpeg' : 'image/png',
        background ? 0.82 : undefined,
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

const legacyElements = (banner: CustomBanner): BannerCanvasElement[] => {
  if (banner.elements?.length) return banner.elements;
  const isBlackFriday = banner.theme === 'blackfriday';
  const hero = banner.hero;
  const elements: BannerCanvasElement[] = [];
  const add = (type: BannerCanvasElementType, values: Partial<BannerCanvasElement>) => {
    elements.push({
      id: makeId(),
      type,
      x: 8,
      y: 8,
      width: 28,
      height: 10,
      ...values,
    });
  };

  if (!isBlackFriday) {
    add('logo', { x: 6, y: 8, width: 16, height: 10, src: banner.images.brandLogo, alt: 'Óticas Brasil' });
    if (banner.images.partnerLogo) add('logo', { x: 23, y: 8, width: 12, height: 10, src: banner.images.partnerLogo, alt: 'Marca parceira' });
  }
  add('text', { x: isBlackFriday ? 27 : 7, y: isBlackFriday ? 20 : 27, width: isBlackFriday ? 46 : 42, height: 8, text: hero.brandBadge ?? '', color: '#C4D600', fontSize: 32, fontWeight: 900 });
  add('text', { x: isBlackFriday ? 28 : 7, y: isBlackFriday ? 31 : 38, width: 50, height: 8, text: hero.headlineCom ?? '', color: '#ffffff', fontSize: 34, fontWeight: 900 });
  add('text', { x: isBlackFriday ? 28 : 7, y: isBlackFriday ? 40 : 47, width: 45, height: 14, text: `${hero.headlinePercent ?? ''} ${hero.headlineOff ?? ''}`, color: '#C4D600', fontSize: 104, fontWeight: 900 });
  add('text', { x: isBlackFriday ? 31 : 7, y: isBlackFriday ? 58 : 65, width: isBlackFriday ? 38 : 42, height: 12, text: hero.subtitle ?? '', color: '#ffffff', fontSize: 20 });
  add('button', { x: isBlackFriday ? 35 : 7, y: 79, width: 17, height: 8, text: hero.primaryCta ?? '', color: '#061748', backgroundColor: '#C4D600', fontSize: 16, url: '/rayban-meta', borderRadius: 12 });
  add('button', { x: isBlackFriday ? 53 : 26, y: 79, width: 19, height: 8, text: hero.secondaryCta ?? '', color: '#ffffff', backgroundColor: '#061748', fontSize: 16, url: '/todos-os-produtos', borderRadius: 12 });
  if (isBlackFriday && banner.images.brandLogo) {
    add('logo', { x: 40, y: 8, width: 20, height: 12, src: banner.images.brandLogo, alt: 'Óticas Brasil' });
  }
  return elements;
};

const newBanner = (): CustomBanner => ({
  id: `banner-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`,
  name: 'Novo banner',
  theme: 'default',
  announcements: [],
  hero: {},
  images: { background: '', brandLogo: '', partnerLogo: '' },
  elements: [],
  canvasBackgroundColor: '#061748',
});

const elementDefaults: Record<BannerCanvasElementType, Partial<BannerCanvasElement>> = {
  text: { text: 'Seu texto', color: '#ffffff', fontSize: 48, fontWeight: 700, width: 35, height: 12 },
  image: { text: '', src: '', alt: 'Imagem', width: 24, height: 24 },
  logo: { text: '', src: '/logos/logo-green.png', alt: 'Logo Óticas Brasil', width: 18, height: 14 },
  button: { text: 'Saiba mais', color: '#061748', backgroundColor: '#C4D600', fontSize: 24, fontWeight: 700, width: 20, height: 9, borderRadius: 12, url: '/todos-os-produtos' },
  shape: { text: '', backgroundColor: '#C4D600', width: 20, height: 20, shape: 'rectangle' },
};

const labels: Record<BannerCanvasElementType, string> = {
  text: 'Texto',
  image: 'Imagem',
  logo: 'Logo',
  button: 'Botão',
  shape: 'Forma',
};

const elementIcons: Record<BannerCanvasElementType, string> = {
  text: 'title',
  image: 'image',
  logo: 'branding_watermark',
  button: 'smart_button',
  shape: 'shapes',
};

const elementHints: Record<BannerCanvasElementType, string> = {
  text: 'Títulos e chamadas',
  image: 'Fotos e produtos',
  logo: 'Sua marca',
  button: 'Ação com link',
  shape: 'Formas decorativas',
};

const formatUrlError = (url: string) => {
  if (!url.trim() || url.startsWith('/')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol !== 'https:' && parsed.protocol !== 'http:';
  } catch {
    return true;
  }
};

const BannerCanvasEditor: React.FC<BannerCanvasEditorProps> = ({ initialBanner, onBack }) => {
  const toast = useToast();
  const [banner, setBanner] = useState<CustomBanner>(() => {
    if (!initialBanner) return newBanner();
    return {
      ...initialBanner,
      elements: legacyElements(initialBanner),
      canvasBackgroundColor: initialBanner.canvasBackgroundColor || '#061748',
    };
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
  const resizeRef = useRef<{ id: string; pointerId: number; handle: ResizeHandle; clientX: number; clientY: number; x: number; y: number; width: number; height: number; rotation: number } | null>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const elementFileRef = useRef<HTMLInputElement>(null);
  const selected = banner.elements?.find((element) => element.id === selectedId) ?? null;

  const updateBanner = (patch: Partial<CustomBanner>) => setBanner((current) => ({ ...current, ...patch }));
  const updateElement = (id: string, patch: Partial<BannerCanvasElement>) => {
    setBanner((current) => ({
      ...current,
      elements: (current.elements ?? []).map((element) => element.id === id ? { ...element, ...patch } : element),
    }));
  };

  const addElement = (type: BannerCanvasElementType) => {
    const element: BannerCanvasElement = {
      id: makeId(),
      type,
      x: 38,
      y: 38,
      width: 24,
      height: 12,
      ...elementDefaults[type],
    };
    setBanner((current) => ({ ...current, elements: [...(current.elements ?? []), element] }));
    setSelectedId(element.id);
  };

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>, element: BannerCanvasElement) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(element.id);
    dragRef.current = {
      id: element.id,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: element.x,
      y: element.y,
    };
  };

  const onResizeStart = (event: React.PointerEvent<HTMLSpanElement>, element: BannerCanvasElement, handle: ResizeHandle) => {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      id: element.id,
      pointerId: event.pointerId,
      handle,
      clientX: event.clientX,
      clientY: event.clientY,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation ?? 0,
    };
  };

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const resize = resizeRef.current;
    if (resize && resize.pointerId === event.pointerId) {
      const rad = (resize.rotation * Math.PI) / 180;
      const px = event.clientX - resize.clientX;
      const py = event.clientY - resize.clientY;
      // Projeta o movimento nos eixos locais do elemento rotacionado.
      const dx = ((px * Math.cos(rad) + py * Math.sin(rad)) / rect.width) * 100;
      const dy = ((-px * Math.sin(rad) + py * Math.cos(rad)) / rect.height) * 100;
      let left = resize.x;
      let top = resize.y;
      let right = resize.x + resize.width;
      let bottom = resize.y + resize.height;
      if (resize.handle.includes('w')) left = Math.max(0, Math.min(left + dx, right - MIN_SIZE));
      if (resize.handle.includes('e')) right = Math.min(100, Math.max(right + dx, left + MIN_SIZE));
      if (resize.handle.includes('n')) top = Math.max(0, Math.min(top + dy, bottom - MIN_SIZE));
      if (resize.handle.includes('s')) bottom = Math.min(100, Math.max(bottom + dy, top + MIN_SIZE));
      const round = (value: number) => Math.round(value * 10) / 10;
      updateElement(resize.id, { x: round(left), y: round(top), width: round(right - left), height: round(bottom - top) });
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ((event.clientX - drag.clientX) / rect.width) * 100;
    const dy = ((event.clientY - drag.clientY) / rect.height) * 100;
    const current = banner.elements?.find((element) => element.id === drag.id);
    const maxX = Math.max(0, 100 - (current?.width ?? 0));
    const maxY = Math.max(0, 100 - (current?.height ?? 0));
    updateElement(drag.id, {
      x: Math.round(Math.max(0, Math.min(maxX, drag.x + dx)) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(maxY, drag.y + dy)) * 10) / 10,
    });
  };

  const onDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
  };

  const updateImage = async (file?: File, target: 'background' | 'element' = 'element') => {
    if (!file) return;
    try {
      const src = await resizeImage(file, target === 'background');
      if (target === 'background') {
        updateBanner({ images: { ...banner.images, background: src } });
      } else if (selected) {
        updateElement(selected.id, { src, alt: selected.alt || file.name });
      }
      setMsg(null);
    } catch {
      setMsg({ kind: 'error', text: 'Não foi possível processar esta imagem.' });
    }
  };

  const moveLayer = (direction: -1 | 1) => {
    const elements = [...(banner.elements ?? [])];
    const index = elements.findIndex((element) => element.id === selectedId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= elements.length) return;
    [elements[index], elements[nextIndex]] = [elements[nextIndex], elements[index]];
    updateBanner({ elements });
  };

  const save = () => {
    if (!banner.name.trim()) {
      setMsg({ kind: 'error', text: 'Informe um nome para o banner.' });
      return;
    }
    if (banner.elements?.some((element) => element.type === 'button' && formatUrlError(element.url ?? ''))) {
      setMsg({ kind: 'error', text: 'Os links dos botões devem usar um caminho interno começando com / ou uma URL http(s) válida.' });
      return;
    }
    const savedBanner = {
      ...banner,
      name: banner.name.trim(),
      announcements: banner.announcements.map((item) => item.trim()).filter(Boolean),
    };
    const saved = saveCustomBanner(savedBanner);
    setMsg(saved
      ? { kind: 'ok', text: 'Banner salvo. Você já pode selecioná-lo para exibição na loja.' }
      : { kind: 'error', text: STORAGE_FULL_MSG });
    if (saved) toast.success(initialBanner ? 'Banner atualizado' : 'Banner criado', savedBanner.name);
    else toast.error('Não foi possível salvar o banner', STORAGE_FULL_MSG);
  };

  const selectedFile = (event: React.ChangeEvent<HTMLInputElement>, target: 'background' | 'element') => {
    void updateImage(event.target.files?.[0], target);
    event.target.value = '';
  };

  const setImageUrl = (key: keyof BannerImages, value: string) => {
    updateBanner({ images: { ...banner.images, [key]: value } });
  };

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#061748] via-[#10265e] to-[#263e83] text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
          <button type="button" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white" onClick={onBack}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Banners
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
            <span className="h-2 w-2 rounded-full bg-[#C4D600]" />
            {banner.elements?.length ?? 0} {(banner.elements?.length ?? 0) === 1 ? 'elemento' : 'elementos'} no layout
          </span>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#dbee2c]">Estúdio de criação</p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">Editor de banner</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/70">Monte a composição, organize as camadas e ajuste cada detalhe no canvas.</p>
          </div>
          <button type="button" className={`${primaryBtn} shrink-0 !rounded-2xl !bg-[#dbee2c] !px-5 !py-3 !text-[#061748] hover:!bg-[#e8f56b]`} onClick={save}>
            <span className="material-symbols-outlined text-[19px]">save</span>
            Salvar banner
          </button>
        </div>
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="grid items-start gap-4 xl:grid-cols-[190px_minmax(0,1fr)_260px] 2xl:grid-cols-[230px_minmax(0,1fr)_300px]">
        <Card title="Adicionar" subtitle="Clique para inserir no canvas" className="border-[#e1e6f0] shadow-md">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
            {(['text', 'image', 'logo', 'button', 'shape'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[#e4e8f0] bg-white p-2.5 text-left transition hover:-translate-y-0.5 hover:border-[#aeb9ec] hover:bg-[#f5f7ff] hover:shadow-sm"
                onClick={() => addElement(type)}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef1ff] text-[#4156b8] transition group-hover:bg-[#061748] group-hover:text-[#dbee2c]">
                  <span className="material-symbols-outlined text-[19px]">{elementIcons[type]}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[#061748]">{labels[type]}</span>
                  <span className="hidden truncate text-[10px] text-[#767680] sm:block xl:text-[11px]">{elementHints[type]}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="my-5 border-t border-[#eceef0]" />
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#061748]">Camadas</h3>
              <p className="mt-1 text-[11px] text-[#767680]">Selecione para editar ou reorganizar.</p>
            </div>
            {banner.elements?.length ? (
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {[...banner.elements].reverse().map((element, index) => {
                  const isSelected = element.id === selectedId;
                  return (
                    <button
                      key={element.id}
                      type="button"
                      onClick={() => setSelectedId(element.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${isSelected ? 'border-[#4156b8]/30 bg-[#eef1ff] text-[#061748]' : 'border-transparent text-[#45464f] hover:border-[#eceef0] hover:bg-[#f7f9fb]'}`}
                    >
                      <span className={`material-symbols-outlined text-[17px] ${isSelected ? 'text-[#4156b8]' : 'text-[#8b93a7]'}`}>{elementIcons[element.type]}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{element.text?.trim() || labels[element.type]}</span>
                      <span className="shrink-0 text-[10px] text-[#8b93a7]">{String((banner.elements?.length ?? 0) - index).padStart(2, '0')}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d9deea] bg-[#f8f9fc] px-3 py-4 text-center">
                <span className="material-symbols-outlined text-[20px] text-[#9ba4bb]">layers</span>
                <p className="mt-1 text-[11px] text-[#767680]">As camadas adicionadas aparecem aqui.</p>
              </div>
            )}
          </div>
          <div className="my-5 border-t border-[#eceef0]" />
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-black uppercase tracking-wider text-[#061748]">
              Configurações do banner
              <span className="material-symbols-outlined text-[18px] text-[#767680] transition group-open:rotate-180">expand_more</span>
            </summary>
            <div className="mt-4 space-y-4">
              <Field label="Nome do banner">
                <input className={inputCls} value={banner.name} onChange={(event) => updateBanner({ name: event.target.value })} />
              </Field>
              <Field label="Cor de fundo">
                <input type="color" className="h-10 w-full cursor-pointer rounded-xl border border-[#dfe3ec] bg-white p-1" value={banner.canvasBackgroundColor || '#061748'} onChange={(event) => updateBanner({ canvasBackgroundColor: event.target.value })} />
              </Field>
              <Field label="Anúncios" hint="Um anúncio por linha">
                <textarea rows={3} className={inputCls} value={banner.announcements.join('\n')} onChange={(event) => updateBanner({ announcements: event.target.value.split('\n') })} />
              </Field>
            </div>
          </details>
        </Card>

        <div className="min-w-0 space-y-4">
        <Card title="Área de criação" subtitle="Arraste para mover · use as alças para redimensionar" className="border-[#e1e6f0] shadow-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e8f0] bg-[#f7f8fb] px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#4156b8]">aspect_ratio</span>
              <span className="text-xs font-bold text-[#061748]">Banner horizontal</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#767680]">16:9</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-[#dfe3ec] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#45464f] transition hover:border-[#aeb9ec] hover:text-[#061748] disabled:cursor-not-allowed disabled:opacity-40" disabled={!selected} onClick={() => moveLayer(-1)}>
                <span className="material-symbols-outlined text-[15px]">flip_to_back</span>
                <span className="hidden sm:inline">Enviar para trás</span>
              </button>
              <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-[#dfe3ec] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#45464f] transition hover:border-[#aeb9ec] hover:text-[#061748] disabled:cursor-not-allowed disabled:opacity-40" disabled={!selected} onClick={() => moveLayer(1)}>
                <span className="material-symbols-outlined text-[15px]">flip_to_front</span>
                <span className="hidden sm:inline">Trazer para frente</span>
              </button>
            </div>
          </div>
          <div
            ref={stageRef}
            className="relative mx-auto w-full touch-none overflow-hidden rounded-xl border border-[#c6c5d0] shadow-[0_12px_30px_rgba(6,23,72,0.16)]"
            style={{
              aspectRatio: '16 / 9',
              containerType: 'inline-size',
              backgroundColor: banner.canvasBackgroundColor || '#061748',
              backgroundImage: banner.images.background ? `url("${banner.images.background}")` : undefined,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            {!banner.elements?.length && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="max-w-xs rounded-2xl border border-white/20 bg-black/20 px-5 py-4 text-white/80 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[28px] text-[#dbee2c]">add_photo_alternate</span>
                  <p className="mt-2 text-sm font-bold">Seu canvas está vazio</p>
                  <p className="mt-1 text-xs text-white/65">Adicione um elemento pela barra lateral para começar a composição.</p>
                </div>
              </div>
            )}
            {(banner.elements ?? []).map((element) => (
              <div
                key={element.id}
                role="button"
                tabIndex={0}
                aria-label={`Selecionar ${labels[element.type]}`}
                aria-pressed={element.id === selectedId}
                onPointerDown={(event) => onDragStart(event, element)}
                onClick={() => setSelectedId(element.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelectedId(element.id);
                }}
                className={`absolute flex cursor-move items-center justify-center overflow-hidden select-none ${element.id === selectedId ? 'z-20 outline outline-2 outline-[#C4D600] outline-offset-2' : 'hover:z-10 hover:outline hover:outline-1 hover:outline-white/80'}`}
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  width: `${element.width}%`,
                  height: `${element.height}%`,
                  transform: `rotate(${element.rotation ?? 0}deg)`,
                  color: element.color || '#ffffff',
                  backgroundColor: element.type === 'shape' || element.type === 'button' ? element.backgroundColor : undefined,
                  borderRadius: element.type === 'shape' && element.shape === 'circle' ? '50%' : `${element.borderRadius ?? 0}px`,
                  fontSize: `${((element.fontSize ?? 24) / 1440) * 100}cqw`,
                  fontWeight: element.fontWeight ?? 700,
                  lineHeight: 1.1,
                }}
              >
                {element.type === 'image' || element.type === 'logo' ? (
                  element.src
                    ? <img src={element.src} alt={element.alt || ''} draggable={false} className="pointer-events-none h-full w-full object-contain" />
                    : <span className="border border-dashed border-current p-2 text-[10px]">Defina uma imagem no inspetor</span>
                ) : element.type === 'shape' ? null : (
                  <span className="pointer-events-none w-full whitespace-pre-wrap px-1 text-center">{element.text}</span>
                )}
              </div>
            ))}
            {selected && (
              <div
                className="pointer-events-none absolute z-40"
                style={{
                  left: `${selected.x}%`,
                  top: `${selected.y}%`,
                  width: `${selected.width}%`,
                  height: `${selected.height}%`,
                  transform: `rotate(${selected.rotation ?? 0}deg)`,
                }}
              >
                {RESIZE_HANDLES.map(({ handle, style, cursor }) => (
                  <span
                    key={handle}
                    role="presentation"
                    onPointerDown={(event) => onResizeStart(event, selected, handle)}
                    className="pointer-events-auto absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-[#061748] bg-white shadow sm:h-2.5 sm:w-2.5"
                    style={{ ...style, cursor, touchAction: 'none' }}
                  />
                ))}
              </div>
            )}
            {banner.images.background && (
              <span className="pointer-events-none absolute bottom-2 right-2 z-30 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm">Prévia proporcional 16:9</span>
            )}
          </div>
          <div className="mt-4 rounded-2xl border border-[#e4e8f0] bg-[#f7f8fb] p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#4156b8]">wallpaper</span>
              <span className="text-xs font-black uppercase tracking-wider text-[#061748]">Imagem de fundo</span>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Field label="URL da imagem">
                <input className={inputCls} value={banner.images.background} placeholder="https://exemplo.com/banner.jpg" onChange={(event) => setImageUrl('background', event.target.value)} />
              </Field>
              <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d5dbea] bg-white px-4 py-2 text-sm font-bold text-[#061748] transition hover:border-[#aeb9ec] hover:bg-[#f4f6ff]" onClick={() => backgroundFileRef.current?.click()}>
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Enviar imagem
              </button>
              <input ref={backgroundFileRef} type="file" accept="image/*" hidden onChange={(event) => selectedFile(event, 'background')} />
            </div>
          </div>
        </Card>
        </div>

        <Card title="Inspetor" subtitle={selected ? 'Personalize o elemento selecionado' : 'Nenhum elemento selecionado'} className="border-[#e1e6f0] shadow-md 2xl:sticky 2xl:top-4">
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-[#d9deea] bg-[#f8f9fc] px-4 py-8 text-center">
              <span className="material-symbols-outlined text-[30px] text-[#a1a9bb]">ads_click</span>
              <p className="mt-2 text-sm font-bold text-[#061748]">Selecione um elemento</p>
              <p className="mt-1 text-xs leading-relaxed text-[#767680]">Clique em qualquer item no canvas ou na lista de camadas para editar texto, tamanho, cor e posição.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-[#f2f4f8] p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#4156b8] shadow-sm">
                  <span className="material-symbols-outlined">{elementIcons[selected.type]}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#767680]">Editando</p>
                  <p className="truncate text-sm font-black text-[#061748]">{selected.text?.trim() || labels[selected.type]}</p>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a91a3]">Posição e tamanho</h3>
                <div className="grid grid-cols-2 gap-3">
                {([
                  ['x', 'Posição X (%)'],
                  ['y', 'Posição Y (%)'],
                  ['width', 'Largura (%)'],
                  ['height', 'Altura (%)'],
                ] as const).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input type="number" min={0} max={100} step={0.5} className={inputCls} value={selected[key]} onChange={(event) => updateElement(selected.id, { [key]: Math.min(100, Math.max(0, Number(event.target.value))) })} />
                  </Field>
                ))}
                </div>
              </div>
              {(selected.type === 'text' || selected.type === 'button') && (
                <div>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a91a3]">Conteúdo</h3>
                  <Field label={selected.type === 'button' ? 'Texto do botão' : 'Texto'}>
                    <textarea rows={3} className={inputCls} value={selected.text ?? ''} onChange={(event) => updateElement(selected.id, { text: event.target.value })} />
                  </Field>
                </div>
              )}
              {(selected.type === 'image' || selected.type === 'logo') && (
                <>
                  <Field label="Imagem (URL)">
                    <input className={inputCls} value={selected.src ?? ''} placeholder="https://..." onChange={(event) => updateElement(selected.id, { src: event.target.value })} />
                  </Field>
                  <Field label="Texto alternativo">
                    <input className={inputCls} value={selected.alt ?? ''} onChange={(event) => updateElement(selected.id, { alt: event.target.value })} />
                  </Field>
                  <button type="button" className="w-full rounded-xl border border-[#c6c5d0] px-3 py-2.5 text-sm font-bold text-[#45464f] hover:bg-[#f2f4f6]" onClick={() => elementFileRef.current?.click()}>
                    Enviar imagem do computador
                  </button>
                  <input ref={elementFileRef} type="file" accept="image/*" hidden onChange={(event) => selectedFile(event, 'element')} />
                </>
              )}
              {selected.type === 'button' && (
                <div>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a91a3]">Ação</h3>
                  <Field label="Redirecionar para" hint="Use um caminho como /todos-os-produtos ou uma URL http(s).">
                    <input className={inputCls} value={selected.url ?? ''} placeholder="/todos-os-produtos" onChange={(event) => updateElement(selected.id, { url: event.target.value })} />
                  </Field>
                </div>
              )}
              {(selected.type === 'text' || selected.type === 'button') && (
                <Field label="Tamanho da fonte">
                  <input type="number" min={8} max={180} className={inputCls} value={selected.fontSize ?? 24} onChange={(event) => updateElement(selected.id, { fontSize: Math.min(180, Math.max(8, Number(event.target.value))) })} />
                </Field>
              )}
              {selected.type !== 'image' && selected.type !== 'logo' && (
                <Field label="Cor do texto">
                  <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-[#c6c5d0] bg-white p-1" value={selected.color || '#ffffff'} onChange={(event) => updateElement(selected.id, { color: event.target.value })} />
                </Field>
              )}
              {(selected.type === 'shape' || selected.type === 'button') && (
                <Field label="Cor de preenchimento">
                  <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-[#c6c5d0] bg-white p-1" value={selected.backgroundColor || '#C4D600'} onChange={(event) => updateElement(selected.id, { backgroundColor: event.target.value })} />
                </Field>
              )}
              {selected.type === 'shape' && (
                <Field label="Formato">
                  <CustomSelect
                    className={inputCls}
                    value={selected.shape || 'rectangle'}
                    onChange={(shape) => updateElement(selected.id, { shape })}
                    options={[
                      { value: 'rectangle', label: 'Retângulo' },
                      { value: 'circle', label: 'Círculo' },
                    ]}
                  />
                </Field>
              )}
              {selected.type !== 'shape' && (
                <Field label="Arredondamento (px)">
                  <input type="number" min={0} max={100} className={inputCls} value={selected.borderRadius ?? 0} onChange={(event) => updateElement(selected.id, { borderRadius: Math.min(100, Math.max(0, Number(event.target.value))) })} />
                </Field>
              )}
              <div className="border-t border-[#eceef0] pt-4">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                  onClick={() => {
                    setBanner((current) => ({ ...current, elements: (current.elements ?? []).filter((element) => element.id !== selected.id) }));
                    setSelectedId(null);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Remover elemento
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BannerCanvasEditor;
