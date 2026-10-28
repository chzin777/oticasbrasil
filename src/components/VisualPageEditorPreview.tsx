import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageEditorConfig, type EditableLayoutPage, type VisualPageElement, useSiteData } from '../lib/siteStore';

interface VisualPageEditorPreviewProps {
  children: React.ReactNode;
}

const selectorFor = (element: Element) => {
  if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
    return `#${CSS.escape(element.id)}`;
  }
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const parentElement: Element | null = current.parentElement;
    if (!parentElement) break;
    const sameTag = Array.from(parentElement.children).filter((child: Element) => child.tagName === current?.tagName);
    parts.unshift(`${tag}:nth-of-type(${sameTag.indexOf(current) + 1})`);
    if (parentElement.id) {
      parts.unshift(`#${CSS.escape(parentElement.id)}`);
      break;
    }
    current = parentElement;
  }
  return parts.join(' > ');
};

const stableId = (page: EditableLayoutPage, selector: string) => {
  let hash = 2166136261;
  for (const character of `${page}:${selector}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `visual-${(hash >>> 0).toString(36)}`;
};

const isEditablePage = (value: string | null): value is EditableLayoutPage =>
  value === 'home' || value === 'product';

export const VisualPageEditorPreview: React.FC<VisualPageEditorPreviewProps> = ({ children }) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('visual-editor');
    if (!isEditablePage(page)) return;

    let elements: VisualPageElement[] = [];
    let selectedId: string | null = null;
    let selectedElement: HTMLElement | null = null;
    let drag: {
      element: HTMLElement;
      pointerId: number;
      startX: number;
      startY: number;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
      handle: string | null;
      moved: boolean;
    } | null = null;

    const style = document.createElement('style');
    style.dataset.visualEditor = 'true';
    style.textContent = `
      html.visual-editor-active { scroll-behavior: auto !important; }
      html.visual-editor-active body { cursor: crosshair; }
      html.visual-editor-active [data-visual-editor-selected="true"] {
        cursor: move !important;
      }
      [data-visual-editor-frame="true"] {
        position: fixed;
        z-index: 2147483000;
        border: 1px solid #4156b8;
        box-sizing: border-box;
        pointer-events: none;
      }
      [data-visual-editor-handle] {
        position: absolute;
        width: 11px;
        height: 11px;
        border: 2px solid #4156b8;
        border-radius: 2px;
        background: white;
        box-sizing: border-box;
        pointer-events: auto;
        touch-action: none;
      }
      [data-visual-editor-handle="n"] { top: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
      [data-visual-editor-handle="ne"] { top: -6px; right: -6px; cursor: nesw-resize; }
      [data-visual-editor-handle="e"] { top: 50%; right: -6px; transform: translateY(-50%); cursor: ew-resize; }
      [data-visual-editor-handle="se"] { bottom: -6px; right: -6px; cursor: nwse-resize; }
      [data-visual-editor-handle="s"] { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
      [data-visual-editor-handle="sw"] { bottom: -6px; left: -6px; cursor: nesw-resize; }
      [data-visual-editor-handle="w"] { top: 50%; left: -6px; transform: translateY(-50%); cursor: ew-resize; }
      [data-visual-editor-handle="nw"] { top: -6px; left: -6px; cursor: nwse-resize; }
      [data-visual-editor-label] {
        position: absolute;
        top: -24px;
        left: -1px;
        padding: 3px 6px;
        border-radius: 3px 3px 0 0;
        background: #4156b8;
        color: white;
        font: 600 10px/1.2 sans-serif;
        white-space: nowrap;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    document.documentElement.classList.add('visual-editor-active');
    const frame = document.createElement('div');
    frame.dataset.visualEditorFrame = 'true';
    frame.innerHTML = '<span data-visual-editor-label></span>' +
      ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
        .map((handle) => `<span data-visual-editor-handle="${handle}"></span>`)
        .join('');
    document.body.appendChild(frame);
    const label = frame.querySelector<HTMLElement>('[data-visual-editor-label]');

    const updateSelectionFrame = () => {
      if (!selectedElement?.isConnected) {
        frame.style.display = 'none';
        return;
      }
      const rect = selectedElement.getBoundingClientRect();
      frame.style.display = 'block';
      frame.style.left = `${rect.left}px`;
      frame.style.top = `${rect.top}px`;
      frame.style.width = `${rect.width}px`;
      frame.style.height = `${rect.height}px`;
      if (label) label.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;
    };

    const send = (message: Record<string, unknown>) => {
      window.parent.postMessage({ source: 'oticas-visual-editor', ...message }, window.location.origin);
    };
    const selectElement = (element: HTMLElement) => {
      const selector = selectorFor(element);
      if (!selector) return;
      const id = stableId(page, selector);
      document.querySelectorAll('[data-visual-editor-selected="true"]').forEach((item) => {
        item.removeAttribute('data-visual-editor-selected');
      });
      element.setAttribute('data-visual-editor-selected', 'true');
      selectedId = id;
      selectedElement = element;
      updateSelectionFrame();
      const saved = elements.find((item) => item.id === id);
      const rect = element.getBoundingClientRect();
      send({
        type: 'selection',
        element: {
          id,
          selector,
          tagName: element.tagName.toLowerCase(),
          content: saved?.content ?? (element instanceof HTMLImageElement ? element.alt : element.innerText?.trim().slice(0, 500) ?? ''),
          src: saved?.src ?? (element instanceof HTMLImageElement ? element.getAttribute('src') ?? '' : ''),
          alt: saved?.alt ?? (element instanceof HTMLImageElement ? element.alt : ''),
          offsetX: saved?.offsetX ?? 0,
          offsetY: saved?.offsetY ?? 0,
          width: saved?.width,
          height: saved?.height,
          renderedWidth: Math.round(rect.width),
          renderedHeight: Math.round(rect.height),
          fontSize: saved?.fontSize ?? Number.parseFloat(getComputedStyle(element).fontSize),
          color: saved?.color ?? getComputedStyle(element).color,
          backgroundColor: saved?.backgroundColor ?? getComputedStyle(element).backgroundColor,
          editableText: element.children.length === 0 &&
            /^(h[1-6]|p|a|button|span|strong|em)$/.test(element.tagName.toLowerCase()),
          isImage: element instanceof HTMLImageElement,
        },
      });
    };
    const findTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const icon = target.closest('.material-symbols-outlined');
      const start = icon?.parentElement ?? target;
      const element = start.closest<HTMLElement>('h1,h2,h3,h4,h5,h6,p,a,button,img,section,span:not(.material-symbols-outlined),strong,em');
      if (!element || element.closest('[data-visual-editor-ignore]')) return null;
      return element;
    };
    const applyElement = (item: VisualPageElement) => {
      try {
        const element = document.querySelector<HTMLElement>(item.selector);
        if (!element) return;
        element.style.translate = `${item.offsetX}px ${item.offsetY}px`;
        element.hidden = item.hidden;
        if (item.content !== undefined && element.children.length === 0 &&
          /^(h[1-6]|p|a|button|span|strong|em)$/.test(element.tagName.toLowerCase())) {
          element.innerText = item.content;
        }
        if (element instanceof HTMLImageElement) {
          if (item.src !== undefined) element.src = item.src;
          if (item.alt !== undefined) element.alt = item.alt;
        }
        if (item.width !== undefined || item.height !== undefined) element.style.boxSizing = 'border-box';
        if (item.width !== undefined) element.style.width = `${item.width}px`;
        if (item.height !== undefined) element.style.height = `${item.height}px`;
        if (item.fontSize !== undefined) element.style.fontSize = `${item.fontSize}px`;
        if (item.color) element.style.color = item.color;
        if (item.backgroundColor) element.style.backgroundColor = item.backgroundColor;
      } catch {
        return;
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
      if (event.data.type === 'visual-editor:config' && Array.isArray(event.data.elements)) {
        elements = event.data.elements as VisualPageElement[];
        elements.forEach(applyElement);
        if (selectedId) {
          const selected = elements.find((item) => item.id === selectedId);
          const element = selected ? document.querySelector<HTMLElement>(selected.selector) : null;
          if (element) selectElement(element);
        }
      }
      if (event.data.type === 'visual-editor:apply' && event.data.element) {
        const next = event.data.element as VisualPageElement;
        elements = elements.some((item) => item.id === next.id)
          ? elements.map((item) => item.id === next.id ? next : item)
          : [...elements, next];
        applyElement(next);
        if (selectedId === next.id) {
          const selected = document.querySelector<HTMLElement>(next.selector);
          if (selected) selectElement(selected);
        }
      }
    };
    const observer = new MutationObserver(() => elements.forEach(applyElement));
    observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const resizeHandle = event.target.closest<HTMLElement>('[data-visual-editor-handle]');
      const element = resizeHandle ? selectedElement : findTarget(event.target);
      if (!element) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!resizeHandle) selectElement(element);
      const saved = elements.find((item) => item.id === selectedId);
      const rect = element.getBoundingClientRect();
      drag = {
        element,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: saved?.offsetX ?? 0,
        offsetY: saved?.offsetY ?? 0,
        width: saved?.width ?? rect.width,
        height: saved?.height ?? rect.height,
        handle: resizeHandle?.dataset.visualEditorHandle ?? null,
        moved: false,
      };
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      if (drag.handle) {
        const growsLeft = drag.handle.includes('w');
        const growsTop = drag.handle.includes('n');
        const widthDelta = growsLeft ? -dx : drag.handle.includes('e') ? dx : 0;
        const heightDelta = growsTop ? -dy : drag.handle.includes('s') ? dy : 0;
        drag.element.style.width = `${Math.max(24, Math.min(4000, drag.width + widthDelta))}px`;
        drag.element.style.height = `${Math.max(16, Math.min(4000, drag.height + heightDelta))}px`;
        if (growsLeft || growsTop) {
          drag.element.style.translate = `${drag.offsetX + (growsLeft ? dx : 0)}px ${drag.offsetY + (growsTop ? dy : 0)}px`;
        }
      } else {
        drag.element.style.translate = `${drag.offsetX + dx}px ${drag.offsetY + dy}px`;
      }
      updateSelectionFrame();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const completed = drag;
      drag = null;
      if (!completed.moved) return;
      const selector = selectorFor(completed.element);
      const id = stableId(page, selector);
      const current = elements.find((item) => item.id === id);
      const next: VisualPageElement = {
        ...(current ?? { id, selector, offsetX: 0, offsetY: 0, hidden: false }),
        id,
        selector,
        offsetX: Math.max(-3000, Math.min(3000, Math.round(
          completed.offsetX + (completed.handle?.includes('w') || !completed.handle ? event.clientX - completed.startX : 0),
        ))),
        offsetY: Math.max(-3000, Math.min(3000, Math.round(
          completed.offsetY + (completed.handle?.includes('n') || !completed.handle ? event.clientY - completed.startY : 0),
        ))),
        ...(completed.handle ? {
          width: Math.max(24, Math.min(4000, Math.round(completed.width + (completed.handle.includes('w') ? completed.startX - event.clientX : completed.handle.includes('e') ? event.clientX - completed.startX : 0)))),
          height: Math.max(16, Math.min(4000, Math.round(completed.height + (completed.handle.includes('n') ? completed.startY - event.clientY : completed.handle.includes('s') ? event.clientY - completed.startY : 0)))),
        } : {}),
      };
      elements = elements.some((item) => item.id === id)
        ? elements.map((item) => item.id === id ? next : item)
        : [...elements, next];
      send({ type: 'change', element: next, actionId: crypto.randomUUID() });
      updateSelectionFrame();
    };
    const onScrollOrResize = () => updateSelectionFrame();
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('text/plain')) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      const payload = event.dataTransfer?.getData('text/plain') ?? '';
      if (!payload.startsWith('new:')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      send({ type: 'add-block', blockType: payload.slice(4) });
    };
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && findTarget(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      send({ type: key === 'y' || event.shiftKey ? 'redo' : 'undo' });
    };

    window.addEventListener('message', onMessage);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('dragover', onDragOver, true);
    document.addEventListener('drop', onDrop, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    send({ type: 'ready', page });
    return () => {
      observer.disconnect();
      window.removeEventListener('message', onMessage);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('dragover', onDragOver, true);
      document.removeEventListener('drop', onDrop, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      document.documentElement.classList.remove('visual-editor-active');
      frame.remove();
      style.remove();
    };
  }, []);

  return <PersistedVisualPageLayout>{children}</PersistedVisualPageLayout>;
};

const PersistedVisualPageLayout: React.FC<VisualPageEditorPreviewProps> = ({ children }) => {
  useSiteData();
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (new URLSearchParams(search).has('visual-editor')) return;
    const page: EditableLayoutPage | null = pathname === '/'
      ? 'home'
      : pathname.startsWith('/produto/')
        ? 'product'
        : null;
    if (!page) return;

    const applySavedStyles = () => {
      for (const item of getPageEditorConfig().visualElements[page]) {
        try {
          const element = document.querySelector<HTMLElement>(item.selector);
          if (!element) continue;
          element.style.translate = `${item.offsetX}px ${item.offsetY}px`;
          element.hidden = item.hidden;
          if (item.content !== undefined && element.children.length === 0 &&
            /^(h[1-6]|p|a|button|span|strong|em)$/.test(element.tagName.toLowerCase())) {
            element.innerText = item.content;
          }
          if (element instanceof HTMLImageElement) {
            if (item.src !== undefined) element.src = item.src;
            if (item.alt !== undefined) element.alt = item.alt;
          }
          if (item.width !== undefined || item.height !== undefined) element.style.boxSizing = 'border-box';
          if (item.width !== undefined) element.style.width = `${item.width}px`;
          if (item.height !== undefined) element.style.height = `${item.height}px`;
          if (item.fontSize !== undefined) element.style.fontSize = `${item.fontSize}px`;
          if (item.color) element.style.color = item.color;
          if (item.backgroundColor) element.style.backgroundColor = item.backgroundColor;
        } catch (error) {
          console.error(`Não foi possível aplicar a personalização visual ${item.id}.`, error);
        }
      }
    };

    const observer = new MutationObserver(applySavedStyles);
    observer.observe(document.getElementById('root') ?? document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    applySavedStyles();
    return () => observer.disconnect();
  }, [pathname, search]);

  return <>{children}</>;
};
