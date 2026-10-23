import React, { useState } from 'react';
import { CATALOG_PRODUCTS } from '../data/mockData';
import { EyewearProduct } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: EyewearProduct) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectProduct }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = CATALOG_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.material.toLowerCase().includes(query.toLowerCase()) ||
    p.shape.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[max(1rem,env(safe-area-inset-top))] sm:pt-20 p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 flex flex-col max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-[#e0e3e5] flex items-center gap-2 sm:gap-3 bg-[#f2f4f6]">
          <span className="material-symbols-outlined text-[20px] sm:text-[24px] text-[#4156b8]">search</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar armações, titânio, acetato, polarizados..."
            className="flex-1 bg-transparent text-sm font-medium text-[#191c1e] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#45464f] hover:text-[#191c1e] font-bold"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#eceef0] flex items-center justify-center text-xs text-[#45464f] hover:bg-[#c6c5d0] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Results */}
        <div className="p-3 sm:p-4 max-h-[min(20rem,calc(100dvh-8rem))] overflow-y-auto flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#45464f]">
              Nenhuma armação encontrada para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((prod) => (
              <div
                key={prod.id}
                onClick={() => {
                  onSelectProduct(prod);
                  onClose();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f2f4f6] transition-colors cursor-pointer border border-transparent hover:border-[#e0e3e5]"
              >
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-12 h-12 object-contain bg-[#f2f4f6] rounded-lg p-1 border border-[#c6c5d0]/30"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#061748] truncate">{prod.name}</h4>
                  <span className="text-[11px] text-[#45464f] block truncate">
                    {prod.material} • {prod.shape}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#061748]">
                  R$ {prod.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
