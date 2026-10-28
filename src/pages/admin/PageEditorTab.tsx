import React, { useEffect, useRef, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { CATALOG_PRODUCTS } from '../../data/mockData';
import {
  EDITABLE_FILTERS,
  EditableFilterKey,
  EditableLayoutPage,
  getEditableFilterOptions,
  getPageEditorConfig,
  saveEditableFilterOptions,
  savePageBuilderData,
  useSiteData,
} from '../../lib/siteStore';
import { pageBuilderEditorConfigFor, type PageBuilderData } from '../../lib/pageBuilder';
import { useToast } from '../../components/ToastContext';
import { Card, inputCls, primaryBtn, STORAGE_FULL_MSG } from './ui';

type EditorMode = EditableLayoutPage | 'filters';

const FILTER_LABELS = Object.fromEntries(EDITABLE_FILTERS.map(({ key, label }) => [key, label])) as Record<EditableFilterKey, string>;

const readProductFilterValue = (key: EditableFilterKey, product: typeof CATALOG_PRODUCTS[number]) => {
  switch (key) {
    case 'brand': return product.brand;
    case 'frameColor': return product.colorName;
    case 'shape': return product.shape;
    case 'material': return product.material.split(' ')[0];
    case 'bridgeSize': return product.specs.bridgeWidth;
  }
};

export const PageEditorTab: React.FC = () => {
  useSiteData();
  const toast = useToast();
  const [mode, setMode] = useState<EditorMode>('home');
  const [filterKey, setFilterKey] = useState<EditableFilterKey>('brand');
  const [newOption, setNewOption] = useState('');
  const pendingData = useRef<Partial<Record<EditableLayoutPage, PageBuilderData>>>({});
  const saveTimers = useRef<Partial<Record<EditableLayoutPage, number>>>({});

  const config = getPageEditorConfig();
  const availableOptions = [...new Set(CATALOG_PRODUCTS.map((product) => readProductFilterValue(filterKey, product)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const visibleOptions = getEditableFilterOptions(filterKey, availableOptions);
  const layoutPage = mode === 'filters' ? null : mode;

  const persistBuilderData = (page: EditableLayoutPage, data?: PageBuilderData) => {
    const nextData = data ?? pendingData.current[page];
    if (!nextData) return;
    if (!savePageBuilderData(page, nextData)) {
      toast.error('Não foi possível salvar o editor', STORAGE_FULL_MSG);
      return;
    }
    delete pendingData.current[page];
    if (saveTimers.current[page] !== undefined) {
      window.clearTimeout(saveTimers.current[page]);
      delete saveTimers.current[page];
    }
  };

  const scheduleBuilderSave = (page: EditableLayoutPage, data: PageBuilderData) => {
    pendingData.current[page] = data;
    if (saveTimers.current[page] !== undefined) window.clearTimeout(saveTimers.current[page]);
    saveTimers.current[page] = window.setTimeout(() => persistBuilderData(page), 600);
  };

  useEffect(() => () => {
    for (const page of ['home', 'product'] as const) {
      if (saveTimers.current[page] !== undefined) window.clearTimeout(saveTimers.current[page]);
      persistBuilderData(page);
    }
  }, []);

  const setOptionEnabled = (option: string, enabled: boolean) => {
    const selected = enabled
      ? [...visibleOptions, option]
      : visibleOptions.filter((value) => value !== option);
    if (!saveEditableFilterOptions(filterKey, availableOptions, selected)) {
      toast.error('Não foi possível salvar as opções do filtro', STORAGE_FULL_MSG);
    }
  };

  const addOption = (event: React.FormEvent) => {
    event.preventDefault();
    const value = newOption.trim();
    if (!value) return;
    if (visibleOptions.some((option) => option.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      toast.error('Opção já existe', 'Escolha um valor diferente para este filtro.');
      return;
    }
    if (!saveEditableFilterOptions(filterKey, availableOptions, [...visibleOptions, value])) {
      toast.error('Não foi possível salvar a opção', STORAGE_FULL_MSG);
      return;
    }
    setNewOption('');
    toast.success('Opção adicionada', value);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Área do editor">
        {([
          ['home', 'Página inicial'],
          ['product', 'Detalhe do produto'],
          ['filters', 'Filtros do catálogo'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${mode === value ? 'border-[#4156b8] bg-[#eef1fb] text-[#142344]' : 'border-[#e1e5ec] bg-white text-[#68748a] hover:bg-[#f7f8fa]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {layoutPage && (
        <div className="overflow-hidden rounded-2xl border border-[#dfe4ed] bg-white">
          <Puck
            key={layoutPage}
            config={pageBuilderEditorConfigFor(layoutPage)}
            data={config.puck[layoutPage]}
            onChange={(data) => scheduleBuilderSave(layoutPage, data)}
            onPublish={(data) => {
              persistBuilderData(layoutPage, data);
              toast.success('Página publicada', 'O conteúdo atualizado já está disponível na loja.');
            }}
            headerTitle={layoutPage === 'home' ? 'Página inicial' : 'Detalhe do produto'}
            height="min(78vh, 900px)"
            iframe={{ syncHostStyles: true }}
          />
        </div>
      )}

      {mode === 'filters' && (
        <Card
          title="Opções dos filtros"
          subtitle="As alterações valem para todas as páginas de catálogo. Opções personalizadas filtram produtos cujo cadastro tenha o mesmo valor."
        >
          <div className="max-w-sm">
            <label htmlFor="page-editor-filter" className="mb-1.5 block text-xs font-semibold text-[#47536a]">Filtro</label>
            <select
              id="page-editor-filter"
              className={inputCls}
              value={filterKey}
              onChange={(event) => setFilterKey(event.target.value as EditableFilterKey)}
            >
              {EDITABLE_FILTERS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <form onSubmit={addOption} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className={inputCls}
              value={newOption}
              maxLength={80}
              onChange={(event) => setNewOption(event.target.value)}
              placeholder={`Adicionar opção de ${FILTER_LABELS[filterKey].toLocaleLowerCase()}`}
              aria-label={`Nova opção para ${FILTER_LABELS[filterKey]}`}
            />
            <button type="submit" className={primaryBtn} disabled={!newOption.trim()}>
              <span className="material-symbols-outlined text-[18px]">add</span>Adicionar
            </button>
          </form>
          <div className="mt-4 divide-y divide-[#edf0f5] rounded-xl border border-[#e8ebf1]">
            {visibleOptions.map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-[#34415a]">
                <input type="checkbox" checked onChange={() => setOptionEnabled(option, false)} />
                <span>{option}</span>
                {!availableOptions.includes(option) && <span className="ml-auto text-xs text-[#8992a4]">Personalizada</span>}
              </label>
            ))}
            {availableOptions.filter((option) => !visibleOptions.includes(option)).map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-[#8992a4]">
                <input type="checkbox" checked={false} onChange={() => setOptionEnabled(option, true)} />
                <span>{option}</span>
              </label>
            ))}
            {!visibleOptions.length && !availableOptions.length && (
              <p className="px-4 py-6 text-center text-sm text-[#8992a4]">Nenhuma opção disponível.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-[#8992a4]">
            {visibleOptions.length} opção(ões) ativa(s). Opções adicionadas manualmente só encontrarão produtos quando o atributo correspondente estiver cadastrado no produto.
          </p>
        </Card>
      )}
    </section>
  );
};
