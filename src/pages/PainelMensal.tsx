import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import FichaClienteAcessos from '@/components/clientes/FichaClienteAcessos';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PainelMensalTabela from '@/components/painel/PainelMensalTabela';
import { PainelMensalEstados, PainelMensalFiltros } from '@/components/painel/PainelMensalFiltros';
import { hojeIso, usePainelMensal } from '@/hooks/usePainelMensal';
import { CHAVE_CONTAGENS } from '@/lib/acessos';

export default function PainelMensal() {
  const painel = usePainelMensal();
  const [ficha, setFicha] = useState<{ clienteId: number; clienteNome: string } | null>(null);
  const queryClient = useQueryClient();

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Painel do mês</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atividades de cada cliente na competência. Cada mês começa desmarcado; os anteriores ficam no histórico.
          </p>
        </div>
      </div>

      <PainelMensalFiltros painel={painel} />

      <div className="card-surface overflow-hidden max-w-full min-w-0">
        <PainelMensalEstados painel={painel}>
          <PainelMensalTabela
            matriz={painel.matriz}
            hoje={hojeIso()}
            salvando={painel.salvando}
            onAlternar={(o, c) => void painel.alternar(o, c)}
            contagens={painel.contagens}
            onAbrirFicha={(linha) => {
              void queryClient.invalidateQueries({ queryKey: CHAVE_CONTAGENS });
              setFicha(linha);
            }}
          />
        </PainelMensalEstados>
      </div>
      <Dialog open={ficha != null} onOpenChange={(aberto) => { if (!aberto) setFicha(null); }}>
        <DialogContent className="flex max-h-[min(92vh,780px)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Ficha do cliente</DialogTitle>
            <DialogDescription className="truncate">{ficha?.clienteNome}</DialogDescription>
          </DialogHeader>
          {ficha && (
            <FichaClienteAcessos key={ficha.clienteId} clienteId={ficha.clienteId} clienteNome={ficha.clienteNome} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
