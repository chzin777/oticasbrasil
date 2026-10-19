import React from 'react';

interface CheckoutContextProps {
  onOpenSupportModal?: () => void;
}

export const CheckoutContext: React.FC<CheckoutContextProps> = ({ onOpenSupportModal }) => {
  return (
    <section className="w-full bg-white shadow-sm mb-6 border-b border-[#eceef0]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo Branding */}
        <div className="flex items-center gap-2">
          <img 
            alt="Óticas Brasil Logo" 
            className="h-9 w-auto object-contain" 
            src="https://lh3.googleusercontent.com/aida/AEtjO1WWSMk4aHmFe8PNurdxppQ6ApFNO_b2pKZo9b52NS-3g2kjqyQRho2TyFJosHh6vXk4rAPdQrQx8rNOGPXSBtr_msqR0wr1xJVi02qoLDjnSyytMdZC4LSEZ9woQY3dLKJu-lK3wZB_XTSNQs6BId6EMbohN6KvrOIpFQ6BVmmBYq9Pt7-Pu68JIo73xYvLvgMiDLIsgD5wol0JBl0fUnoPcUxb1LfOQ6CI9e6RKoGcsyxkdRN1ZCWIAb4G" 
          />
        </div>

        {/* Trust & SSL Assurance */}
        <div className="flex items-center gap-2 bg-[#f2f4f6] px-4 py-1.5 rounded-full text-[#191c1e] text-xs font-semibold">
          <span className="material-symbols-outlined text-[18px] text-[#4156b8]">verified_user</span>
          <span>Checkout 100% Seguro &amp; Criptografado (SSL 256-bit)</span>
        </div>

        {/* Live Optician Support Link */}
        <div className="flex items-center gap-2 text-[#061748]">
          <span className="material-symbols-outlined text-[20px] text-[#4156b8]">support_agent</span>
          <span className="text-xs font-semibold">Precisa de ajuda?</span>
          <button
            onClick={onOpenSupportModal}
            className="text-xs font-bold text-[#4156b8] hover:underline cursor-pointer flex items-center gap-1"
          >
            WhatsApp (11) 98765-4321
          </button>
        </div>
      </div>
    </section>
  );
};
