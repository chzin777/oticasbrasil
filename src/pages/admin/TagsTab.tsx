import React, { useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import { CATALOG_PRODUCTS } from '../../data/mockData';
import { assignProductsToTag, createProductTag, deleteProductTag, getProductTags, useSiteData } from '../../lib/siteStore';
import { Card, Field, inputCls, Modal, Notice, Pagination, primaryBtn, STORAGE_FULL_MSG } from './ui';

const TagsTab: React.FC = () => {
  useSiteData();
  const toast = useToast();
  const tags = getProductTags();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4156b8');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [linkingTagId, setLinkingTagId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productBrand, setProductBrand] = useState('all');
  const [productMaterial, setProductMaterial] = useState('all');
  const [productShape, setProductShape] = useState('all');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const pageCount = Math.ceil(tags.length / pageSize);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const pageStart = (currentPage - 1) * pageSize;
  const visibleTags = tags.slice(pageStart, pageStart + pageSize);
  const productSearch = productQuery.trim().toLocaleLowerCase('pt-BR');
  const categoryLabels: Record<string, string> = {
    armacoes: 'Armações',
    'oculos-de-sol': 'Óculos de sol',
    'lentes-de-grau': 'Lentes de grau',
    'rayban-meta': 'Ray-Ban Meta',
  };
  const matchingProducts = CATALOG_PRODUCTS.filter((product) => (
    (!productSearch ||
      product.name.toLocaleLowerCase('pt-BR').includes(productSearch) ||
      product.brand.toLocaleLowerCase('pt-BR').includes(productSearch)) &&
    (productCategory === 'all' || product.category === productCategory) &&
    (productBrand === 'all' || product.brand === productBrand) &&
    (productMaterial === 'all' || product.material === productMaterial) &&
    (productShape === 'all' || product.shape === productShape)
  ));
  const categories = [...new Set(CATALOG_PRODUCTS.map((product) => product.category))];
  const brands = [...new Set(CATALOG_PRODUCTS.map((product) => product.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const materials = [...new Set(CATALOG_PRODUCTS.map((product) => product.material).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const shapes = [...new Set(CATALOG_PRODUCTS.map((product) => product.shape).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const hasProductFilters = productCategory !== 'all' || productBrand !== 'all' || productMaterial !== 'all' || productShape !== 'all' || Boolean(productQuery);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setMessage(null);
      toast.error('Nome da tag obrigatório', 'Digite um nome para a tag.');
      return;
    }
    if (tags.some((tag) => tag.name.toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR'))) {
      setMessage(null);
      toast.error('Tag já existe', 'Já existe uma tag com esse nome.');
      return;
    }

    const saved = createProductTag({
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      color,
    });
    if (!saved) {
      setMessage(null);
      toast.error('Não foi possível criar a tag', STORAGE_FULL_MSG);
      return;
    }
    setName('');
    setPage(Math.ceil((tags.length + 1) / pageSize));
    setMessage(null);
    toast.success('Tag criada', normalizedName);
  };

  const remove = (id: string) => {
    const tag = tags.find((item) => item.id === id);
    if (!deleteProductTag(id)) {
      setMessage(null);
      toast.error('Não foi possível remover a tag', STORAGE_FULL_MSG);
    }
    else {
      setPage((current) => Math.min(current, Math.max(Math.ceil((tags.length - 1) / pageSize), 1)));
      setMessage(null);
      toast.success('Tag removida', tag?.name);
    }
  };

  const toggleProductAssignment = (tagId: string, productId: string, checked: boolean) => {
    const tag = tags.find((item) => item.id === tagId);
    if (!tag) return;
    const assignedIds = tag.assignedProductIds ?? [];
    const nextIds = checked
      ? [...assignedIds, productId]
      : assignedIds.filter((id) => id !== productId);
    if (!assignProductsToTag(tagId, nextIds)) {
      setLinkError(STORAGE_FULL_MSG);
      toast.error('Não foi possível atualizar os produtos vinculados', STORAGE_FULL_MSG);
    } else {
      setLinkError(null);
      toast.success(checked ? 'Produto vinculado à tag' : 'Vínculo removido', tag.name);
    }
  };

  const linkingTag = tags.find((tag) => tag.id === linkingTagId) ?? null;
  const linkingAssignedIds = linkingTag?.assignedProductIds ?? [];
  const allMatchingProductsAssigned = matchingProducts.length > 0 && matchingProducts.every((product) => linkingAssignedIds.includes(product.id));

  const toggleAllMatchingProducts = () => {
    if (!linkingTag) return;
    const matchingIds = new Set(matchingProducts.map((product) => product.id));
    const nextIds = allMatchingProductsAssigned
      ? linkingAssignedIds.filter((id) => !matchingIds.has(id))
      : [...new Set([...linkingAssignedIds, ...matchingIds])];
    if (!assignProductsToTag(linkingTag.id, nextIds)) {
      setLinkError(STORAGE_FULL_MSG);
      toast.error('Não foi possível atualizar os produtos vinculados', STORAGE_FULL_MSG);
    } else {
      setLinkError(null);
      toast.success(allMatchingProductsAssigned ? 'Vínculos removidos' : 'Produtos vinculados', `${matchingIds.size} produtos atualizados na tag ${linkingTag.name}.`);
    }
  };

  const openLinkModal = (tagId: string) => {
    setLinkingTagId(tagId);
    setProductQuery('');
    setProductCategory('all');
    setProductBrand('all');
    setProductMaterial('all');
    setProductShape('all');
    setLinkError(null);
  };

  const closeLinkModal = () => {
    setLinkingTagId(null);
    setProductQuery('');
    setProductCategory('all');
    setProductBrand('all');
    setProductMaterial('all');
    setProductShape('all');
    setLinkError(null);
  };

  return (
    <div className="space-y-5">
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <Card title="Criar tag" subtitle="Crie etiquetas para organizar e identificar seus produtos.">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <Field label="Nome da tag">
            <input
              className={inputCls}
              maxLength={32}
              placeholder="Ex.: Novidade"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setMessage(null);
              }}
            />
          </Field>
          <Field label="Cor">
            <div className="flex h-[42px] items-center gap-2 rounded-xl border border-[#c6c5d0] bg-white px-3">
              <input
                aria-label="Cor da tag"
                type="color"
                className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
              <span className="text-xs font-medium uppercase text-[#737d91]">{color}</span>
            </div>
          </Field>
          <button type="submit" className={`${primaryBtn} h-[42px]`}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Criar tag
          </button>
        </form>
      </Card>

      <Card title="Tags cadastradas" subtitle={`${tags.length} ${tags.length === 1 ? 'tag cadastrada' : 'tags cadastradas'}`}>
        {tags.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9deea] px-5 py-10 text-center">
            <span className="material-symbols-outlined text-3xl text-[#9aa4b8]">sell</span>
            <p className="mt-2 text-sm font-semibold text-[#34415e]">Nenhuma tag criada ainda</p>
            <p className="mt-1 text-xs text-[#8992a4]">As tags criadas aparecerão aqui para você gerenciar.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[#eceef0]">
              {visibleTags.map((tag) => {
                const assignedIds = tag.assignedProductIds ?? [];
                return (
                  <li key={tag.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
                          style={{ backgroundColor: `${tag.color}1A`, color: tag.color }}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                          <span className="truncate">{tag.name}</span>
                        </span>
                        <span className="hidden text-xs text-[#8992a4] sm:inline">
                          {assignedIds.length} {assignedIds.length === 1 ? 'produto' : 'produtos'}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openLinkModal(tag.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#566176] transition hover:cursor-pointer hover:bg-[#f1f3f8]"
                        >
                          <span className="material-symbols-outlined text-[17px]">sell</span>
                          <span className="hidden sm:inline">Vincular produtos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(tag.id)}
                          aria-label={`Remover tag ${tag.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8992a4] transition hover:cursor-pointer hover:bg-red-50 hover:text-red-600"
                        >
                          <span className="material-symbols-outlined text-[19px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              total={tags.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>
      <p className="px-1 text-xs text-[#8992a4]">Tags ficam salvas neste navegador e podem ser incluídas no backup do painel.</p>
      {linkingTag && (
        <Modal title={`Vincular produtos · ${linkingTag.name}`} onClose={closeLinkModal} wide>
          <div className="space-y-4">
            {linkError && <Notice kind="error">{linkError}</Notice>}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-[#34415e]">{linkingAssignedIds.length} produtos selecionados</p>
                <p className="mt-0.5 text-xs text-[#8992a4]">{matchingProducts.length} {matchingProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'} com os filtros atuais.</p>
              </div>
              <button
                type="button"
                disabled={matchingProducts.length === 0}
                onClick={toggleAllMatchingProducts}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dfe5f4] px-3 py-2 text-xs font-semibold text-[#4156b8] transition hover:cursor-pointer hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[17px]">{allMatchingProductsAssigned ? 'remove_done' : 'select_all'}</span>
                {allMatchingProductsAssigned ? 'Desmarcar resultados' : 'Selecionar resultados'}
              </button>
            </div>
            <div className="space-y-3 rounded-xl border border-[#e8ebf1] bg-[#f8f9fc] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#34415e]">
                  <span className="material-symbols-outlined text-[17px] text-[#65749b]">filter_list</span>
                  Filtrar catálogo
                </p>
                {hasProductFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductQuery('');
                      setProductCategory('all');
                      setProductBrand('all');
                      setProductMaterial('all');
                      setProductShape('all');
                    }}
                    className="text-[11px] font-semibold text-[#4156b8] transition hover:text-[#061748]"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#929bad]">search</span>
                <input
                  className={`${inputCls} !pl-10`}
                  aria-label={`Buscar produtos para a tag ${linkingTag.name}`}
                  placeholder="Buscar produto ou marca..."
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Tipo / categoria">
                  <CustomSelect
                    className={inputCls}
                    value={productCategory}
                    onChange={setProductCategory}
                    options={[
                      { value: 'all', label: 'Todas as categorias' },
                      ...categories.map((category) => ({ value: category, label: categoryLabels[category] ?? category })),
                    ]}
                  />
                </Field>
                <Field label="Marca">
                  <CustomSelect
                    className={inputCls}
                    value={productBrand}
                    onChange={setProductBrand}
                    options={[
                      { value: 'all', label: 'Todas as marcas' },
                      ...brands.map((brand) => ({ value: brand, label: brand })),
                    ]}
                  />
                </Field>
                <Field label="Material">
                  <CustomSelect
                    className={inputCls}
                    value={productMaterial}
                    onChange={setProductMaterial}
                    options={[
                      { value: 'all', label: 'Todos os materiais' },
                      ...materials.map((material) => ({ value: material, label: material })),
                    ]}
                  />
                </Field>
                <Field label="Formato">
                  <CustomSelect
                    className={inputCls}
                    value={productShape}
                    onChange={setProductShape}
                    options={[
                      { value: 'all', label: 'Todos os formatos' },
                      ...shapes.map((shape) => ({ value: shape, label: shape })),
                    ]}
                  />
                </Field>
              </div>
            </div>
            {matchingProducts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d9deea] py-8 text-center text-sm text-[#8992a4]">Nenhum produto encontrado.</p>
            ) : (
              <ul className="max-h-[min(52vh,480px)] divide-y divide-[#e8ebf1] overflow-y-auto rounded-lg border border-[#e8ebf1] bg-white">
                {matchingProducts.map((product) => {
                  const assigned = linkingAssignedIds.includes(product.id);
                  return (
                    <li key={product.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-[#f7f8fa] sm:px-4">
                        <input
                          type="checkbox"
                          checked={assigned}
                          onChange={(event) => toggleProductAssignment(linkingTag.id, product.id, event.target.checked)}
                          className="h-4 w-4 accent-[#4156b8]"
                        />
                        <img src={product.image} alt="" className="h-10 w-12 rounded-md border border-[#eceef0] bg-white object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-[#34415e]">{product.name}</span>
                          <span className="block truncate text-[10px] text-[#8992a4]">{product.brand}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-[#566176]">
                          {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-end border-t border-[#eceef0] pt-3">
              <button type="button" className={primaryBtn} onClick={closeLinkModal}>Concluir</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TagsTab;
