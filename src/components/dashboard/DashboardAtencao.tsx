import { BadgeDollarSign, ShieldAlert } from 'lucide-react';
import { certificadoBadgeClass, certificadoStatusLabel } from '@/lib/certificado';
import { formatCurrency } from '@/data/mockData';
import type { ClienteInadimplente } from '@/components/dashboard/InadimplenciaDialog';

export interface CertificadoAlerta {
  clienteId: number;
  razaoSocial: string;
  status: string;
  certificadoVencimento?: string;
}

export type InadimplenteAlerta = ClienteInadimplente;

const dataBr = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');

function Card({ titulo, icone, vazio, quantidade, className, children }: {
  titulo: string; icone: React.ReactNode; vazio: string; quantidade: number; className?: string; children: React.ReactNode;
}) {
  return (
    <section aria-label={titulo} className={`card-surface min-w-0 p-4 sm:p-5 ${className ?? ''}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">{icone}{titulo}</h2>
      {quantidade === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">{children}</ul>
      )}
    </section>
  );
}

/** Os 5 maiores valores em aberto; clicar abre os meses do cliente para dar baixa. */
export function InadimplentesCard({ inadimplentes, mascarar, onAbrir, className }: {
  inadimplentes: InadimplenteAlerta[];
  mascarar: (valor: string) => string;
  onAbrir: (cliente: InadimplenteAlerta) => void;
  className?: string;
}) {
  const maiores = [...inadimplentes]
    .sort((a, b) => (b.valorPendente ?? 0) - (a.valorPendente ?? 0) || (b.mesesPendentes ?? 0) - (a.mesesPendentes ?? 0))
    .slice(0, 5);
  return (
    <Card titulo="Inadimplentes" icone={<BadgeDollarSign size={15} className="text-destructive" />} vazio="Nenhum cliente em atraso"
      quantidade={maiores.length} className={className}>
      {maiores.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => onAbrir(c)}
            className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary">
            <span className="min-w-0 truncate">{c.razaoSocial}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {c.valorPendente != null ? mascarar(formatCurrency(Number(c.valorPendente))) : 'Em atraso'}
              {c.mesesPendentes != null ? ` · ${c.mesesPendentes}m` : ''}
            </span>
          </button>
        </li>
      ))}
    </Card>
  );
}

export function CertificadosCard({ certificados, onAbrirCliente }: {
  certificados: CertificadoAlerta[];
  onAbrirCliente: (clienteId: number) => void;
}) {
  return (
    <Card titulo="Certificados" icone={<ShieldAlert size={15} className="text-amber-600" />} vazio="Nenhum certificado vencendo"
      quantidade={certificados.length}>
      {certificados.slice(0, 8).map((c) => (
        <li key={c.clienteId}>
          <button type="button" onClick={() => onAbrirCliente(c.clienteId)}
            className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary">
            <span className="min-w-0 truncate">{c.razaoSocial}</span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${certificadoBadgeClass(c.status)}`}>
              {certificadoStatusLabel(c.status)}{c.certificadoVencimento ? ` · ${dataBr(c.certificadoVencimento)}` : ''}
            </span>
          </button>
        </li>
      ))}
    </Card>
  );
}
