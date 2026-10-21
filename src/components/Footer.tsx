import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FooterProps {
  onOpenCatalog?: (category: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau') => void;
  onOpenStores?: () => void;
  onOpenLensGuide?: () => void;
  onOpenFaq?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenCatalog,
  onOpenStores,
  onOpenLensGuide,
  onOpenFaq
}) => {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-[#061748] text-white mt-auto border-t border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 pt-16 pb-10">

        {/* Top Section: Logo + Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">

          {/* Brand Column */}
          <div className="md:col-span-4 lg:col-span-5 flex flex-col gap-6">
            <div
              onClick={() => navigate('/')}
              className="cursor-pointer group w-fit"
            >
              <img
                alt="Óticas Brasil Logo"
                className="h-12 w-auto object-contain brightness-0 invert transition-transform group-hover:scale-105"
                src="/logos/logo-blue.png"
              />
            </div>

            <p className="text-sm text-[#8b9dc3] leading-relaxed max-w-xs">
              Excelência em óptica de precisão e curadoria de alta moda desde 1998.
              Tecnologia oftálmica avançada com design atemporal.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/5511987654321"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center text-white/70"
                aria-label="WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              <a
                href="mailto:contato@oticasbrasil.com.br"
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#C4D600] hover:text-[#061748] transition-all flex items-center justify-center text-white/70"
                aria-label="Email"
              >
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#C4D600] hover:text-[#061748] transition-all flex items-center justify-center text-white/70"
                aria-label="Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
</svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-8 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">

            {/* Collections */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#C4D600]">
                Coleções
              </h3>
              <ul className="flex flex-col gap-3 text-sm text-[#8b9dc3]">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenCatalog && onOpenCatalog('armacoes')}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Armações
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenCatalog && onOpenCatalog('oculos-de-sol')}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Óculos de Sol
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenCatalog && onOpenCatalog('lentes-de-grau')}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Lentes de Grau
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenCatalog && onOpenCatalog('armacoes')}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Lançamentos
                  </button>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#C4D600]">
                Ajuda
              </h3>
              <ul className="flex flex-col gap-3 text-sm text-[#8b9dc3]">
                <li>
                  <button
                    type="button"
                    onClick={onOpenLensGuide}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Enviar Receita
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenLensGuide}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Guia de Medidas
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenStores}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Nossas Lojas
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenFaq}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal / Institutional */}
            <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#C4D600]">
                Institucional
              </h3>
              <ul className="flex flex-col gap-3 text-sm text-[#8b9dc3]">
                <li>
                  <span className="hover:text-white hover:translate-x-1 transition-all cursor-default">
                    Sobre Nós
                  </span>
                </li>
                <li>
                  <span className="hover:text-white hover:translate-x-1 transition-all cursor-default">
                    Política de Privacidade
                  </span>
                </li>
                <li>
                  <span className="hover:text-white hover:translate-x-1 transition-all cursor-default">
                    Termos de Uso
                  </span>
                </li>
                <li>
                  <span className="hover:text-white hover:translate-x-1 transition-all cursor-default">
                    Trocas e Devoluções
                  </span>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/taxas')}
                    className="hover:text-white hover:translate-x-1 transition-all text-left cursor-pointer"
                  >
                    Taxas de Pagamento
                  </button>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[#5a6d9e] text-xs">
          <span>© Copyright 2022 - UNILENTES INDUSTRIAL COMERCIAL DE LENTES LTDA</span>

          <div className="flex items-center gap-6">
            <span className="font-mono text-[10px] opacity-60">CNPJ 01.536.747/0001-21</span>
            <div className="flex flex-col items-end gap-1 text-[10px] font-bold uppercase tracking-wider opacity-40">
              <span>Feito com precisão no Brasil</span>
              <a
                href="https://www.linkedin.com/in/christofer-henrique-43366725b/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-100 hover:text-[#C4D600] transition-colors normal-case font-normal"
              >
                Desenvolvido por Christofer Henrique
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};