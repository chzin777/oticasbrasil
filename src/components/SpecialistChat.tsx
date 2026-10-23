import React, { useState } from 'react';

interface SpecialistChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOPICS = [
  { id: 'lentes', label: 'Dúvidas sobre Lentes', icon: 'visibility' },
  { id: 'armacoes', label: 'Escolher Armação', icon: 'eyeglasses' },
  { id: 'medidas', label: 'Guia de Medidas', icon: 'straighten' },
  { id: 'pagamento', label: 'Pagamento e Prazos', icon: 'credit_card' },
  { id: 'receita', label: 'Enviar Receita', icon: 'description' },
  { id: 'outros', label: 'Outro Assunto', icon: 'chat' },
];

const getTopicMessage = (topicId: string): string => {
  switch (topicId) {
    case 'lentes':
      return 'Perfeito! Nossos consultores tiram suas dúvidas sobre lentes e tratamentos pelo WhatsApp.';
    case 'armacoes':
      return 'Perfeito! Nossos especialistas ajudam você a escolher a armação ideal pelo WhatsApp.';
    case 'medidas':
      return 'Perfeito! Enviamos nosso guia de medidas completo e ajudamos você pelo WhatsApp.';
    case 'pagamento':
      return 'Perfeito! Nossos consultores explicam as opções de pagamento e prazos pelo WhatsApp.';
    case 'receita':
      return 'Perfeito! Nossos especialistas orientam como enviar sua receita e fazer seu pedido pelo WhatsApp.';
    default:
      return 'Perfeito! Nossos consultores estão prontos para te ajudar com qualquer assunto pelo WhatsApp.';
  }
};

export const SpecialistChat: React.FC<SpecialistChatProps> = ({ isOpen, onClose }) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  const handleWhatsAppClick = () => {
    if (selectedTopic) {
      const topic = TOPICS.find(t => t.id === selectedTopic);
      if (topic) {
        window.open(`https://wa.me/5511987654321?text=${encodeURIComponent(`Olá! Preciso de ajuda com: ${topic.label}`)}`, '_blank');
      }
    }
  };

  if (!isOpen) return null;

  const selectedTopicData = selectedTopic ? TOPICS.find(t => t.id === selectedTopic) : null;

  return (
    <>
      {/* Backdrop para fechar ao clicar fora */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed bottom-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] right-2 sm:right-6 z-50 w-[min(320px,calc(100vw-1rem))] max-h-[min(70dvh,36rem)] bg-white rounded-2xl shadow-[0_8px_32px_rgba(6,23,72,0.18)] border border-[#eceef0] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-[#061748] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#dbee2c] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#061748] text-[20px]">support_agent</span>
            </div>
            <div>
              <h3 className="text-white text-sm font-bold leading-tight">Falar com Especialista</h3>
              <p className="text-white/60 text-[10px] font-medium tracking-wide">Resposta em até 2 min</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Fechar chat"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-5 overflow-y-auto">
          {!selectedTopic ? (
            <>
              <p className="text-[#45464f] text-xs font-semibold mb-4 uppercase tracking-wider">
                Como posso ajudar?
              </p>

              <div className="flex flex-col gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#f7f9fb] hover:bg-[#061748] hover:text-white group transition-all duration-200 text-left cursor-pointer border border-transparent hover:border-[#061748]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#061748] group-hover:text-[#dbee2c] transition-colors">
                      {topic.icon}
                    </span>
                    <span className="text-sm font-medium text-[#191c1e] group-hover:text-white transition-colors">
                      {topic.label}
                    </span>
                    <span className="ml-auto material-symbols-outlined text-[14px] text-[#c6c5d0] group-hover:text-white/60 transition-colors">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#dbee2c]/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px] text-[#061748]">whatsapp</span>
              </div>
              <p className="text-[#191c1e] text-sm font-medium mb-6 leading-relaxed">
                {getTopicMessage(selectedTopic)}
              </p>
              <button
                onClick={handleWhatsAppClick}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold py-3.5 px-6 rounded-full transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mb-3"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                Conversar no WhatsApp
              </button>
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-[#8b9dc3] text-xs font-medium hover:text-[#061748] transition-colors cursor-pointer"
              >
                ← Voltar para opções
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f7f9fb] border-t border-[#eceef0] text-center">
          <p className="text-[10px] text-[#8b9dc3]">
            Atendimento via WhatsApp • Seg-Sex 9h-18h
          </p>
        </div>
      </div>
    </>
  );
};