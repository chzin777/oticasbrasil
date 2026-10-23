import type { CSSProperties } from 'react';

interface HeroBackgroundProps {
 className?: string;
 style?: CSSProperties;
 theme?: 'default' | 'blackfriday';
 backgroundImage?: string;
}

/* ============================================================
HERO BACKGROUND — Grafismos da marca Óticas Brasil
Baseado FIELMENTE nos exemplos do manual (pág 15-17):
ESTÉTICA DOS EXEMPLOS REAIS (imagens 3 e 4):
- Formas GIGANTES ocupando 40-60% da tela cada uma
- Corte agressivo (bleed) — sangram para fora da tela
- Composição em blocos sólidos de cor que se sobrepõem
- Fundo azul-marinho escuro sólido (#061748)
- Paleta: Verde-limão #C4D600, Azul-marinho #061748,
Azul-médio #002cdb, Bege #d4dfa0
- Máx 3 elementos por composição, mas cada um é MASSIVO
COMPOSIÇÃO (inspirada no exemplo "banner" pág 17):
- Lado esquerdo: Bloco azul-médio com semi-círculos verdes
empilhados ocupando toda a altura
- Centro-direita: Círculo verde-limão MASSIVO cortado +
Diamante azul-marinho gigante intersectando
- Canto superior: Triângulo/Trapézio verde invertido
ocupando metade da largura
- Canto direito: Círculos azuis sobrepostos cortados
============================================================ */

const HeroBackground = ({ className = '', style, theme = 'default', backgroundImage }: HeroBackgroundProps) => {
 // Tema Black Friday: imagem de fundo black-bg.jpg com parallax
 if (theme === 'blackfriday') {
 return (
 <div
 className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
 aria-hidden="true"
 >
 <div className="hc-parallax-container" data-parallax-layers>
 <div
 className="hc-parallax-layer absolute inset-0"
 data-parallax-layer="1"
 style={{
 background: `url("${backgroundImage || '/black-bg.jpg'}") center/cover no-repeat`,
 ...style,
 }}
 />
 </div>
 </div>
 );
 }

 return (
<div
className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
style={style}
aria-hidden="true"
>
<svg
className="w-full h-full"
viewBox="0 0 1920 1080"
preserveAspectRatio="xMidYMid slice"
xmlns="http://www.w3.org/2000/svg"
>
{/* FUNDO: Azul-marinho escuro sólido */}
<rect width="1920" height="1080" fill="#061748" />

{/* === BLOCO 1 (Esquerda): Faixa vertical azul-médio com semi-círculos === */}
{/* Faixa de fundo azul-médio ocupando toda a altura */}
<rect x="0" y="0" width="480" height="1080" fill="#002cdb" opacity="0.4" />

{/* Semi-círculos empilhados GIGANTES (estilo pág 16 "SEMI-CÍRCULOS")
— cortados pela esquerda, ocupando toda a altura */}
<g fill="#C4D600">
<path d="M -80 180 A 200 200 0 0 1 320 180 Z" />
<path d="M -80 440 A 200 200 0 0 1 320 440 Z" />
<path d="M -80 700 A 200 200 0 0 1 320 700 Z" />
</g>

{/* === BLOCO 2 (Centro-Direita): Círculo Verde GIGANTE + Diamante Azul === */}
{/* Círculo verde-limão MASSIVO (sangrando para baixo e direita)
— ocupa 60% da altura */}
<circle cx="1150" cy="900" r="600" fill="#C4D600" />

{/* Diamante azul-marinho GIGANTE intersectando (estilo pág 15 "INTERSECÇÃO")
— ocupa 50% da tela */}
<rect
x="750"
y="100"
width="800"
height="800"
fill="#061748"
transform="rotate(45 1150 500)"
/>

{/* Círculo bege na intersecção (como no exemplo "INTERSECÇÃO + quadrado") */}
<circle cx="1150" cy="500" r="220" fill="#d4dfa0" opacity="0.95" />

{/* === BLOCO 3 (Topo): Triângulo/Trapézio verde invertido GIGANTE === */}
{/* Forma geométrica angular no topo ocupando metade da largura
(estilo exemplo pág 17) */}
<polygon points="1350,0 1920,0 1650,500" fill="#C4D600" />

{/* === BLOCO 4 (Direita): Círculos azuis sobrepostos GIGANTES === */}
{/* Círculo azul-médio grande cortado pela direita — ocupa 40% da altura */}
<circle cx="1880" cy="780" r="380" fill="#002cdb" />

{/* Círculo azul-marinho menor sobreposto (proporções variadas) */}
<circle cx="1780" cy="980" r="280" fill="#061748" />

{/* === DETALHE: Círculo verde pequeno flutuante (proporções variadas pág 16) === */}
<circle cx="1680" cy="280" r="90" fill="#C4D600" />
</svg>
</div>
);
};

export default HeroBackground;