import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATALOG_PRODUCTS } from '../data/mockData';
import { useWishlist } from '../components/WishlistContext';

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { ids, remove, clear } = useWishlist();
  const [query, setQuery] = useState('');
  const saved = ids
    .map((id) => CATALOG_PRODUCTS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const q = query.trim().toLowerCase();
  const products = q
    ? saved.filter((p) => [p.name, p.brand, p.colorName, p.shape].some((v) => v?.toLowerCase().includes(q)))
    : saved;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 pb-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#061748]">Lista de Desejos</h1>
          <p className="text-sm text-[#767680] mt-1">
            {q ? `${products.length} de ${saved.length} itens` : `${saved.length} ${saved.length === 1 ? 'item salvo' : 'itens salvos'}`}
          </p>
        </div>
        {saved.length > 0 && (
          <button onClick={clear} className="text-sm font-bold text-[#4156b8] hover:underline cursor-pointer">
            Limpar lista
          </button>
        )}
      </div>

      {saved.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8d96] text-[18px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar na lista de desejos..."
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-[#eceef0] rounded-lg bg-white focus:outline-none focus:border-[#4156b8] focus:ring-1 focus:ring-[#4156b8]/30 transition-all placeholder:text-[#b0b3ba]"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8a8d96] hover:text-[#061748] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      )}

      {saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-[#c6c5d0] mb-4">favorite</span>
          <h3 className="text-xl font-bold text-[#061748] mb-2">Sua lista de desejos está vazia</h3>
          <p className="text-[#767680] mb-6">Toque no coração dos produtos para salvá-los aqui.</p>
          <button
            onClick={() => navigate('/armacoes')}
            className="px-6 py-2 bg-[#061748] text-white rounded-full text-sm font-bold hover:bg-[#0a2060] transition-colors cursor-pointer"
          >
            Explorar armações
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-[#c6c5d0] mb-4">search_off</span>
          <h3 className="text-xl font-bold text-[#061748] mb-2">Nenhum item encontrado</h3>
          <p className="text-[#767680] mb-6">Nada na sua lista corresponde a "{query}".</p>
          <button onClick={() => setQuery('')} className="px-6 py-2 bg-[#4156b8] text-white rounded-full text-sm font-bold hover:bg-[#3445a0] transition-colors cursor-pointer">
            Limpar busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((prod) => (
            <div
              key={prod.id}
              onClick={() => navigate(`/produto/${prod.id}`)}
              className="group bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col cursor-pointer"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative">
                <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button
                  type="button"
                  aria-label="Remover da lista de desejos"
                  onClick={(e) => { e.stopPropagation(); remove(prod.id); }}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </button>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <p className="text-[10px] text-[#45464f] mb-0.5 uppercase tracking-wide">{prod.brand}</p>
                <h3 className="text-sm font-bold text-[#061748] mb-2 truncate">{prod.name}</h3>
                <p className="mt-auto text-lg font-black text-[#061748]">{fmt(prod.price)}</p>
                <p className="text-[11px] text-[#4156b8] font-semibold">ou 10x de {fmt(prod.price / 10)} sem juros</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
