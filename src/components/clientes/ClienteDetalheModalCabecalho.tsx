import { Pencil, X } from 'lucide-react';
import HintTooltip from '@/components/shared/HintTooltip';
import ToggleValoresButton from '@/components/shared/ToggleValoresButton';

interface ClienteDetalheModalCabecalhoProps {
  razaoSocial: string;
  /** Abre o "Editar cliente" na mesma página. Sem ele (ex.: Dashboard), o botão não aparece. */
  onEditar?: () => void;
  onFechar?: () => void;
}

/** Cabeçalho do modal "Detalhes do Cliente": editar, mostrar/ocultar valores e fechar. */
export default function ClienteDetalheModalCabecalho({ razaoSocial, onEditar, onFechar }: ClienteDetalheModalCabecalhoProps) {
  return (
    <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold truncate">Detalhes do Cliente</h2>
        <HintTooltip content={razaoSocial}>
          <p className="cursor-default truncate text-sm text-muted-foreground">{razaoSocial}</p>
        </HintTooltip>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onEditar && (
          <HintTooltip content="Editar cliente">
            <button
              type="button"
              onClick={onEditar}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Editar cliente"
            >
              <Pencil size={16} />
            </button>
          </HintTooltip>
        )}
        <ToggleValoresButton compact />
        <HintTooltip content="Fechar detalhes">
          <button type="button" onClick={onFechar} className="rounded p-1 transition-colors hover:bg-muted" aria-label="Fechar">
            <X size={18} />
          </button>
        </HintTooltip>
      </div>
    </div>
  );
}
