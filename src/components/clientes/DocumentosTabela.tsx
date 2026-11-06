import { useState } from 'react';
import { Download, Eye, File, FileSpreadsheet, FileText, Image, Trash2 } from 'lucide-react';
import HintTooltip from '@/components/shared/HintTooltip';
import DocumentoPreviaDialog from '@/components/clientes/DocumentoPreviaDialog';

export interface DocumentoDoCliente {
  id: number;
  nomeArquivo: string;
  tipoArquivo: string;
  dataUpload: string;
  descricao: string;
  competencia?: string;
}

interface DocumentosTabelaProps {
  clienteId: number | string;
  documentos: DocumentoDoCliente[];
  onBaixar: (doc: DocumentoDoCliente) => void;
  onExcluir: (docId: number) => void;
}

function iconeDoArquivo(nome: string) {
  const ext = (nome || '').toLowerCase().split('.').pop() || '';
  if (['pdf', 'txt', 'ofx', 'xml'].includes(ext)) return FileText;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image;
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return FileSpreadsheet;
  return File;
}

function formatarDataHora(value: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Tabela da aba Docs: visualizar (olho), baixar e excluir cada arquivo. */
export default function DocumentosTabela({ clienteId, documentos, onBaixar, onExcluir }: DocumentosTabelaProps) {
  const [emPrevia, setEmPrevia] = useState<DocumentoDoCliente | null>(null);

  return (
    <div className="card-surface overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="label-text px-4 py-3 text-left w-10"></th>
              <th className="label-text px-4 py-3 text-left">Nome do arquivo</th>
              <th className="label-text px-4 py-3 text-left hidden md:table-cell">Competência</th>
              <th className="label-text px-4 py-3 text-left hidden md:table-cell">Descrição</th>
              <th className="label-text px-4 py-3 text-left">Data upload</th>
              <th className="label-text px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {documentos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum documento. Envie um arquivo acima.
                </td>
              </tr>
            )}
            {documentos.map((doc) => {
              const Icon = iconeDoArquivo(doc.nomeArquivo);
              return (
                <tr key={doc.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="rounded bg-muted/50 p-1.5 w-8 h-8 flex items-center justify-center">
                      <Icon size={16} className="text-muted-foreground" />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium truncate max-w-[180px]">
                    <HintTooltip content={doc.nomeArquivo} enabled={!!doc.nomeArquivo && doc.nomeArquivo.length > 20}>
                      <button
                        type="button"
                        onClick={() => setEmPrevia(doc)}
                        className="block max-w-full truncate text-left hover:text-primary hover:underline"
                      >
                        {doc.nomeArquivo}
                      </button>
                    </HintTooltip>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground tabular-nums text-xs">
                    {doc.competencia || '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
                    <HintTooltip content={doc.descricao || ''} enabled={!!doc.descricao && doc.descricao.length > 18}>
                      <span className="block truncate">{doc.descricao || '—'}</span>
                    </HintTooltip>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">{formatarDataHora(doc.dataUpload)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <HintTooltip content="Visualizar">
                        <button
                          type="button"
                          onClick={() => setEmPrevia(doc)}
                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          aria-label={`Visualizar ${doc.nomeArquivo}`}
                        >
                          <Eye size={14} />
                        </button>
                      </HintTooltip>
                      <HintTooltip content="Baixar documento">
                        <button
                          type="button"
                          onClick={() => onBaixar(doc)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          aria-label="Baixar"
                        >
                          <Download size={14} />
                        </button>
                      </HintTooltip>
                      <HintTooltip content="Excluir documento">
                        <button
                          type="button"
                          onClick={() => onExcluir(doc.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          aria-label="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </HintTooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {emPrevia && (
        <DocumentoPreviaDialog
          clienteId={clienteId}
          documento={emPrevia}
          onFechar={() => setEmPrevia(null)}
          onBaixar={() => onBaixar(emPrevia)}
        />
      )}
    </div>
  );
}
