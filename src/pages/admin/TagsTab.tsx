import React, { useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { useToast } from '../../components/ToastContext';
import { CATALOG_PRODUCTS } from '../../data/mockData';
import { assignProductsToTag, createProductTag, deleteProductTag, getProductTags, ProductTagRule, ProductTagWithRules, useSiteData } from '../../lib/siteStore';
import { Card, Field, inputCls, Modal, Notice, Pagination, primaryBtn } from './ui';

const TAG_RULE_ATTRIBUTES: { value: ProductTagRule['attribute']; label: string }[] = [
  { value: 'brand', label: 'Marca' },
  { value: 'category', label: 'Categoria' },
  { value: 'subcategory', label: 'Subcategoria' },
  { value: 'material', label: 'Material' },
  { value: 'shape', label: 'Formato' },
];

const TagsTab: React.FC = () => {
  useSiteData();
  const toast = useToast();
  const tags = getProductTags();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4156b8');
  const [linkMode, setLinkMode] = useState<'products' | 'attribute'>('products');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [ruleAttr, setRuleAttr] = useState<ProductTagRule['attribute']>('brand');
  const [ruleValue, setRuleValue] = useState('');
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
  const [saving, setSaving] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
  const subcategories = [...new Set(CATALOG_PRODUCTS.map((product) => product.subcategory).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, 'pt-BR')) as string[];
  const hasProductFilters = productCategory !== 'all' || productBrand !== 'all' || productMaterial !== 'all' || productShape !== 'all' || Boolean(productQuery);

  const ruleAttributeOptions: Record<ProductTagRule['attribute'], { label: string; value: string }[]> = {
    brand: brands.map((b) => ({ label: b, value: b })),
    category: categories.map((c) => ({ label: categoryLabels[c] ?? c, value: c })),
    subcategory: subcategories.map((s) => ({ label: s, value: s })),
    material: materials.map((m) => ({ label: m, value: m })),
    shape: shapes.map((s) => ({ label: s, value: s })),
  };

  const currentRuleOptions = ruleAttributeOptions[ruleAttr] ?? [];

  const submit = async (event: React.FormEvent) => {
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

    const payloadRules: ProductTagRule[] = linkMode === 'attribute' && ruleValue.trim()
      ? [{ attribute: ruleAttr, value: ruleValue.trim() }]
      : [];
    const payloadProducts = linkMode === 'products' ? selectedProductIds : [];

    setSaving(true);
    const saved = await createProductTag({
      id: '',
      name: normalizedName,
      color,
      rules: payloadRules,
      assignedProductIds: payloadProducts,
    });
    setSaving(false);

    if (!saved) {
      setMessage(null);
      toast.error('Não foi possível criar a tag', 'Verifique sua conexão ou tente novamente.');
      return;
    }
    setName('');
    setColor('#4156b8');
    setLinkMode('products');
    setSelectedProductIds([]);
    setRuleAttr('brand');
    setRuleValue('');
    setCreateModalOpen(false);
    setPage(Math.ceil((tags.length + 1) / pageSize));
    setMessage(null);
    toast.success('Tag criada', normalizedName);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setName('');
    setColor('#4156b8');
    setLinkMode('products');
    setSelectedProductIds([]);
    setRuleAttr('brand');
    setRuleValue('');
    setCreateModalOpen(false);
  };

  const remove = async (id: string) => {
    const tag = tags.find((item) => item.id === id);
    const ok = await deleteProductTag(id);
    if (!ok) {
      setMessage(null);
      toast.error('Não foi possível remover a tag', 'Verifique sua conexão ou tente novamente.');
    } else {
      setPage((current) => Math.min(current, Math.max(Math.ceil((tags.length - 1) / pageSize), 1)));
      setMessage(null);
      toast.success('Tag removida', tag?.name);
    }
  };

  const toggleProductAssignment = async (tagId: string, productId: string, checked: boolean) => {
    const tag = tags.find((item) => item.id === tagId);
    if (!tag) return;
    const assignedIds = tag.assignedProductIds ?? [];
    const nextIds = checked
      ? [...assignedIds, productId]
      : assignedIds.filter((id) => id !== productId);
    const ok = await assignProductsToTag(tagId, nextIds);
    if (!ok) {
      setLinkError('Falha ao salvar vínculo.');
      toast.error('Não foi possível atualizar os produtos vinculados', 'Verifique sua conexão.');
    } else {
      setLinkError(null);
      toast.success(checked ? 'Produto vinculado à tag' : 'Vínculo removido', tag.name);
    }
  };

  const linkingTag = tags.find((tag) => tag.id === linkingTagId) ?? null;
  const linkingAssignedIds = linkingTag?.assignedProductIds ?? [];
  const allMatchingProductsAssigned = matchingProducts.length > 0 && matchingProducts.every((product) => linkingAssignedIds.includes(product.id));

  const toggleAllMatchingProducts = async () => {
    if (!linkingTag) return;
    const matchingIds = new Set(matchingProducts.map((product) => product.id));
    const nextIds = allMatchingProductsAssigned
      ? linkingAssignedIds.filter((id) => !matchingIds.has(id))
      : [...new Set([...linkingAssignedIds, ...matchingIds])];
    const ok = await assignProductsToTag(linkingTag.id, nextIds);
    if (!ok) {
      setLinkError('Falha ao salvar vínculo em lote.');
      toast.error('Não foi possível atualizar os produtos vinculados', 'Verifique sua conexão.');
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
      <Card
        title="Tags"
        subtitle={`${tags.length} ${tags.length === 1 ? 'tag cadastrada' : 'tags cadastradas'}`}
        action={
          <button onClick={() => setCreateModalOpen(true)} className={primaryBtn}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Criar tag
          </button>
        }
      >
        {tags.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9deea] px-5 py-10 text-center">
            <span className="material-symbols-outlined text-3xl text-[#9aa4b8]">sell</span>
            <p className="mt-2 text-sm font-semibold text-[#34415e]">Nenhuma tag criada ainda</p>
            <p className="mt-1 text-xs text-[#8992a4]">Clique em "Criar tag" para começar.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-[#767680]">
                    <th className="px-2 py-2 font-bold">Tag</th>
                    <th className="px-2 py-2 font-bold">Cor</th>
                    <th className="px-2 py-2 font-bold">Regras Automáticas</th>
                    <th className="px-2 py-2 font-bold">Produtos Vinculados</th>
                    <th className="px-2 py-2 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTags.map((tag) => {
                    const assignedIds = tag.assignedProductIds ?? [];
                    const tagRules = (tag as ProductTagWithRules).rules ?? [];
                    return (
                      <tr key={tag.id} className="border-t border-[#eceef0] hover:bg-[#f2f5ff] transition-colors">
                        <td className="px-2 py-3">
                          <span
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
                            style={{ backgroundColor: `${tag.color}1A`, color: tag.color }}
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded border border-[#e7ebf1]" style={{ backgroundColor: tag.color }} />
                            <span className="text-[11px] font-mono text-[#475569] uppercase">{tag.color}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {tagRules.length === 0 ? (
                            <span className="text-[11px] text-[#8992a4]">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {tagRules.slice(0, 3).map((r: ProductTagRule, i: number) => (
                                <span key={`${r.attribute}-${r.value}-${i}`} className="inline-flex items-center rounded bg-[#eef1fb] px-1.5 py-0.5 text-[10px] font-semibold text-[#4156b8]">
                                  {TAG_RULE_ATTRIBUTES.find((a) => a.value === r.attribute)?.label ?? r.attribute}: {r.value}
                                </span>
                              ))}
                              {tagRules.length > 3 && (
                                <span className="text-[10px] text-[#8992a4]">+{tagRules.length - 3}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <span className={`text-[11px] font-bold ${assignedIds.length > 0 ? 'text-emerald-600' : 'text-[#767680]'}`}>
                            {assignedIds.length} {assignedIds.length === 1 ? 'produto' : 'produtos'}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openLinkModal(tag.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#566176] transition hover:cursor-pointer hover:bg-[#f1f3f8]"
                            >
                              <span className="material-symbols-outlined text-[17px]">sell</span>
                              <span className="hidden sm:inline">Vincular</span>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
      {createModalOpen && (
        <Modal title="Criar tag" onClose={closeCreateModal} wide fixedHeight>
          <form onSubmit={submit} className="space-y-5 text-sm">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Nome da tag">
                <input
                  className={`${inputCls} text-sm`}
                  maxLength={32}
                  placeholder="Ex.: Novidade"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setMessage(null);
                  }}
                  autoFocus
                />
              </Field>
              <Field label="Cor">
                <div className="flex h-[46px] items-center gap-3 rounded-xl border border-[#c6c5d0] bg-white px-4">
                  <input
                    aria-label="Cor da tag"
                    type="color"
                    className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                  />
                  <span className="text-sm font-medium uppercase text-[#737d91]">{color}</span>
                </div>
              </Field>
            </div>

            <div className="rounded-xl border border-[#e8ebf1] bg-[#fafbfc] p-4 space-y-3">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#8992a4]">Vínculo</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setLinkMode('products'); setRuleValue(''); }}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-bold transition ${linkMode === 'products' ? 'border-[#4156b8] bg-[#eef0ff] text-[#4156b8]' : 'border-[#dfe5f4] bg-white text-[#566176] hover:bg-[#f8f9fc]'}`}
                >
                  Produtos individuais
                </button>
                <button
                  type="button"
                  onClick={() => { setLinkMode('attribute'); setSelectedProductIds([]); }}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-bold transition ${linkMode === 'attribute' ? 'border-[#4156b8] bg-[#eef0ff] text-[#4156b8]' : 'border-[#dfe5f4] bg-white text-[#566176] hover:bg-[#f8f9fc]'}`}
                >
                  Por atributo
                </button>
              </div>

              {linkMode === 'products' ? (
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-[#e8ebf1] bg-white">
                  {CATALOG_PRODUCTS.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#8992a4]">Nenhum produto disponível.</p>
                  ) : (
                    <ul className="divide-y divide-[#eceef0]">
                      {CATALOG_PRODUCTS.map((product) => {
                        const checked = selectedProductIds.includes(product.id);
                        return (
                          <li key={product.id}>
                            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[#f7f8fa]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedProductIds((prev) =>
                                    e.target.checked ? [...prev, product.id] : prev.filter((id) => id !== product.id),
                                  );
                                }}
                                className="h-5 w-5 accent-[#4156b8]"
                              />
                              <img src={product.image} alt="" className="h-10 w-12 rounded border border-[#eceef0] bg-white object-cover" />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#34415e]">{product.name}</span>
                              <span className="shrink-0 text-xs text-[#8992a4]">{product.brand}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {selectedProductIds.length > 0 && (
                    <p className="border-t border-[#eceef0] px-4 py-3 text-sm font-semibold text-[#4156b8]">
                      {selectedProductIds.length} {selectedProductIds.length === 1 ? 'produto selecionado' : 'produtos selecionados'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Field label="Atributo">
                    <select
                      className={`${inputCls} text-sm`}
                      value={ruleAttr}
                      onChange={(e) => {
                        setRuleAttr(e.target.value as ProductTagRule['attribute']);
                        setRuleValue('');
                      }}
                    >
                      {TAG_RULE_ATTRIBUTES.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Valor">
                    <select
                      className={`${inputCls} text-sm`}
                      value={ruleValue}
                      onChange={(e) => setRuleValue(e.target.value)}
                      disabled={currentRuleOptions.length === 0}
                    >
                      <option value="">Selecione...</option>
                      {currentRuleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#eceef0] pt-4">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="inline-flex h-[46px] items-center gap-2 rounded-lg border border-[#dfe5f4] px-5 text-sm font-semibold text-[#566176] transition hover:bg-[#f4f6ff] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className={`${primaryBtn} h-[46px] px-6 text-sm disabled:opacity-60`}>
                <span className="material-symbols-outlined text-[20px]">{saving ? 'progress_activity' : 'add'}</span>
                {saving ? 'Salvando...' : 'Criar tag'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TagsTab;
