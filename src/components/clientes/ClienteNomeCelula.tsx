import { ChevronDown, ChevronRight } from 'lucide-react';
import HintTooltip from '@/components/shared/HintTooltip';
import { certificadoBadgeClass, certificadoStatusLabel } from '@/lib/certificado';
import { maskCnpj } from '@/lib/masks';

export interface ClienteNomeCelulaDados {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  ativo?: boolean;
  certificadoStatus?: string;
  tags?: { id: number; nome: string; cor?: string; automatica?: boolean }[];
}

interface ClienteNomeCelulaProps {
  cliente: ClienteNomeCelulaDados;
  aberto: boolean;
  onAlternarDocumentos: () => void;
}

/**
 * Primeira coluna da lista de Clientes, congelada à esquerda: ao rolar para os lados
 * o nome continua à vista, como no Painel do mês.
 */
export default function ClienteNomeCelula({ cliente: c, aberto, onAlternarDocumentos }: ClienteNomeCelulaProps) {
  const rotuloDocs = aberto ? 'Recolher documentos' : 'Ver documentos';
  return (
    <td className="sticky left-0 z-10 bg-card border-r border-border/60 pl-1.5 pr-3 sm:pr-4 py-3 font-medium min-w-[160px] max-w-[200px] sm:max-w-[300px]">
      <div className="flex items-start gap-1">
        <HintTooltip content={rotuloDocs}>
          <button
            type="button"
            onClick={onAlternarDocumentos}
            className="mt-0.5 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
            aria-label={rotuloDocs}
          >
            {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </HintTooltip>
        <div className="min-w-0">
          <HintTooltip content={c.razaoSocial} enabled={!!c.razaoSocial && c.razaoSocial.length > 28}>
            <span className={`block truncate ${c.ativo === false ? 'line-through text-muted-foreground' : ''}`}>{c.razaoSocial}</span>
          </HintTooltip>
          {c.nomeFantasia && c.nomeFantasia.trim().toLowerCase() !== c.razaoSocial.trim().toLowerCase() && (
            <span className="block truncate text-xs font-normal text-muted-foreground">{c.nomeFantasia}</span>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {(c.certificadoStatus === 'VENCIDO' || c.certificadoStatus === 'VENCENDO') && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${certificadoBadgeClass(c.certificadoStatus)}`}>
                {certificadoStatusLabel(c.certificadoStatus)}
              </span>
            )}
            {(c.tags || []).slice(0, 3).map((t) => (
              <span
                key={t.id}
                title={t.automatica ? 'Tag automática' : 'Tag manual'}
                className="text-[10px] px-1.5 py-0.5 rounded border border-border/80 inline-flex items-center gap-0.5"
                style={{ borderColor: t.cor || undefined, color: t.cor || undefined }}
              >
                {t.nome.replace(/_/g, ' ')}
                {t.automatica ? <span className="opacity-60">·</span> : null}
              </span>
            ))}
          </div>
          {c.ativo === false && <span className="text-[10px] uppercase text-muted-foreground">(inativo)</span>}
          <span className="sm:hidden text-[11px] text-muted-foreground tabular-nums block truncate">{c.cnpj ? maskCnpj(c.cnpj) : '—'}</span>
        </div>
      </div>
    </td>
  );
}
