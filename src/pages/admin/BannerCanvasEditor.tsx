import React, { useRef, useState } from 'react';
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

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const dx = ((event.clientX - drag.clientX) / rect.width) * 100;
    const dy = ((event.clientY - drag.clientY) / rect.height) * 100;
    updateElement(drag.id, {
      x: Math.round(Math.max(0, Math.min(100, drag.x + dx)) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(100, drag.y + dy)) * 10) / 10,
    });
  };

  const onDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
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
    setMsg(saveCustomBanner(savedBanner)
      ? { kind: 'ok', text: 'Banner salvo. Você já pode selecioná-lo para exibição na loja.' }
      : { kind: 'error', text: STORAGE_FULL_MSG });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-[#45464f] hover:bg-[#f2f4f6]" onClick={onBack}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar para banners
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-xl border border-[#c6c5d0] px-3 py-2 text-sm font-bold text-[#45464f] disabled:opacity-40" disabled={!selected} onClick={() => moveLayer(-1)}>Enviar para trás</button>
          <button type="button" className="rounded-xl border border-[#c6c5d0] px-3 py-2 text-sm font-bold text-[#45464f] disabled:opacity-40" disabled={!selected} onClick={() => moveLayer(1)}>Trazer para frente</button>
          <button type="button" className={primaryBtn} onClick={save}>
            <span className="material-symbols-outlined text-[18px]">save</span>
            Salvar banner
          </button>
        </div>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="grid items-start gap-5 2xl:grid-cols-[190px_minmax(0,1fr)_280px]">
        <Card title="Elementos" subtitle="Adicione ao canvas">
          <div className="grid grid-cols-2 gap-2 2xl:grid-cols-1">
            {(['text', 'image', 'logo', 'button', 'shape'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[#c6c5d0] px-3 py-2 text-left text-sm font-semibold text-[#061748] hover:border-[#4156b8] hover:bg-[#f4f6ff]"
                onClick={() => addElement(type)}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {{ text: 'text_fields', image: 'image', logo: 'branding_watermark', button: 'smart_button', shape: 'shapes' }[type]}
                </span>
                {labels[type]}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            <Field label="Nome do banner">
              <input className={inputCls} value={banner.name} onChange={(event) => updateBanner({ name: event.target.value })} />
            </Field>
            <Field label="Fundo do canvas">
              <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-[#c6c5d0] bg-white p-1" value={banner.canvasBackgroundColor || '#061748'} onChange={(event) => updateBanner({ canvasBackgroundColor: event.target.value })} />
            </Field>
            <Field label="Anúncios" hint="Um anúncio por linha">
              <textarea
                rows={4}
                className={inputCls}
                value={banner.announcements.join('\n')}
                onChange={(event) => updateBanner({ announcements: event.target.value.split('\n') })}
              />
            </Field>
          </div>
        </Card>

        <Card title="Canvas" subtitle="Arraste os elementos para posicioná-los. A composição será reduzida proporcionalmente em telas menores.">
          <div
            ref={stageRef}
            className="relative mx-auto w-full touch-none overflow-hidden rounded-xl border border-[#c6c5d0] shadow-inner"
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
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-white/55">
                Canvas vazio — adicione texto, imagem, logo, botão ou forma
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
            {banner.images.background && (
              <span className="pointer-events-none absolute bottom-2 right-2 z-30 rounded bg-black/60 px-2 py-1 text-[10px] text-white">Prévia proporcional 16:9</span>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Imagem de fundo (URL)">
              <input className={inputCls} value={banner.images.background} placeholder="https://..." onChange={(event) => setImageUrl('background', event.target.value)} />
            </Field>
            <div className="flex items-end">
              <button type="button" className="w-full rounded-xl border border-[#c6c5d0] px-3 py-2.5 text-sm font-bold text-[#45464f] hover:bg-[#f2f4f6]" onClick={() => backgroundFileRef.current?.click()}>
                Enviar imagem de fundo
              </button>
              <input ref={backgroundFileRef} type="file" accept="image/*" hidden onChange={(event) => selectedFile(event, 'background')} />
            </div>
          </div>
        </Card>

        <Card title="Propriedades" subtitle={selected ? labels[selected.type] : 'Selecione um elemento'}>
          {!selected ? (
            <p className="text-sm text-[#767680]">Clique em um elemento do canvas para editar o conteúdo e as propriedades.</p>
          ) : (
            <div className="space-y-4">
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
              {(selected.type === 'text' || selected.type === 'button') && (
                <Field label={selected.type === 'button' ? 'Texto do botão' : 'Texto'}>
                  <textarea rows={3} className={inputCls} value={selected.text ?? ''} onChange={(event) => updateElement(selected.id, { text: event.target.value })} />
                </Field>
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
                <Field label="Redirecionar para" hint="Use um caminho como /todos-os-produtos ou uma URL http(s).">
                  <input className={inputCls} value={selected.url ?? ''} placeholder="/todos-os-produtos" onChange={(event) => updateElement(selected.id, { url: event.target.value })} />
                </Field>
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
                  <select className={inputCls} value={selected.shape || 'rectangle'} onChange={(event) => updateElement(selected.id, { shape: event.target.value as 'rectangle' | 'circle' })}>
                    <option value="rectangle">Retângulo</option>
                    <option value="circle">Círculo</option>
                  </select>
                </Field>
              )}
              {selected.type !== 'shape' && (
                <Field label="Arredondamento (px)">
                  <input type="number" min={0} max={100} className={inputCls} value={selected.borderRadius ?? 0} onChange={(event) => updateElement(selected.id, { borderRadius: Math.min(100, Math.max(0, Number(event.target.value))) })} />
                </Field>
              )}
              <button
                type="button"
                className="w-full rounded-xl border border-red-200 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
                onClick={() => {
                  setBanner((current) => ({ ...current, elements: (current.elements ?? []).filter((element) => element.id !== selected.id) }));
                  setSelectedId(null);
                }}
              >
                Remover elemento
              </button>
            </div>
          )}
        </Card>
      </div>
      <div className="flex justify-end">
        <button type="button" className={primaryBtn} onClick={save}>Salvar banner</button>
      </div>
    </div>
  );
};

export default BannerCanvasEditor;
