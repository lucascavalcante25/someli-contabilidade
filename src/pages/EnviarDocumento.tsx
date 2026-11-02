import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Loader2, Plus, Send, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import BrandLogo from '@/components/BrandLogo';

interface PedidoPublico {
  empresa: string;
  titulo: string;
  descricao?: string;
  competencia?: string;
  expiraEm: string;
  arquivosRecebidos: number;
  arquivosRestantes: number;
}

interface ArquivoSelecionado {
  id: string;
  arquivo: File;
  erro?: string;
}

const ACEITOS = '.pdf,.jpg,.jpeg,.png,.xml,.csv,.xlsx,.docx';
const TAMANHO_MAXIMO = 15 * 1024 * 1024;

function tamanhoLegivel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EnviarDocumento() {
  const { token } = useParams();
  const [pedido, setPedido] = useState<PedidoPublico | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'invalido'>('carregando');
  const [selecionados, setSelecionados] = useState<ArquivoSelecionado[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [concluidos, setConcluidos] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlPedido = `${API_BASE_URL}/publico/solicitacoes/${encodeURIComponent(token ?? '')}`;

  useEffect(() => {
    let ativo = true;
    fetch(urlPedido)
      .then(async (response) => {
        if (!ativo) return;
        if (!response.ok) {
          setEstado('invalido');
          return;
        }
        setPedido((await response.json()) as PedidoPublico);
        setEstado('pronto');
      })
      .catch(() => {
        if (ativo) setEstado('invalido');
      });
    return () => {
      ativo = false;
    };
  }, [urlPedido]);

  const adicionar = (event: ChangeEvent<HTMLInputElement>) => {
    const novos = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (novos.length === 0 || !pedido) return;

    const avisos: string[] = [];
    const lista = [...selecionados];
    for (const arquivo of novos) {
      const id = `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`;
      if (lista.some((item) => item.id === id)) continue;
      if (arquivo.size > TAMANHO_MAXIMO) {
        avisos.push(`${arquivo.name} tem mais de 15 MB.`);
      } else if (lista.length >= pedido.arquivosRestantes) {
        avisos.push(`Este pedido aceita mais ${pedido.arquivosRestantes} arquivo(s).`);
        break;
      } else {
        lista.push({ id, arquivo });
      }
    }
    setSelecionados(lista);
    setAviso(avisos.length > 0 ? avisos.join(' ') : null);
  };

  const remover = (id: string) => {
    setSelecionados((atual) => atual.filter((item) => item.id !== id));
  };

  const enviar = async () => {
    setEnviando(true);
    setAviso(null);
    const enviados: string[] = [];
    const comErro: ArquivoSelecionado[] = [];

    for (const item of selecionados) {
      try {
        const form = new FormData();
        form.append('file', item.arquivo);
        const response = await fetch(`${urlPedido}/arquivos`, { method: 'POST', body: form });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.message || 'Não foi possível enviar este arquivo.');
        }
        setPedido(body as PedidoPublico);
        enviados.push(item.arquivo.name);
      } catch (error) {
        const mensagem = error instanceof TypeError || !(error instanceof Error)
          ? 'Falha de conexão. Tente novamente.'
          : error.message;
        comErro.push({ ...item, erro: mensagem });
      }
    }

    setSelecionados(comErro);
    setEnviando(false);
    if (comErro.length === 0) {
      setConcluidos(enviados);
    } else {
      setAviso(`${enviados.length} enviado${enviados.length === 1 ? '' : 's'}, ${comErro.length} com erro. Confira abaixo e tente de novo.`);
    }
  };

  const quantidade = selecionados.length;
  const textoEnviar = `Enviar ${quantidade} ${quantidade === 1 ? 'documento' : 'documentos'}`;

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div className="flex justify-center">
          <BrandLogo variant="color" imgClassName="w-[180px] max-w-[75vw] h-auto" />
        </div>
        <div className="card-surface space-y-4 p-5 sm:p-6">
          {estado === 'carregando' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Carregando pedido…
            </p>
          )}

          {estado === 'invalido' && (
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">Fale com o escritório para receber um novo link.</p>
            </div>
          )}

          {estado === 'pronto' && pedido && concluidos && (
            <div className="space-y-4 py-2 text-center" role="status">
              <CheckCircle2 size={48} className="mx-auto text-success" />
              <div className="space-y-1">
                <h1 className="text-lg font-semibold">Documentos enviados com sucesso!</h1>
                <p className="text-sm text-muted-foreground">
                  Recebemos {concluidos.length} {concluidos.length === 1 ? 'arquivo' : 'arquivos'} de {pedido.empresa}.
                  O escritório já foi avisado. Você já pode fechar esta página.
                </p>
              </div>
              <ul className="space-y-1 text-left">
                {concluidos.map((nome, indice) => (
                  <li key={`${nome}-${indice}`} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={16} className="shrink-0 text-success" />
                    <span className="min-w-0 break-all">{nome}</span>
                  </li>
                ))}
              </ul>
              {pedido.arquivosRestantes > 0 && (
                <button
                  type="button"
                  onClick={() => setConcluidos(null)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Enviar mais arquivos
                </button>
              )}
            </div>
          )}

          {estado === 'pronto' && pedido && !concluidos && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{pedido.empresa}</p>
                <h1 className="text-lg font-semibold">{pedido.titulo}</h1>
                {pedido.competencia && (
                  <p className="text-sm text-muted-foreground">
                    Competência {pedido.competencia.split('-').reverse().join('/')}
                  </p>
                )}
              </div>
              {pedido.descricao && <p className="whitespace-pre-wrap text-sm">{pedido.descricao}</p>}

              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACEITOS}
                onChange={adicionar}
                className="hidden"
                aria-label="Arquivos"
              />
              <button
                type="button"
                disabled={enviando || pedido.arquivosRestantes <= 0}
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-input px-4 py-3 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Plus size={16} />
                {quantidade > 0 ? 'Adicionar mais arquivos' : 'Selecionar arquivos'}
              </button>
              <p className="text-xs text-muted-foreground">
                Selecione um ou vários: PDF, imagem, XML, CSV, Excel ou Word, até 15 MB cada.
                Este pedido aceita até {pedido.arquivosRestantes} arquivo(s).
              </p>

              {aviso && <p role="alert" className="text-sm text-destructive">{aviso}</p>}

              {quantidade > 0 && (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {selecionados.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <FileText size={16} className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block break-all">{item.arquivo.name}</span>
                        <span className={`block text-xs ${item.erro ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {item.erro ?? tamanhoLegivel(item.arquivo.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() => remover(item.id)}
                        aria-label={`Remover ${item.arquivo.name}`}
                        className="shrink-0 rounded p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {quantidade > 0 && (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void enviar()}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {enviando ? 'Enviando…' : textoEnviar}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
