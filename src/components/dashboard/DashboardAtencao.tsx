import { BadgeDollarSign, ShieldAlert } from 'lucide-react';
import { certificadoBadgeClass, certificadoStatusLabel } from '@/lib/certificado';
import { formatCurrency } from '@/data/mockData';

export interface CertificadoAlerta {
  clienteId: number;
  razaoSocial: string;
  status: string;
  certificadoVencimento?: string;
}

export interface InadimplenteAlerta {
  id: number;
  razaoSocial: string;
  mesesPendentes?: number;
  valorPendente?: number;
}

interface DashboardAtencaoProps {
  certificados: CertificadoAlerta[];
  /** Vazio quando o usuário não vê o financeiro (o bloco nem aparece). */
  inadimplentes: InadimplenteAlerta[] | null;
  mascarar: (valor: string) => string;
  onAbrirCliente: (clienteId: number) => void;
}

const dataBr = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');

function Lista({ titulo, icone, vazio, children, quantidade }: {
  titulo: string; icone: React.ReactNode; vazio: string; children: React.ReactNode; quantidade: number;
}) {
  return (
    <section aria-label={titulo} className="card-surface min-w-0 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">{icone}{titulo}</h2>
      {quantidade === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">{children}</ul>
      )}
    </section>
  );
}

/** "Atenção": só o que pede ação fora do Painel do mês. */
export default function DashboardAtencao({ certificados, inadimplentes, mascarar, onAbrirCliente }: DashboardAtencaoProps) {
  const maiores = [...(inadimplentes ?? [])].sort((a, b) => (b.valorPendente ?? 0) - (a.valorPendente ?? 0)).slice(0, 5);
  return (
    <div className={inadimplentes ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4'}>
      <Lista titulo="Certificados" icone={<ShieldAlert size={15} className="text-amber-600" />} vazio="Nenhum certificado vencendo" quantidade={certificados.length}>
        {certificados.slice(0, 5).map((c) => (
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
      </Lista>
      {inadimplentes && (
        <Lista titulo="Inadimplentes" icone={<BadgeDollarSign size={15} className="text-destructive" />} vazio="Nenhum cliente em atraso" quantidade={maiores.length}>
          {maiores.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onAbrirCliente(c.id)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-primary">
                <span className="min-w-0 truncate">{c.razaoSocial}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {c.valorPendente != null ? mascarar(formatCurrency(Number(c.valorPendente))) : 'Em atraso'}
                  {c.mesesPendentes != null ? ` · ${c.mesesPendentes} mês(es)` : ''}
                </span>
              </button>
            </li>
          ))}
        </Lista>
      )}
    </div>
  );
}
