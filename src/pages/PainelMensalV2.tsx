import { useQueryClient } from '@tanstack/react-query';
import { PainelMensalEstados, PainelMensalFiltros } from '@/components/painel/PainelMensalFiltros';
import PainelQuadro from '@/components/painel/PainelQuadro';
import { hojeIso, usePainelMensal } from '@/hooks/usePainelMensal';
import { useAuth } from '@/contexts/AuthContext';
import { CHAVE_CONTAGENS } from '@/lib/acessos';
import { Permissoes } from '@/lib/permissions';

/** Painel do mês em formato de quadro (Trello), para comparar com o V1. Mesmos dados e marcações. */
export default function PainelMensalV2() {
  const painel = usePainelMensal();
  const queryClient = useQueryClient();
  const { can } = useAuth();

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Painel do mês <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 align-middle text-xs font-semibold text-primary">V2 · teste</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cada cliente é um cartão. Clique para abrir o checklist do mês; o cartão muda de lista conforme as atividades são marcadas.
            As marcações são as mesmas do Painel do mês.
          </p>
        </div>
      </div>

      <PainelMensalFiltros painel={painel} />

      <div className="card-surface overflow-hidden max-w-full min-w-0">
        <PainelMensalEstados painel={painel}>
          <PainelQuadro
            matriz={painel.matriz}
            hoje={hojeIso()}
            salvando={painel.salvando}
            onAlternar={(o, c) => void painel.alternar(o, c)}
            onAguardarCliente={(o, a) => void painel.aguardarCliente(o, a)}
            contagens={painel.contagens}
            onAbrirCartao={() => void queryClient.invalidateQueries({ queryKey: CHAVE_CONTAGENS })}
            competencia={painel.competencia}
            segmentos={painel.segmentos}
            onMoverSegmento={can(Permissoes.CLIENTES_EDITAR) ? (id, seg) => void painel.moverSegmento(id, seg) : undefined}
            onItemAdicionado={() => void painel.recarregarSemPiscar()}
          />
        </PainelMensalEstados>
      </div>
    </div>
  );
}
