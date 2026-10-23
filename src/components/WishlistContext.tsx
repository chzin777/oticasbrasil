import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'oticas-wishlist';

interface WishlistContextValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const load = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ids, setIds] = useState<string[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])),
    []
  );
  const remove = useCallback((id: string) => setIds((prev) => prev.filter((i) => i !== id)), []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(() => ({ ids, has, toggle, remove, clear }), [ids, has, toggle, remove, clear]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = (): WishlistContextValue => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};

export const WishlistToggle: React.FC<{ productId: string }> = ({ productId }) => {
  const { has, toggle } = useWishlist();
  const active = has(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
      title={active ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
      onClick={() => toggle(productId)}
      className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
        active ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-[#c6c5d0] text-[#45464f] hover:text-red-500 hover:border-red-200'
      }`}
    >
      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
        favorite
      </span>
    </button>
  );
};

export const WishlistButton: React.FC<{ productId: string; className?: string }> = ({ productId, className = '' }) => {
  const { has, toggle } = useWishlist();
  const active = has(productId);
  return (
    <button
      type="button"
      aria-label={active ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        toggle(productId);
      }}
      className={`w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center transition-opacity z-10 cursor-pointer ${
        active ? 'text-red-500 opacity-100' : 'text-[#4156b8] opacity-0 group-hover:opacity-100'
      } ${className}`}
    >
      <span
        className="material-symbols-outlined text-[16px]"
        style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
      >
        favorite
      </span>
    </button>
  );
};
