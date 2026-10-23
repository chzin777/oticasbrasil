import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATALOG_PRODUCTS } from '../data/mockData';
import { EyewearProduct } from '../types';
import { WishlistButton } from '../components/WishlistContext';
import { FilterSection, CheckboxItem } from '../components/FilterParts';

interface LensesPageProps {
  onSelectProductForCheckout: (product: EyewearProduct, lensType: string) => void;
  onNavigateHome: () => void;
}

interface Filters {
  gender: string[];
  brand: string[];
  priceRange: [number, number];
  frameColor: string[];
  lensColor: string[];
  shape: string[];
  faceShape: string[];
  material: string[];
  lensProtection: string[];
  bridgeSize: string[];
}

const INITIAL_FILTERS: Filters = {
  gender: [],
  brand: [],
  priceRange: [0, 2000],
  frameColor: [],
  lensColor: [],
  shape: [],
  faceShape: [],
  material: [],
  lensProtection: [],
  bridgeSize: [],
};

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Unissex'];
const FACE_SHAPE_OPTIONS = ['Redondo', 'Oval', 'Quadrado', 'Coração', 'Triangular'];
const LENS_PROTECTION_OPTIONS = ['UV400', 'Blue Light', 'Polarizado', 'Antirreflexo', 'Fotossensível'];

export const LensesPage: React.FC<LensesPageProps> = ({
  onSelectProductForCheckout,
  onNavigateHome,
}) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sunglassesProducts = useMemo(() => CATALOG_PRODUCTS.filter((p) => p.category === 'oculos-de-sol'), []);

  // Extract unique filter options from products
  const filterOptions = useMemo(() => {
    const brands = Array.from(new Set(sunglassesProducts.map((p) => p.brand))).sort();
    const shapes = Array.from(new Set(sunglassesProducts.map((p) => p.shape))).sort();
    const materials = Array.from(new Set(sunglassesProducts.map((p) => p.material.split(' ')[0]))).sort();
    const frameColors = Array.from(new Set(sunglassesProducts.map((p) => p.colorName))).sort();
    const bridgeSizes = Array.from(new Set(sunglassesProducts.map((p) => p.specs.bridgeWidth))).sort();
    const maxPrice = Math.max(...sunglassesProducts.map((p) => p.price));
    return { brands, shapes, materials, frameColors, bridgeSizes, maxPrice };
  }, [sunglassesProducts]);

  const toggleFilter = (category: keyof Filters, value: string) => {
    setFilters((prev) => {
      const current = prev[category] as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sunglassesProducts.filter((product) => {
      if (query && !(product.name.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query) || product.colorName.toLowerCase().includes(query))) return false;
      if (filters.brand.length > 0 && !filters.brand.includes(product.brand)) return false;
      if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) return false;
      if (filters.frameColor.length > 0 && !filters.frameColor.includes(product.colorName)) return false;
      if (filters.shape.length > 0 && !filters.shape.includes(product.shape)) return false;
      if (filters.material.length > 0 && !filters.material.some((m) => product.material.includes(m))) return false;
      if (filters.bridgeSize.length > 0 && !filters.bridgeSize.includes(product.specs.bridgeWidth)) return false;
      return true;
    });
  }, [sunglassesProducts, filters, searchQuery]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.gender.length) count += filters.gender.length;
    if (filters.brand.length) count += filters.brand.length;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < filterOptions.maxPrice) count++;
    if (filters.frameColor.length) count += filters.frameColor.length;
    if (filters.lensColor.length) count += filters.lensColor.length;
    if (filters.shape.length) count += filters.shape.length;
    if (filters.faceShape.length) count += filters.faceShape.length;
    if (filters.material.length) count += filters.material.length;
    if (filters.lensProtection.length) count += filters.lensProtection.length;
    if (filters.bridgeSize.length) count += filters.bridgeSize.length;
    return count;
  }, [filters, filterOptions.maxPrice]);

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const handleChooseProduct = (prod: EyewearProduct) => {
    navigate(`/produto/${prod.id}`);
  };

  // Sidebar Content
  const FilterSidebar = () => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[#061748] flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">tune</span>
          Filtros
        </h2>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-[#4156b8] hover:underline font-semibold cursor-pointer">
            Limpar ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8d96] text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar óculos de sol..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#eceef0] rounded-lg bg-white focus:outline-none focus:border-[#4156b8] focus:ring-1 focus:ring-[#4156b8]/30 transition-all placeholder:text-[#b0b3ba]"
          />
        </div>
      </div>

      {/* Gender */}
      <FilterSection title="Gênero">
        {GENDER_OPTIONS.map((g) => (
          <CheckboxItem key={g} label={g} checked={filters.gender.includes(g)} onClick={() => toggleFilter('gender', g)} />
        ))}
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Marca">
        {filterOptions.brands.map((b) => (
          <CheckboxItem key={b} label={b} checked={filters.brand.includes(b)} onClick={() => toggleFilter('brand', b)} count={sunglassesProducts.filter(p => p.brand === b).length} />
        ))}
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Faixa de Preço">
        <div className="px-1">
          <div className="flex items-center justify-between text-xs text-[#45464f] mb-2">
            <span>R$ {filters.priceRange[0]}</span>
            <span>R$ {filters.priceRange[1]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.ceil(filterOptions.maxPrice / 100) * 100}
            step={50}
            value={filters.priceRange[1]}
            onChange={(e) => setFilters(prev => ({ ...prev, priceRange: [prev.priceRange[0], Number(e.target.value)] }))}
            className="w-full accent-[#4156b8] h-1.5 bg-[#eceef0] rounded-lg appearance-none cursor-pointer"
          />
          <div className="mt-2 flex gap-2">
            {['Até R$ 700', 'R$ 700 - R$ 900', 'Acima R$ 900'].map((label, i) => {
              const ranges: [number, number][] = [[0, 700], [700, 900], [900, 2000]];
              const isActive = filters.priceRange[1] === ranges[i][1] || (i === 2 && filters.priceRange[1] >= 2000);
              return (
                <button
                  key={label}
                  onClick={() => setFilters(prev => ({ ...prev, priceRange: [ranges[i][0], ranges[i][1]] }))}
                  className={`flex-1 text-[10px] py-1.5 rounded-md border transition-all cursor-pointer ${isActive ? 'bg-[#4156b8] text-white border-[#4156b8]' : 'bg-white text-[#45464f] border-[#eceef0] hover:border-[#4156b8]/50'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </FilterSection>

      {/* Frame Color */}
      <FilterSection title="Cor da Armação">
        {filterOptions.frameColors.map((c) => (
          <CheckboxItem key={c} label={c} checked={filters.frameColor.includes(c)} onClick={() => toggleFilter('frameColor', c)} />
        ))}
      </FilterSection>

      {/* Shape */}
      <FilterSection title="Formato">
        {filterOptions.shapes.map((s) => (
          <CheckboxItem key={s} label={s} checked={filters.shape.includes(s)} onClick={() => toggleFilter('shape', s)} />
        ))}
      </FilterSection>

      {/* Face Shape */}
      <FilterSection title="Formato do Rosto">
        {FACE_SHAPE_OPTIONS.map((f) => (
          <CheckboxItem key={f} label={f} checked={filters.faceShape.includes(f)} onClick={() => toggleFilter('faceShape', f)} />
        ))}
      </FilterSection>

      {/* Material */}
      <FilterSection title="Material">
        {filterOptions.materials.map((m) => (
          <CheckboxItem key={m} label={m} checked={filters.material.includes(m)} onClick={() => toggleFilter('material', m)} />
        ))}
      </FilterSection>

      {/* Lens Protection */}
      <FilterSection title="Proteção da Lente">
        {LENS_PROTECTION_OPTIONS.map((l) => (
          <CheckboxItem key={l} label={l} checked={filters.lensProtection.includes(l)} onClick={() => toggleFilter('lensProtection', l)} />
        ))}
      </FilterSection>

      {/* Bridge Size */}
      <FilterSection title="Tamanho da Ponte">
        {filterOptions.bridgeSizes.map((b) => (
          <CheckboxItem key={b} label={b} checked={filters.bridgeSize.includes(b)} onClick={() => toggleFilter('bridgeSize', b)} />
        ))}
      </FilterSection>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f9fb] pb-20">
      {/* Breadcrumb / Navigation Bar (No Hero) */}
      <div className="bg-white border-b border-[#eceef0] py-3 px-4 sm:px-8 md:px-12 sticky top-[7rem] z-30">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs font-semibold text-[#4156b8] hover:text-[#061748] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>Início</span>
            </button>
            <span className="text-[#c6c5d0]">/</span>
            <h1 className="text-xl font-bold text-[#061748]">Óculos de Sol</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#767680] hidden sm:block">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </span>
            <button
              className="lg:hidden p-2 bg-[#f2f4f6] rounded-lg text-[#061748]"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-80 shrink-0 sticky top-28 bg-white rounded-2xl border border-[#eceef0] p-6 shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            {FilterSidebar()}
          </aside>

          {/* Mobile Filters Drawer */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-6 overflow-y-auto animate-slideInRight">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#061748]">Filtros</h2>
                  <button onClick={() => setMobileFiltersOpen(false)} className="p-1 text-[#767680]">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                {FilterSidebar()}
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full mt-6 bg-[#061748] text-white font-bold py-3 rounded-xl"
                >
                  Ver {filteredProducts.length} Resultados
                </button>
              </div>
            </div>
          )}

          {/* Product Grid */}
          <main className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-6xl text-[#c6c5d0] mb-4">search_off</span>
                <h3 className="text-xl font-bold text-[#061748] mb-2">Nenhum produto encontrado</h3>
                <p className="text-[#767680] mb-6">Tente ajustar os filtros para ver mais resultados.</p>
                <button onClick={clearFilters} className="px-6 py-2 bg-[#4156b8] text-white rounded-full text-sm font-bold hover:bg-[#3445a0] transition-colors cursor-pointer">
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredProducts.map((prod, index) => (
                  <div
                    key={prod.id}
                    onClick={() => handleChooseProduct(prod)}
                    className="group bg-white rounded-2xl overflow-hidden border border-[#eceef0] hover:shadow-xl hover:border-[#C4D600]/40 transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    {(() => {
                      const original = prod.originalPrice || Math.round(prod.price * 1.25);
                      const pixPrice = Math.round(prod.price * 0.9);
                      const installment = (prod.price / 10).toFixed(2).replace('.', ',');
                      const freeShipping = index % 3 === 0;
                      const discountPercent = original > prod.price ? Math.round(((original - prod.price) / original) * 100) : 0;
                      return (
                        <>
                          <div className="aspect-[4/3] overflow-hidden bg-[#eceef0] relative">
                            {freeShipping && (
                              <span className="absolute top-3 left-3 z-10 bg-[#061748] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                                Frete Grátis
                              </span>
                            )}
                            {discountPercent > 0 && (
                              <span className="absolute top-3 right-3 z-10 bg-[#C4D600] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                                -{discountPercent}%
                              </span>
                            )}
                            {prod.badge && !freeShipping && discountPercent === 0 && (
                              <span className="absolute top-3 left-3 z-10 bg-[#dbee2c] text-[#061748] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                                {prod.badge}
                              </span>
                            )}
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <WishlistButton productId={prod.id} className="absolute bottom-2 right-2" />
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <p className="text-[10px] text-[#45464f] mb-0.5 uppercase tracking-wide">{prod.brand}</p>
                            <h3 className="text-sm font-bold text-[#061748] mb-2 truncate leading-tight">{prod.name}</h3>
                            <div className="mt-auto space-y-1.5">
                              {original > prod.price && (
                                <p className="text-[11px] text-[#8a8d96] line-through">De R$ {original.toFixed(2).replace('.', ',')}</p>
                              )}
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black text-[#061748]">R$ {pixPrice.toFixed(2).replace('.', ',')}</span>
                                <span className="text-[10px] text-[#45464f]">à vista no PIX</span>
                              </div>
                              <p className="text-[11px] text-[#4156b8] font-semibold">
                                ou 10x de R$ {installment} sem juros
                              </p>
                              <div className="flex gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleChooseProduct(prod); }}
                                  className="flex-1 bg-[#061748] text-white text-xs font-bold py-2.5 rounded-lg hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer"
                                >
                                  Ver Produto
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};