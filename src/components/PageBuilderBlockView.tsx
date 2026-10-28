import React from 'react';
import type { PageBuilderBlock } from '../lib/siteStore';

interface PageBuilderBlockViewProps {
  block: PageBuilderBlock;
  className?: string;
  style?: React.CSSProperties;
}

export const PageBuilderBlockView: React.FC<PageBuilderBlockViewProps> = ({ block, className = '', style: layoutStyle }) => {
  if (block.type === 'spacer') {
    return <div aria-hidden="true" className={className} style={{ ...layoutStyle, height: block.height }} />;
  }

  const alignmentClass = {
    left: 'mr-auto text-left',
    center: 'mx-auto text-center',
    right: 'ml-auto text-right',
  }[block.align];
  const widthClass = block.width === 'half' ? 'w-full md:w-1/2' : 'w-full';
  const blockStyle = { backgroundColor: block.backgroundColor, color: block.textColor };

  return (
    <section className={`w-full px-4 py-6 sm:px-8 ${className}`} style={{ ...layoutStyle, backgroundColor: block.backgroundColor }}>
      <div className={`max-w-[1440px] ${widthClass} ${alignmentClass} rounded-xl p-4 sm:p-6`} style={blockStyle}>
        {block.type === 'heading' && <h2 className="text-2xl font-bold sm:text-3xl">{block.content || 'Título'}</h2>}
        {block.type === 'text' && <p className="whitespace-pre-wrap leading-relaxed">{block.content || 'Adicione seu texto aqui.'}</p>}
        {block.type === 'image' && block.src && (
          <img src={block.src} alt={block.content} className="mx-auto max-h-[560px] w-full rounded-lg object-cover" loading="lazy" />
        )}
        {block.type === 'image' && !block.src && (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-current/30 text-sm opacity-70">
            Adicione uma imagem pelo editor
          </div>
        )}
        {block.type === 'button' && (
          <a
            href={block.url || '#'}
            className="inline-flex rounded-lg px-5 py-3 font-bold no-underline"
            style={{ backgroundColor: block.textColor, color: block.backgroundColor }}
          >
            {block.content || 'Saiba mais'}
          </a>
        )}
      </div>
    </section>
  );
};
