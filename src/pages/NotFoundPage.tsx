import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center bg-white px-4 py-20 text-center">
      {/* Decorative element */}
      <div className="relative mb-8">
        <span className="text-[12rem] sm:text-[16rem] font-black text-[#f2f4f6] leading-none select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-6xl sm:text-7xl text-[#061748]">
            search_off
          </span>
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-[#061748] mb-4 tracking-tight">
        Página não encontrada
      </h1>

      <p className="text-base sm:text-lg text-[#45464f] max-w-md mx-auto mb-10 leading-relaxed">
        A página que você procura pode ter sido removida, renomeada ou está temporariamente indisponível.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-[#061748] text-white text-sm font-bold rounded-xl hover:bg-[#0a2060] active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#061748]/20"
        >
          Voltar ao Início
        </button>
        <button
          type="button"
          onClick={() => navigate('/armacoes')}
          className="px-8 py-3.5 border-2 border-[#061748] text-[#061748] text-sm font-bold rounded-xl hover:bg-[#061748] hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          Ver Armações
        </button>
      </div>

      {/* Decorative accent line */}
      <div className="mt-16 w-24 h-1 bg-gradient-to-r from-[#C4D600] to-[#4156b8] rounded-full opacity-60" />
    </div>
  );
};

export default NotFoundPage;