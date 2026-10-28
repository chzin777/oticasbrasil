import React, { useRef, useState } from 'react';
import { useToast } from '../../../components/ToastContext';
import { exportData, importData, resetAll } from '../../../lib/siteStore';
import { Card, ghostBtn, primaryBtn } from '../ui';
import { ConfirmDialog } from '../controls';

export const DataSection: React.FC = () => {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `oticas-catalogo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado', 'O arquivo foi baixado.');
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    if (importData(await file.text())) toast.success('Backup importado', 'Os dados da loja foram atualizados.');
    else toast.error('Não foi possível importar o backup', 'Arquivo inválido ou grande demais.');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card title="Catálogo e conteúdo" subtitle="Backup de produtos, tags, descontos, cupons e banners. Pedidos, clientes e usuários ficam no banco de dados do servidor.">
      <div className="flex flex-wrap gap-3">
        <button type="button" className={primaryBtn} onClick={download}>
          <span className="material-symbols-outlined text-[18px]">download</span>Exportar backup
        </button>
        <button type="button" className={ghostBtn} onClick={() => fileRef.current?.click()}>
          <span className="material-symbols-outlined text-[18px]">upload</span>Importar backup
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-2 text-[13px] font-semibold text-red-600 transition hover:cursor-pointer hover:bg-red-50"
          onClick={() => setConfirmingReset(true)}
        >
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>Restaurar catálogo original
        </button>
      </div>
      {confirmingReset && (
        <ConfirmDialog
          title="Restaurar catálogo?"
          heading="Esta ação não pode ser desfeita"
          message="Produtos, tags, descontos, cupons e banners voltarão ao padrão original da loja."
          subjectLabel="O que será restaurado"
          subject="Todas as alterações de catálogo e conteúdo"
          confirmLabel="Restaurar catálogo"
          cancelLabel="Manter alterações"
          icon="restart_alt"
          onConfirm={() => {
            resetAll();
            setConfirmingReset(false);
            toast.success('Catálogo restaurado', 'Os dados voltaram ao padrão original.');
          }}
          onClose={() => setConfirmingReset(false)}
        />
      )}
    </Card>
  );
};
