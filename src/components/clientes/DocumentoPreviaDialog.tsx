import { useEffect, useState } from 'react';
import { Download, FileQuestion, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { carregarPrevia, tipoPrevia, type DocumentoParaPrevia, type Previa } from '@/lib/documentoPrevia';

interface DocumentoPreviaDialogProps {
  clienteId: number | string;
  documento: DocumentoParaPrevia;
  onFechar: () => void;
  onBaixar: () => void;
}

type Estado = { fase: 'carregando' } | { fase: 'pronto'; previa: Previa } | { fase: 'erro'; mensagem: string };

/** Janela de visualização rápida: PDF, imagem ou texto (OFX, CSV, TXT, XML). */
export default function DocumentoPreviaDialog({ clienteId, documento, onFechar, onBaixar }: DocumentoPreviaDialogProps) {
  const temPrevia = tipoPrevia(documento.nomeArquivo) !== null;
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });

  useEffect(() => {
    if (!temPrevia) return;
    let ativo = true;
    let url: string | null = null;
    carregarPrevia(clienteId, documento)
      .then((previa) => {
        if ('url' in previa) url = previa.url;
        if (ativo) setEstado({ fase: 'pronto', previa });
        else if (url) URL.revokeObjectURL(url);
      })
      .catch((e: unknown) => {
        if (ativo) setEstado({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'Erro ao abrir o arquivo.' });
      });
    return () => {
      ativo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [clienteId, documento, temPrevia]);

  const nome = documento.nomeArquivo || 'documento';

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-4xl max-h-[92vh] flex flex-col gap-3 p-4 sm:p-6"
        // Esc fecha só a prévia: a janela do cliente (ModalShell) escuta Esc no window
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader className="pr-8 min-w-0">
          <DialogTitle className="truncate text-base">{nome}</DialogTitle>
          <DialogDescription>Visualização rápida. Para editar ou guardar, baixe o arquivo.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-muted/30">
          {!temPrevia ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-muted-foreground">
              <FileQuestion size={32} />
              <p>Este formato (planilha ou documento do Office/LibreOffice) não abre aqui. Baixe para ver no programa do computador.</p>
            </div>
          ) : estado.fase === 'carregando' ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 size={18} className="animate-spin" /> Abrindo arquivo...
            </div>
          ) : estado.fase === 'erro' ? (
            <p className="px-4 py-10 text-center text-sm text-destructive">{estado.mensagem}</p>
          ) : estado.previa.tipo === 'pdf' ? (
            <iframe title={`Pré-visualização de ${nome}`} src={estado.previa.url} className="h-[70vh] w-full bg-white" />
          ) : estado.previa.tipo === 'imagem' ? (
            <img src={estado.previa.url} alt={nome} className="mx-auto max-h-[70vh] max-w-full object-contain" />
          ) : estado.previa.texto.trim() === '' ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Arquivo vazio.</p>
          ) : (
            <>
              <pre className="whitespace-pre-wrap break-all p-3 text-xs leading-relaxed">{estado.previa.texto}</pre>
              {estado.previa.cortado && (
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  Mostrando só o começo do arquivo. Baixe para ver tudo.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onBaixar}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download size={16} /> Baixar arquivo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
