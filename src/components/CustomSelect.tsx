import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface CustomSelectOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  textValue?: string;
  disabled?: boolean;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  options: readonly CustomSelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

interface PopupPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  className = '',
  id,
  name,
  disabled = false,
  'aria-label': ariaLabel,
}: CustomSelectProps<T>) {
  const generatedId = useId();
  const listboxId = `${generatedId}-options`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchRef = useRef('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const selectedOption = options.find((option) => option.value === value);

  const firstEnabledIndex = () => options.findIndex((option) => !option.disabled);
  const lastEnabledIndex = () => options.map((option) => !option.disabled).lastIndexOf(true);
  const selectedEnabledIndex = () => options.findIndex((option) => option.value === value && !option.disabled);

  const openList = (index = selectedEnabledIndex()) => {
    const nextIndex = index >= 0 ? index : firstEnabledIndex();
    setActiveIndex(nextIndex);
    setOpen(true);
  };

  const closeList = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const selectOption = (option: CustomSelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    closeList(true);
  };

  const moveActive = (direction: 1 | -1) => {
    if (!options.length) return;
    let index = activeIndex;
    for (let attempt = 0; attempt < options.length; attempt += 1) {
      index = (index + direction + options.length) % options.length;
      if (!options[index].disabled) {
        setActiveIndex(index);
        return;
      }
    }
  };

  const handleTypeahead = (key: string) => {
    searchRef.current += key.toLocaleLowerCase();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchRef.current = '';
    }, 500);

    const start = Math.max(activeIndex, 0);
    for (let offset = 1; offset <= options.length; offset += 1) {
      const index = (start + offset) % options.length;
      const option = options[index];
      const text = (option.textValue ?? optionRefs.current[index]?.textContent ?? '').trim().toLocaleLowerCase();
      if (!option.disabled && text.startsWith(searchRef.current)) {
        setActiveIndex(index);
        return;
      }
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 8;
      const gap = 6;
      const width = Math.min(rect.width, window.innerWidth - margin * 2);
      const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);
      const roomBelow = Math.max(0, window.innerHeight - rect.bottom - margin);
      const roomAbove = Math.max(0, rect.top - margin);
      const desiredHeight = Math.min(options.length * 40 + 8, 240);
      const placeAbove = roomBelow < Math.min(desiredHeight, 160) && roomAbove > roomBelow;
      const room = placeAbove ? roomAbove : roomBelow;
      const maxHeight = Math.max(80, Math.min(240, room));
      const visibleHeight = Math.min(desiredHeight, maxHeight);

      setPosition({
        top: placeAbove ? Math.max(margin, rect.top - gap - visibleHeight) : rect.bottom + gap,
        left,
        width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listboxRef.current?.contains(target)) {
        closeList();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) openList(event.key === 'ArrowUp' ? lastEnabledIndex() : selectedEnabledIndex());
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeList();
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(firstEnabledIndex());
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(lastEnabledIndex());
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (options[activeIndex]) selectOption(options[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        closeList(true);
        break;
      case 'Tab':
        closeList();
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          handleTypeahead(event.key);
        }
    }
  };

  return (
    <>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => open ? closeList() : openList()}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-[#d8dee8] bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-[#24324b] outline-none transition hover:border-[#aab5ce] focus:border-[#4156b8] focus:ring-2 focus:ring-[#4156b8]/20 disabled:cursor-not-allowed disabled:bg-[#f7f9fb] disabled:text-[#929bad] ${className}`}
      >
        <span className="min-w-0 truncate">{selectedOption?.label ?? ''}</span>
        <span
          aria-hidden="true"
          className={`material-symbols-outlined shrink-0 text-[18px] text-[#7d879a] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && position && createPortal(
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-[#e1e6ef] bg-white p-1.5 shadow-[0_12px_32px_rgba(20,35,68,0.18)]"
          style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;
            return (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                tabIndex={active ? 0 : -1}
                disabled={option.disabled}
                onClick={() => selectOption(option)}
                onKeyDown={handleOptionKeyDown}
                className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  selected
                    ? 'bg-[#eef1fb] font-semibold text-[#344a9a]'
                    : active
                      ? 'bg-[#f5f7fb] text-[#24324b]'
                      : 'text-[#47536a] hover:bg-[#f5f7fb]'
                }`}
              >
                <span className="min-w-0">{option.label}</span>
                {selected && <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-[#4156b8]">check</span>}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
