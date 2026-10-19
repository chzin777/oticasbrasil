import React from 'react';

interface LensGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LensGuideModal: React.FC<LensGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#061748] text-white p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#dbee2c]">
              Guia Técnico Óptico
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Medidas de Armação &amp; Leitura de Receita
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs text-[#45464f]">
          {/* Section 1: Calibres */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-[#061748] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#4156b8]">straighten</span>
              <span>1. Como funciona o Calibre da Armação?</span>
            </h3>
            <p className="leading-relaxed">
              O calibre representa o diâmetro horizontal de uma lente em milímetros (ex: 50mm no modelo <strong>Aura Titanium Round</strong>).
            </p>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-[#f2f4f6] p-3 rounded-xl border border-[#e0e3e5]">
                <strong className="block text-sm text-[#061748]">P (47-49mm)</strong>
                <span className="text-[11px]">Rostos estreitos ou finos</span>
              </div>
              <div className="bg-[#dde1ff]/40 p-3 rounded-xl border border-[#4156b8]/40">
                <strong className="block text-sm text-[#061748]">M (50-52mm)</strong>
                <span className="text-[11px] text-[#263d9f] font-semibold">Tamanho Padrão Mais Versátil</span>
              </div>
              <div className="bg-[#f2f4f6] p-3 rounded-xl border border-[#e0e3e5]">
                <strong className="block text-sm text-[#061748]">G (53-56mm)</strong>
                <span className="text-[11px]">Rostos largos ou formato oversized</span>
              </div>
            </div>
          </div>

          {/* Section 2: Reading the prescription */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-[#061748] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#4156b8]">description</span>
              <span>2. Entendendo sua Receita Oftalmológica</span>
            </h3>
            <div className="bg-[#f2f4f6] p-4 rounded-xl border border-[#e0e3e5] flex flex-col gap-2">
              <div className="flex gap-2">
                <strong className="text-[#061748] w-24 flex-shrink-0">SPH (Esférico):</strong>
                <span>Indica Miopia (sinal negativo &ndash;) ou Hipermetropia (sinal positivo +).</span>
              </div>
              <div className="flex gap-2">
                <strong className="text-[#061748] w-24 flex-shrink-0">CYL (Cilíndrico):</strong>
                <span>Indica Astigmatismo. Se preenchido, é obrigatório informar o Eixo correspondente.</span>
              </div>
              <div className="flex gap-2">
                <strong className="text-[#061748] w-24 flex-shrink-0">Eixo (0° a 180°):</strong>
                <span>Ângulo de posicionamento da correção do astigmatismo na lente.</span>
              </div>
              <div className="flex gap-2">
                <strong className="text-[#061748] w-24 flex-shrink-0">DNP / DP:</strong>
                <span>Distância Naso-Pupilar em milímetros para alinhamento do centro óptico da lente com a pupila.</span>
              </div>
            </div>
          </div>

          {/* Section 3: Safe Guarantee */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-emerald-900">
            <span className="material-symbols-outlined text-[24px] text-emerald-600 flex-shrink-0">verified</span>
            <div>
              <strong className="block text-xs font-bold text-emerald-900">
                Garantia de Adaptação Óptica de 60 Dias
              </strong>
              <p className="text-[11px] mt-0.5 leading-relaxed">
                Se você sentir qualquer desconforto visual ou dificuldade de adaptação com suas lentes graduadas, refazemos as lentes gratuitamente ou realizamos a troca imediata em nosso laboratório central.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f2f4f6] border-t border-[#e0e3e5] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#061748] text-white text-xs font-bold px-5 py-2 rounded-full cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
