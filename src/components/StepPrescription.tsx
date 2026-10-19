import React, { useRef, useState } from 'react';
import { PrescriptionData } from '../types';

interface StepPrescriptionProps {
  prescription: PrescriptionData;
  onChange: (updated: Partial<PrescriptionData>) => void;
}

export const StepPrescription: React.FC<StepPrescriptionProps> = ({ prescription, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const handleFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    onChange({
      file,
      fileName: file.name,
      filePreviewUrl: previewUrl,
      sendViaWhatsApp: false
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUseDemoPrescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({
      fileName: 'receita_oftalmo_dra_camila_crm142850.pdf',
      filePreviewUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
      sendViaWhatsApp: false,
      odSph: '-1.75',
      odCyl: '-0.50',
      odAxis: '180°',
      oeSph: '-1.50',
      oeCyl: '-0.25',
      oeAxis: '175°',
      dnp: '62 mm'
    });
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({
      file: null,
      fileName: '',
      filePreviewUrl: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#eceef0] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#061748] text-white text-xs flex items-center justify-center font-bold">
            3
          </span>
          <div>
            <h2 className="text-xl text-[#061748] font-semibold tracking-tight">
              Receita Oftalmológica
            </h2>
            <p className="text-xs text-[#45464f] mt-0.5">
              Obrigatório para montagem personalizada das lentes graduadas com precisão milimétrica.
            </p>
          </div>
        </div>

        <span className="bg-[#dde1ff] text-[#001257] text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-xs">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>Conferência por Óptico Especialista</span>
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all border-2 border-dashed ${
          isDragging
            ? 'bg-[#dde1ff]/40 border-[#4156b8]'
            : prescription.fileName
            ? 'bg-[#f2f4f6] border-[#4156b8]/50'
            : 'bg-[#f2f4f6] hover:bg-[#eceef0] border-[#c6c5d0]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {prescription.fileName ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#061748] flex items-center justify-center gap-2">
                <span>Receita Anexada:</span>
                <span className="text-[#4156b8] underline">{prescription.fileName}</span>
              </h3>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                ✓ Arquivo pronto para validação pelo nosso laboratório óptico especializado.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleRemoveFile}
                className="bg-white border border-[#c6c5d0] text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              >
                Remover / Trocar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-[#4156b8] mb-2 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
            </div>
            <h3 className="text-sm font-bold text-[#061748]">
              Arraste a foto ou PDF da sua receita médica aqui
            </h3>
            <p className="text-xs text-[#45464f] mt-1 max-w-md">
              Formatos aceitos: JPG, PNG ou PDF (até 15MB). Uma imagem nítida garante a confecção exata.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                className="bg-white text-[#061748] text-xs px-5 py-2 rounded-full shadow-sm font-bold hover:bg-[#061748] hover:text-white transition-all cursor-pointer border border-[#c6c5d0]/60"
              >
                Selecionar Arquivo no Computador
              </button>
              <button
                type="button"
                onClick={handleUseDemoPrescription}
                className="bg-[#dde1ff]/80 text-[#001257] hover:bg-[#dde1ff] text-xs px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer"
              >
                Preencher com Receita Exemplo
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quick Toggle for WhatsApp Upload */}
      <div className="bg-[#f2f4f6] p-4 rounded-xl flex items-start gap-3 border border-[#eceef0]">
        <input
          type="checkbox"
          id="post-order-rx"
          checked={prescription.sendViaWhatsApp}
          onChange={(e) => onChange({ sendViaWhatsApp: e.target.checked })}
          className="mt-1 accent-[#4156b8] w-4 h-4 cursor-pointer"
        />
        <div className="flex-1">
          <label htmlFor="post-order-rx" className="text-xs sm:text-sm font-bold text-[#061748] cursor-pointer">
            Prefiro enviar minha receita após o pedido pelo WhatsApp
          </label>
          <p className="text-xs text-[#45464f] mt-0.5 leading-relaxed">
            Você poderá concluir a compra agora. Nosso óptico entrará em contato solicitando a foto antes do corte das lentes.
          </p>
        </div>
      </div>

      {/* Collapsible Manual Diopter Fields */}
      <div className="bg-[#f2f4f6] rounded-xl p-4 border border-[#eceef0]">
        <button
          type="button"
          onClick={() => setIsManualOpen(!isManualOpen)}
          className="w-full text-xs sm:text-sm font-bold text-[#061748] cursor-pointer flex items-center justify-between text-left"
        >
          <span>Ou preencher os graus manualmente (Opcional - SPH / CYL / Eixo)</span>
          <span
            className={`material-symbols-outlined transition-transform duration-200 text-[#4156b8] ${
              isManualOpen ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </button>

        {isManualOpen && (
          <div className="pt-4 flex flex-col gap-3 animate-fadeIn">
            <span className="text-[11px] font-semibold text-[#001257] uppercase tracking-wider">
              Olho Direito (OD)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[#45464f] text-[11px]">OD Esférico (SPH)</span>
                <input
                  type="text"
                  value={prescription.odSph}
                  onChange={(e) => onChange({ odSph: e.target.value })}
                  placeholder="-1.75"
                  className="bg-white p-2 rounded-lg text-center text-[#061748] font-bold border border-[#c6c5d0] focus:ring-1 focus:ring-[#4156b8]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#45464f] text-[11px]">OD Cilíndrico (CYL)</span>
                <input
                  type="text"
                  value={prescription.odCyl}
                  onChange={(e) => onChange({ odCyl: e.target.value })}
                  placeholder="-0.50"
                  className="bg-white p-2 rounded-lg text-center text-[#061748] font-bold border border-[#c6c5d0] focus:ring-1 focus:ring-[#4156b8]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#45464f] text-[11px]">OD Eixo (Graus)</span>
                <input
                  type="text"
                  value={prescription.odAxis}
                  onChange={(e) => onChange({ odAxis: e.target.value })}
                  placeholder="180°"
                  className="bg-white p-2 rounded-lg text-center text-[#061748] font-bold border border-[#c6c5d0] focus:ring-1 focus:ring-[#4156b8]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#45464f] text-[11px]">DNP (Dist. Pupilar)</span>
                <input
                  type="text"
                  value={prescription.dnp}
                  onChange={(e) => onChange({ dnp: e.target.value })}
                  placeholder="62 mm"
                  className="bg-white p-2 rounded-lg text-center text-[#061748] font-bold border border-[#c6c5d0] focus:ring-1 focus:ring-[#4156b8]"
                />
              </div>
            </div>

            <span className="text-[11px] font-semibold text-[#001257] uppercase tracking-wider pt-2">
              Olho Esquerdo (OE)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[#45464f] text-[11px]">OE Esférico (SPH)</span>
                <input
                  type="text"
                  value={prescription.oeSph}
                  onChange={(e) => onChange({ oeSph: e.target.value })}
                  placeholder="-1.50"
                  className="bg-white p-2 rounded-lg text-center text-[#061748] font-bold border border-[#c6c5d0] focus:ring-1 focus:ring-[#4156b8]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#45464f] text-[11px]">OE Cilíndrico (CYL)</span>
                <input
                  type="text"
                  value={prescription.oeCyl}
                  onChange={(e) => onChange({ oeCyl: e.target.value })}
                  placeholder="-0.25"
                  className="bg-white p-2 rounded-lg text-center text-[#061748] font-bold border border-[#c6c5d0] focus:ring-1 focus:ring-[#4156b8]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#45464f] text-[11px]">OE Eixo (Graus)</span>
                <input
                  type="text"
                  value={prescription.oeAxis}
                  onChange={(e) => onChange({ oeAxis: e.target.value })}
                  placeholder="175°"
                  className="bg-white p-2 rounded-lg text-center text-[#061748] font-bold border border-[#c6c5d0] focus:ring-1 focus:ring-[#4156b8]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
