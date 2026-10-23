import React, { useState } from 'react';
import { CATALOG_PRODUCTS, LENS_OPTIONS } from '../data/mockData';
import { EyewearProduct, OrderItem } from '../types';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau';
  onSelectProductForCheckout: (product: EyewearProduct, lensType: string) => void;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'armacoes',
  onSelectProductForCheckout
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'armacoes' | 'oculos-de-sol' | 'lentes-de-grau'>(initialCategory);
  const [selectedProduct, setSelectedProduct] = useState<EyewearProduct | null>(null);
  const [chosenLens, setChosenLens] = useState(LENS_OPTIONS[0]);

  if (!isOpen) return null;

  const filteredProducts = CATALOG_PRODUCTS.filter(
    (p) => selectedCategory === 'lentes-de-grau' || p.category === selectedCategory
  );

  const handleChooseProduct = (prod: EyewearProduct) => {
    setSelectedProduct(prod);
  };

  const handleApplyToCheckout = () => {
    if (selectedProduct) {
      onSelectProductForCheckout(selectedProduct, chosenLens.name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#061748] text-white p-4 sm:p-6 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#dbee2c]">
              Coleção Boutique Exclusiva
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Catálogo Óticas Brasil
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Categories Bar */}
        <div className="bg-[#f2f4f6] px-3 sm:px-6 py-3 border-b border-[#e0e3e5] flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedCategory('armacoes');
              setSelectedProduct(null);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'armacoes'
                ? 'bg-[#061748] text-white shadow-xs'
                : 'bg-white text-[#45464f] hover:bg-[#eceef0]'
            }`}
          >
            Armações de Grau
          </button>
          <button
            onClick={() => {
              setSelectedCategory('oculos-de-sol');
              setSelectedProduct(null);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'oculos-de-sol'
                ? 'bg-[#061748] text-white shadow-xs'
                : 'bg-white text-[#45464f] hover:bg-[#eceef0]'
            }`}
          >
            Óculos de Sol &amp; Polarizados
          </button>
          <button
            onClick={() => {
              setSelectedCategory('lentes-de-grau');
              setSelectedProduct(null);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'lentes-de-grau'
                ? 'bg-[#061748] text-white shadow-xs'
                : 'bg-white text-[#45464f] hover:bg-[#eceef0]'
            }`}
          >
            Tecnologia de Lentes
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          {!selectedProduct ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleChooseProduct(prod)}
                  className="bg-[#f2f4f6] hover:bg-white rounded-2xl p-4 border border-[#e0e3e5] hover:border-[#4156b8]/50 hover:shadow-md transition-all cursor-pointer flex flex-col group"
                >
                  <div className="relative w-full h-44 bg-white rounded-xl p-2 flex items-center justify-center overflow-hidden mb-3 border border-[#c6c5d0]/30">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                    {prod.badge && (
                      <span className="absolute top-2 left-2 bg-[#dbee2c] text-[#061748] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {prod.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-[10px] text-[#4156b8] font-bold uppercase tracking-wider">
                      {prod.brand}
                    </span>
                    <h3 className="text-sm font-bold text-[#061748] mt-0.5">{prod.name}</h3>
                    <p className="text-xs text-[#45464f] line-clamp-2 mt-1 leading-relaxed">
                      {prod.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-[#c6c5d0]/30 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-[#061748]">
                        R$ {prod.price.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs font-bold text-[#4156b8] group-hover:underline flex items-center gap-1">
                        <span>Configurar</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 animate-fadeIn">
              {/* Product Visual */}
              <div className="md:w-1/2 flex flex-col gap-3">
                <div className="w-full h-64 bg-white rounded-2xl p-4 flex items-center justify-center border border-[#c6c5d0]/30 shadow-xs">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-[#f2f4f6] p-4 rounded-xl text-xs flex flex-col gap-1 border border-[#e0e3e5]">
                  <span className="font-bold text-[#061748]">Especificações da Armação:</span>
                  <div className="grid grid-cols-2 gap-2 text-[#45464f] mt-1">
                    <div>Material: <strong className="text-[#191c1e]">{selectedProduct.material}</strong></div>
                    <div>Calibre: <strong className="text-[#191c1e]">{selectedProduct.calibre}</strong></div>
                    <div>Formato: <strong className="text-[#191c1e]">{selectedProduct.shape}</strong></div>
                    <div>Cor: <strong className="text-[#191c1e]">{selectedProduct.colorName}</strong></div>
                  </div>
                </div>
              </div>

              {/* Product Configurator */}
              <div className="md:w-1/2 flex flex-col gap-4">
                <div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs font-semibold text-[#4156b8] hover:underline flex items-center gap-1 mb-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                    <span>Voltar ao catálogo</span>
                  </button>
                  <h3 className="text-xl font-bold text-[#061748]">{selectedProduct.name}</h3>
                  <span className="text-sm text-[#45464f] block mt-0.5">
                    {selectedProduct.colorName} • {selectedProduct.calibre}
                  </span>
                  <span className="text-2xl font-extrabold text-[#061748] block mt-2">
                    R$ {(selectedProduct.price + chosenLens.includedPrice).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Lens Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#061748] uppercase tracking-wider">
                    Escolha a Tecnologia de Lentes:
                  </label>
                  {LENS_OPTIONS.map((lens) => (
                    <label
                      key={lens.id}
                      onClick={() => setChosenLens(lens)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                        chosenLens.id === lens.id
                          ? 'bg-[#dde1ff]/30 border-[#4156b8] ring-1 ring-[#4156b8]'
                          : 'bg-[#f2f4f6] border-[#e0e3e5] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#061748]">{lens.name}</span>
                        <span className="text-xs font-bold text-[#4156b8]">
                          {lens.includedPrice === 0 ? 'Incluso' : `+ R$ ${lens.includedPrice},00`}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#45464f] leading-snug">{lens.description}</p>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleApplyToCheckout}
                  className="w-full bg-[#dbee2c] text-[#061748] text-sm font-extrabold py-3.5 px-6 rounded-full hover:brightness-95 transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ir para Checkout com Esta Armação</span>
                  <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
