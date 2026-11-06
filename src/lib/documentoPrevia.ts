import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

/** Pré-visualização rápida dos documentos do cliente, sem baixar o arquivo. */

/** Mesma lista do backend (ClienteDocumentoService.TIPOS_PERMITIDOS). */
export const ACEITOS_DOCUMENTO =
  '.pdf,.jpg,.jpeg,.png,.webp,.xml,.csv,.txt,.ofx,.xls,.xlsx,.ods,.doc,.docx,.odt,.zip';

export const DESCRICAO_ACEITOS =
  'PDF, imagem, planilha (XLS, XLSX, ODS, CSV), documento (DOC, DOCX, ODT), extrato (OFX, TXT), XML ou ZIP';

export type TipoPrevia = 'pdf' | 'imagem' | 'texto';

export type Previa =
  | { tipo: 'pdf'; url: string }
  | { tipo: 'imagem'; url: string }
  | { tipo: 'texto'; texto: string; cortado: boolean };

export interface DocumentoParaPrevia {
  id: number;
  nomeArquivo: string | null;
}

/** Texto acima disso aparece cortado: a prévia é para conferir, não para ler extratos enormes. */
const LIMITE_TEXTO = 300_000;

const POR_EXTENSAO: Record<string, { tipo: TipoPrevia; mime: string }> = {
  pdf: { tipo: 'pdf', mime: 'application/pdf' },
  jpg: { tipo: 'imagem', mime: 'image/jpeg' },
  jpeg: { tipo: 'imagem', mime: 'image/jpeg' },
  png: { tipo: 'imagem', mime: 'image/png' },
  webp: { tipo: 'imagem', mime: 'image/webp' },
  txt: { tipo: 'texto', mime: 'text/plain' },
  csv: { tipo: 'texto', mime: 'text/plain' },
  ofx: { tipo: 'texto', mime: 'text/plain' },
  xml: { tipo: 'texto', mime: 'text/plain' },
};

function extensao(nome: string | null): string {
  const ponto = (nome ?? '').lastIndexOf('.');
  return ponto < 0 ? '' : (nome ?? '').slice(ponto + 1).toLowerCase();
}

export function tipoPrevia(nome: string | null): TipoPrevia | null {
  return POR_EXTENSAO[extensao(nome)]?.tipo ?? null;
}

/** Separa falha de rede (sem resposta) de erro devolvido pelo servidor. */
export class ErroPrevia extends Error {
  constructor(
    message: string,
    readonly tipo: 'rede' | 'servidor',
  ) {
    super(message);
    this.name = 'ErroPrevia';
  }
}

export async function carregarPrevia(clienteId: number | string, doc: DocumentoParaPrevia): Promise<Previa> {
  const formato = POR_EXTENSAO[extensao(doc.nomeArquivo)];
  if (!formato) {
    throw new ErroPrevia('Este formato não tem pré-visualização. Baixe o arquivo para abrir.', 'servidor');
  }
  let response: Response;
  try {
    response = await apiFetch(`${API_BASE_URL}/clientes/${clienteId}/documentos/${doc.id}`, { headers: {} });
  } catch {
    throw new ErroPrevia('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'rede');
  }
  if (!response.ok) {
    throw new ErroPrevia(
      response.status === 404 ? 'Arquivo não encontrado no servidor.' : `Erro ${response.status} ao abrir o arquivo.`,
      'servidor',
    );
  }
  if (formato.tipo === 'texto') {
    const texto = await response.text();
    const cortado = texto.length > LIMITE_TEXTO;
    return { tipo: 'texto', texto: cortado ? texto.slice(0, LIMITE_TEXTO) : texto, cortado };
  }
  // O tipo vem da extensão, não do servidor: o navegador só exibe PDF ou imagem, nunca HTML
  const blob = new Blob([await response.arrayBuffer()], { type: formato.mime });
  const url = URL.createObjectURL(blob);
  return formato.tipo === 'pdf' ? { tipo: 'pdf', url } : { tipo: 'imagem', url };
}
