import React from 'react';
import { Render, type Config, type Data } from '@puckeditor/core';
import type { EditableLayoutPage } from './siteStore';
import {
  HomeHeroPreview,
  HomeFeaturedPreview,
  HomeBenefitsPreview,
  HomeExclusivePreview,
  HomeNewsletterPreview,
  HomeCollectionPreview,
  ProductDescriptionPreview,
  ProductSpecificationsPreview,
  ProductSimilarPreview,
} from '../components/PageBuilderPreviews';

type Alignment = 'left' | 'center' | 'right';
type Width = 'full' | 'threeQuarter' | 'half' | 'third';

interface HeadingProps {
  text: string;
  color: string;
  fontSize: number;
  align: Alignment;
  width: Width;
  backgroundColor: string;
  padding: number;
}

interface TextProps extends HeadingProps {}

interface ImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface ButtonProps {
  label: string;
  href: string;
  backgroundColor: string;
  color: string;
  align: Alignment;
}

interface SpacerProps {
  height: number;
}

export interface PageBuilderComponents {
  Heading: HeadingProps;
  Text: TextProps;
  Image: ImageProps;
  Button: ButtonProps;
  Spacer: SpacerProps;
}

export type PageBuilderData = Data;

const widthValues: Record<Width, string> = {
  full: '100%',
  threeQuarter: '75%',
  half: '50%',
  third: '33.333%',
};

const alignmentField = {
  type: 'select' as const,
  label: 'Alinhamento',
  options: [
    { label: 'Esquerda', value: 'left' },
    { label: 'Centro', value: 'center' },
    { label: 'Direita', value: 'right' },
  ],
};

const widthField = {
  type: 'select' as const,
  label: 'Largura',
  options: [
    { label: 'Total', value: 'full' },
    { label: '3/4', value: 'threeQuarter' },
    { label: 'Metade', value: 'half' },
    { label: '1/3', value: 'third' },
  ],
};

export const pageBuilderConfig: Config<PageBuilderComponents> = {
  categories: {
    content: {
      title: 'Conteúdo',
      components: ['Heading', 'Text', 'Image', 'Button', 'Spacer'],
      defaultExpanded: true,
    },
  },
  components: {
    Heading: {
      label: 'Título',
      fields: {
        text: { type: 'textarea', label: 'Texto' },
        color: { type: 'text', label: 'Cor do texto' },
        fontSize: { type: 'number', label: 'Tamanho da fonte' },
        align: alignmentField,
        width: widthField,
        backgroundColor: { type: 'text', label: 'Cor de fundo' },
        padding: { type: 'number', label: 'Espaçamento interno' },
      },
      defaultProps: {
        text: 'Novo título',
        color: '#142344',
        fontSize: 36,
        align: 'left',
        width: 'full',
        backgroundColor: 'transparent',
        padding: 16,
      },
      render: ({ text, color, fontSize, align, width, backgroundColor, padding }) => (
        <div style={{ width: widthValues[width], maxWidth: '100%', marginInline: align === 'center' ? 'auto' : align === 'right' ? '0 0 0 auto' : undefined, padding, backgroundColor }}>
          <h2 style={{ margin: 0, color, fontSize, textAlign: align, overflowWrap: 'anywhere' }}>{text}</h2>
        </div>
      ),
    },
    Text: {
      label: 'Texto',
      fields: {
        text: { type: 'textarea', label: 'Texto' },
        color: { type: 'text', label: 'Cor do texto' },
        fontSize: { type: 'number', label: 'Tamanho da fonte' },
        align: alignmentField,
        width: widthField,
        backgroundColor: { type: 'text', label: 'Cor de fundo' },
        padding: { type: 'number', label: 'Espaçamento interno' },
      },
      defaultProps: {
        text: 'Escreva seu texto aqui.',
        color: '#34415a',
        fontSize: 16,
        align: 'left',
        width: 'full',
        backgroundColor: 'transparent',
        padding: 16,
      },
      render: ({ text, color, fontSize, align, width, backgroundColor, padding }) => (
        <div style={{ width: widthValues[width], maxWidth: '100%', marginInline: align === 'center' ? 'auto' : align === 'right' ? '0 0 0 auto' : undefined, padding, backgroundColor }}>
          <p style={{ margin: 0, color, fontSize, textAlign: align, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text}</p>
        </div>
      ),
    },
    Image: {
      label: 'Imagem',
      fields: {
        src: { type: 'text', label: 'URL da imagem' },
        alt: { type: 'text', label: 'Texto alternativo' },
        width: { type: 'number', label: 'Largura (px)' },
        height: { type: 'number', label: 'Altura (px)' },
      },
      defaultProps: {
        src: '',
        alt: '',
        width: 800,
        height: 450,
      },
      render: ({ src, alt, width, height }) => (
        <div style={{ maxWidth: '100%', textAlign: 'center' }}>
          {src
            ? <img src={src} alt={alt} width={width} height={height} style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }} loading="lazy" />
            : <div style={{ minHeight: 180, display: 'grid', placeItems: 'center', border: '1px dashed #9aa2b1', color: '#68748a' }}>Adicione uma imagem pelo painel de propriedades</div>}
        </div>
      ),
    },
    Button: {
      label: 'Botão',
      fields: {
        label: { type: 'text', label: 'Texto do botão' },
        href: { type: 'text', label: 'Link' },
        backgroundColor: { type: 'text', label: 'Cor de fundo' },
        color: { type: 'text', label: 'Cor do texto' },
        align: alignmentField,
      },
      defaultProps: {
        label: 'Saiba mais',
        href: '/',
        backgroundColor: '#061748',
        color: '#ffffff',
        align: 'left',
      },
      render: ({ label, href, backgroundColor, color, align }) => (
        <div style={{ textAlign: align }}>
          <a href={safePageLink(href)} style={{ display: 'inline-block', padding: '12px 20px', borderRadius: 8, backgroundColor, color, fontWeight: 700, textDecoration: 'none' }}>
            {label}
          </a>
        </div>
      ),
    },
    Spacer: {
      label: 'Espaçador',
      fields: {
        height: { type: 'number', label: 'Altura (px)' },
      },
      defaultProps: { height: 48 },
      render: ({ height }) => <div aria-hidden="true" style={{ height }} />,
    },
  },
};

export interface NativeSectionDefinition {
  type: string;
  page: EditableLayoutPage;
  sectionId: string;
  label: string;
  description: string;
  accent: string;
}

export const NATIVE_SECTIONS: NativeSectionDefinition[] = [
  { type: 'HomeHero', page: 'home', sectionId: 'hero', label: 'Banner principal', description: 'Banner de destaque do topo. O conteúdo vem da aba Banners.', accent: '#4156b8' },
  { type: 'HomeFeatured', page: 'home', sectionId: 'featured', label: 'Os mais desejados', description: 'Vitrine com os produtos em destaque da loja.', accent: '#0f766e' },
  { type: 'HomeBenefits', page: 'home', sectionId: 'benefits', label: 'Benefícios da loja', description: 'Faixa azul com os diferenciais da Óticas Brasil.', accent: '#061748' },
  { type: 'HomeExclusive', page: 'home', sectionId: 'exclusive', label: 'Linha exclusiva', description: 'Seção com a linha exclusiva de produtos.', accent: '#9333ea' },
  { type: 'HomeNewsletter', page: 'home', sectionId: 'newsletter', label: 'Newsletter', description: 'Formulário de cadastro de e-mail.', accent: '#b45309' },
  { type: 'HomeCollection', page: 'home', sectionId: 'collection', label: 'Explore a coleção', description: 'Atalhos para as categorias do catálogo.', accent: '#be123c' },
  { type: 'ProductDescription', page: 'product', sectionId: 'description', label: 'Sobre o produto', description: 'Texto de descrição do produto.', accent: '#4156b8' },
  { type: 'ProductSpecifications', page: 'product', sectionId: 'specifications', label: 'Ficha técnica', description: 'Grade com as especificações do produto.', accent: '#0f766e' },
  { type: 'ProductSimilar', page: 'product', sectionId: 'similar', label: 'Produtos similares', description: 'Carrossel de produtos da mesma marca.', accent: '#9333ea' },
];

export const nativeSectionTypes = (page: EditableLayoutPage): string[] =>
  NATIVE_SECTIONS.filter((section) => section.page === page).map(({ type }) => type);

export const nativeSectionId = (type: string): string | undefined =>
  NATIVE_SECTIONS.find((section) => section.type === type)?.sectionId;

const NATIVE_SECTION_PREVIEWS: Record<string, React.FC> = {
  HomeHero: HomeHeroPreview,
  HomeFeatured: HomeFeaturedPreview,
  HomeBenefits: HomeBenefitsPreview,
  HomeExclusive: HomeExclusivePreview,
  HomeNewsletter: HomeNewsletterPreview,
  HomeCollection: HomeCollectionPreview,
  ProductDescription: ProductDescriptionPreview,
  ProductSpecifications: ProductSpecificationsPreview,
  ProductSimilar: ProductSimilarPreview,
};

const nativeSectionComponent = (section: NativeSectionDefinition) => {
  const Preview = NATIVE_SECTION_PREVIEWS[section.type];
  return {
    label: section.label,
    fields: {},
    defaultProps: {},
    permissions: { duplicate: false },
    render: () => Preview ? <Preview /> : (
      <section style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 120, padding: '24px 28px', backgroundColor: '#f7f8fb', borderLeft: `6px solid ${section.accent}`, borderBottom: '1px solid #e2e6ee' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: section.accent }}>
            Seção da loja
          </p>
          <h3 style={{ margin: '4px 0', fontSize: 22, color: '#142344' }}>{section.label}</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#68748a' }}>{section.description}</p>
        </div>
      </section>
    ),
  };
};

const editorConfigCache: Partial<Record<EditableLayoutPage, Config>> = {};

export const pageBuilderEditorConfigFor = (page: EditableLayoutPage): Config => {
  const cached = editorConfigCache[page];
  if (cached) return cached;
  const sections = NATIVE_SECTIONS.filter((section) => section.page === page);
  const built = {
    categories: {
      sections: {
        title: 'Seções da loja',
        components: sections.map(({ type }) => type),
        defaultExpanded: true,
      },
      ...pageBuilderConfig.categories,
    },
    components: {
      ...pageBuilderConfig.components,
      ...Object.fromEntries(sections.map((section) => [section.type, nativeSectionComponent(section)])),
    },
  } as unknown as Config;
  editorConfigCache[page] = built;
  return built;
};

// Posição (1, 2, 3...) de cada seção nativa no canvas; seção ausente = oculta.
export const getNativeSectionLayout = (data: PageBuilderData, page: EditableLayoutPage) => {
  const order: Record<string, number> = {};
  data.content.forEach((item, index) => {
    const sectionId = nativeSectionId(item.type);
    if (sectionId && NATIVE_SECTIONS.some((section) => section.type === item.type && section.page === page) && !(sectionId in order)) {
      order[sectionId] = index + 1;
    }
  });
  return {
    order,
    isHidden: (sectionId: string) => !(sectionId in order),
  };
};

export const hasNativeSectionLayout = (data: PageBuilderData): boolean =>
  (data.root as { props?: { nativeSections?: boolean } } | undefined)?.props?.nativeSections === true;

export const emptyPageBuilderData = (): PageBuilderData => ({
  root: { props: {} },
  content: [],
});

// Renderiza apenas os componentes livres; cada um recebe `order` conforme sua posição
// no canvas, para intercalar com as seções nativas dentro de um container flex.
export const PageBuilderRender: React.FC<{ data: PageBuilderData; interleave?: boolean }> = ({ data, interleave = false }) => (
  <>
    {data.content.map((item, index) => {
      if (nativeSectionId(item.type) || !(item.type in pageBuilderConfig.components)) return null;
      return (
        <div key={item.props.id} style={interleave ? { order: index + 1 } : undefined}>
          <Render config={pageBuilderConfig} data={{ root: data.root, content: [item] }} />
        </div>
      );
    })}
  </>
);

export const safePageLink = (value: string): string => {
  const link = value.trim().slice(0, 2048);
  return /^(https?:|mailto:|tel:|\/|#)/i.test(link) ? link : '#';
};
