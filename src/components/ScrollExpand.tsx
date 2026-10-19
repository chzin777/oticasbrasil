import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

type ConfigKey =
  | 'startWidth'
  | 'startHeight'
  | 'startRadius'
  | 'endRadius'
  | 'mediaZoom'
  | 'scrollDistance'
  | 'holdDistance'
  | 'smoothing'
  | 'overlayScrim'
  | 'useWindowScroll'
  | 'enabled';

export interface ScrollExpandProps {
  src?: string;
  mediaType?: 'image' | 'video';
  poster?: string;
  alt?: string;
  title?: string;
  titleNode?: ReactNode;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  children?: ReactNode;
  background?: ReactNode;
  overlayAlign?: 'center' | 'left';
  overlayFade?: boolean;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

const ScrollExpand: React.FC<ScrollExpandProps> = ({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  titleNode,
  scrollHint = '',
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  useWindowScroll = false,
  enabled = true,
  children,
  background,
  overlayAlign = 'center',
  overlayFade = false,
  className = '',
  style,
  ...rest
}: ScrollExpandProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef<Required<Pick<ScrollExpandProps, ConfigKey>>>(
    {} as Required<Pick<ScrollExpandProps, ConfigKey>>
  );

  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled
  };

  const applyProgress = useCallback((p: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;

    const c = propsRef.current;
    const e = smoothstep(0, 1, p);

    const w = c.startWidth + (100 - c.startWidth) * e;
    const h = c.startHeight + (100 - c.startHeight) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = c.startRadius + (c.endRadius - c.startRadius) * e;

    frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;
    media.style.transform = `scale(${c.mediaZoom + (1 - c.mediaZoom) * e})`;

    if (scrimRef.current) scrimRef.current.style.opacity = `${c.overlayScrim * e}`;

    if (titleRef.current) {
      const out = smoothstep(0.4, 0.88, p);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`;
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, p);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      const inn = smoothstep(0.68, 1, p);
      overlayRef.current.style.opacity = `${inn}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`;
    }

    const fadeEl = frameRef.current?.querySelector('[data-se-fade]') as HTMLElement | null;
    if (fadeEl) {
      const fadeProgress = smoothstep(0.68, 1, p);
      fadeEl.style.opacity = `${fadeProgress}`;
    }

    const bottomFade = stageRef.current?.querySelector('[data-se-bottom-fade]') as HTMLElement | null;
    if (bottomFade) {
      const bottomProgress = smoothstep(0.85, 1, p);
      bottomFade.style.opacity = `${bottomProgress}`;
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;
    let running = false;

    const measure = () => {
      const c = propsRef.current;
      // In window-scroll mode, the stage height is the viewport height (full-screen expand).
      // The root itself gets sized to provide enough scroll runway for the animation.
      if (c.useWindowScroll) {
        stageH = window.innerHeight;
        const runway = stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance));
        root.style.height = `${runway}px`;
      } else {
        stageH = root.clientHeight;
      }
      if (stageH <= 0) return;
      stage.style.height = `${stageH}px`;
      track.style.height = `${stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance))}px`;
      const w = root.clientWidth || stageH;
      stage.style.setProperty('--se-title-size', `${clamp(w * 0.075, 20, 84)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 1;
      const span = stageH * Math.max(0.01, c.scrollDistance);
      if (c.useWindowScroll) {
        const top = track.getBoundingClientRect().top;
        return clamp(-top / span, 0, 1);
      }
      return clamp(root.scrollTop / span, 0, 1);
    };

    const tick = () => {
      const c = propsRef.current;
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing));
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      raf = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    target = readProgress();
    current = target;
    applyProgress(current);

    const scroller = useWindowScroll ? window : root;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const media =
    mediaType === 'video' ? (
      <video
        ref={mediaRef}
        className="absolute inset-0 w-full h-full object-cover origin-center select-none [will-change:transform]"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : (
      <img
        ref={mediaRef}
        className="absolute inset-0 w-full h-full object-cover origin-center select-none [will-change:transform]"
        src={src}
        alt={alt}
        draggable={false}
      />
    );

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-full ${useWindowScroll ? '' : 'overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="relative w-full">
        <div ref={stageRef} className="sticky top-0 w-full overflow-hidden [--se-title-size:4rem] z-0">
          {background ? (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              {background}
            </div>
          ) : null}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 z-[5] pointer-events-none bg-gradient-to-t from-white to-transparent opacity-0 [will-change:opacity]"
            data-se-bottom-fade="true"
          />
          <div
            ref={frameRef}
            className="absolute inset-0 [clip-path:inset(21%_29%_21%_29%_round_24px)] [will-change:clip-path] z-[1]"
          >
            {media}
            <div
              ref={scrimRef}
              className="absolute inset-0 opacity-0 pointer-events-none bg-[linear-gradient(to_top,rgba(255,255,255,0.92),rgba(255,255,255,0.4)_45%,rgba(255,255,255,0.18))]"
            />
            {children ? (
              <>
                {overlayFade ? (
                  <div
                    className="absolute inset-0 pointer-events-none z-[2] opacity-0 [will-change:opacity]"
                    style={{
                      background: 'linear-gradient(to right, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.7) 35%, transparent 70%)'
                    }}
                    data-se-fade="true"
                  />
                ) : null}
                <div
                  ref={overlayRef}
                  className={`absolute inset-0 flex flex-col p-[6%] opacity-0 [will-change:opacity,transform] z-[3] ${
                    overlayAlign === 'left'
                      ? 'items-start justify-center text-left'
                      : 'items-center justify-center text-center'
                  }`}
                >
                  {children}
                </div>
              </>
            ) : null}
          </div>
          {titleNode || title ? (
            <div
              ref={titleRef}
              className={`absolute inset-0 flex m-0 px-[6%] font-bold leading-none tracking-[-0.03em] text-white [font-size:var(--se-title-size)] [text-shadow:0_4px_12px_rgba(0,0,0,0.85),0_12px_40px_rgba(0,0,0,0.65),0_2px_6px_rgba(0,0,0,0.9)] pointer-events-none [will-change:opacity,transform] z-[2] ${
                overlayAlign === 'left'
                  ? 'items-center justify-start text-left'
                  : 'items-center justify-center text-center'
              }`}
            >
              {titleNode || title}
            </div>
          ) : null}
          {scrollHint ? (
            <div
              ref={hintRef}
              className="absolute inset-x-0 bottom-6 flex flex-col items-center justify-center gap-2 text-center pointer-events-none [will-change:opacity,transform] z-[4]"
            >
              <span className="text-[0.875rem] font-bold tracking-[0.08em] uppercase text-[#061748] bg-white/85 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-[0_4px_16px_rgba(6,23,72,0.18)]">
                {scrollHint}
              </span>
              <button
                type="button"
                onClick={() => {
                  const stage = stageRef.current;
                  if (!stage) return;
                  const target = useWindowScroll
                    ? trackRef.current?.getBoundingClientRect().top ?? 0
                    : stage.clientHeight;
                  if (useWindowScroll) {
                    window.scrollTo({ top: Math.max(0, window.scrollY + target), behavior: 'smooth' });
                  } else {
                    rootRef.current?.scrollTo({ top: target, behavior: 'smooth' });
                  }
                }}
                className="pointer-events-auto group flex items-center justify-center w-10 h-10 rounded-full bg-[#061748] text-white shadow-[0_6px_20px_rgba(6,23,72,0.35)] hover:bg-[#C4D600] hover:text-[#061748] transition-colors duration-300 cursor-pointer"
                aria-label="Rolar para explorar"
              >
                <span className="material-symbols-outlined text-[20px] animate-bounce">arrow_downward</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;