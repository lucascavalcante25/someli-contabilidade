import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Link2, Loader2, Mail, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { useAuth } from '@/contexts/AuthContext';
import { Permissoes } from '@/lib/permissions';
import { linkGmail, linkWhatsApp, linkWhatsAppEscolherConversa, type PedidoParaEnvio } from '@/lib/pedidoDocumento';
import MonthField from '@/components/shared/MonthField';

interface Solicitacao {
  id: number;
  titulo: string;
  competencia?: string;
  status: 'PENDENTE' | 'RECEBIDO' | 'CANCELADO';
  expirada: boolean;
  expiraEm: string;
  arquivosRecebidos: number;
  token?: string;
}

const inputClass =
  'w-full min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20';

function rotuloStatus(s: Solicitacao) {
  if (s.status === 'CANCELADO') return 'Cancelado';
  if (s.status === 'RECEBIDO') return `Recebido (${s.arquivosRecebidos})`;
  return s.expirada ? 'Expirado' : 'Aguardando cliente';
}

const botaoEnvio =
  'flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2.5 text-xs font-medium hover:bg-muted transition-colors';

interface Props {
  clienteId: string;
  clienteNome: string;
  telefone?: string;
  email?: string;
}

export default function SolicitacoesDocumento({ clienteId, clienteNome, telefone, email }: Props) {
  const { can } = useAuth();
  const podeEditar = can(Permissoes.CLIENTES_EDITAR);
  const base = `${API_BASE_URL}/clientes/${clienteId}/solicitacoes-documento`;
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [pedidoGerado, setPedidoGerado] = useState<PedidoParaEnvio | null>(null);
  const [copiado, setCopiado] = useState(false);
  const whatsappCliente = pedidoGerado && linkWhatsApp(telefone, pedidoGerado);
  const gmailCliente = pedidoGerado && linkGmail(email, pedidoGerado);

  const carregar = useCallback(async () => {
    const response = await apiFetch(base);
    if (response.ok) {
      setLista((await response.json()) as Solicitacao[]);
    }
  }, [base]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = async (event: FormEvent) => {
    event.preventDefault();
    setSalvando(true);
    try {
      const response = await apiFetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, competencia: competencia || null, diasValidade: 7 }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Não foi possível criar o pedido');
      setPedidoGerado({
        cliente: clienteNome,
        titulo: titulo.trim(),
        link: `${window.location.origin}/enviar/${body.token}`,
      });
      setCopiado(false);
      setTitulo('');
      setDescricao('');
      setCompetencia('');
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o pedido');
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = async (id: number) => {
    const response = await apiFetch(`${base}/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await carregar();
    } else {
      toast.error('Não foi possível cancelar o pedido');
    }
  };

  const copiar = async () => {
    if (!pedidoGerado) return;
    try {
      await navigator.clipboard.writeText(pedidoGerado.link);
      setCopiado(true);
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  };

  return (
    <div className="card-surface space-y-3 p-4">
      <div className="flex items-start gap-2">
        <Link2 size={16} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold">Pedir documento ao cliente</p>
          <p className="text-xs text-muted-foreground">
            Gere um link válido por 7 dias. O cliente envia sem login, e o arquivo aparece aqui na aba Docs.
          </p>
        </div>
      </div>

      {podeEditar && (
        <form onSubmit={criar} className="space-y-2">
          <input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            required
            maxLength={200}
            placeholder="O que precisa? Ex.: Extrato de outubro"
            aria-label="Documento solicitado"
            className={inputClass}
          />
          <textarea
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Orientação para o cliente (opcional)"
            aria-label="Orientação para o cliente"
            className={inputClass}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <MonthField
              value={competencia}
              onChange={setCompetencia}
              placeholder="Competência (opcional)"
              ariaLabel="Competência"
              className="sm:max-w-56"
            />
            <button
              type="submit"
              disabled={salvando || !titulo.trim()}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {salvando && <Loader2 size={16} className="animate-spin" />}
              Gerar link
            </button>
          </div>
        </form>
      )}

      {pedidoGerado && (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium">Envie agora: por segurança, este link não pode ser exibido de novo.</p>
          <p className="break-all text-xs">{pedidoGerado.link}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {whatsappCliente ? (
              <a href={whatsappCliente} target="_blank" rel="noopener noreferrer" className={botaoEnvio}>
                <MessageCircle size={14} /> WhatsApp do cliente
              </a>
            ) : (
              <p className="self-center text-xs text-muted-foreground">Telefone sem DDD válido no cadastro.</p>
            )}
            <a
              href={linkWhatsAppEscolherConversa(pedidoGerado)}
              target="_blank"
              rel="noopener noreferrer"
              className={botaoEnvio}
            >
              <Users size={14} /> WhatsApp: escolher grupo
            </a>
            {gmailCliente ? (
              <a href={gmailCliente} target="_blank" rel="noopener noreferrer" className={botaoEnvio}>
                <Mail size={14} /> Abrir no Gmail
              </a>
            ) : (
              <p className="self-center text-xs text-muted-foreground">Cliente sem e-mail válido no cadastro.</p>
            )}
            <button type="button" onClick={() => void copiar()} className={botaoEnvio}>
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <ul className="divide-y divide-border">
          {lista.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.titulo}</span>
                <span className="block text-xs text-muted-foreground">{rotuloStatus(s)}</span>
              </span>
              {podeEditar && s.status !== 'CANCELADO' && !s.expirada && (
                <button
                  type="button"
                  onClick={() => void cancelar(s.id)}
                  className="shrink-0 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
