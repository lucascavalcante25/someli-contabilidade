import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppSelect from '@/components/shared/AppSelect';
import type { CarteiraSetor } from '@/lib/responsaveis';

interface TransferirCarteiraDialogProps {
  usuarioNome: string;
  carteira: CarteiraSetor[];
  /** Usuários ativos que podem assumir (sem o que está saindo). */
  destinos: { id: number; nome: string }[];
  salvando: boolean;
  onConfirmar: (destinos: Record<string, number>) => void;
  onFechar: () => void;
}

/** Antes de excluir alguém, escolhe quem assume os clientes de cada setor. */
export default function TransferirCarteiraDialog({
  usuarioNome, carteira, destinos, salvando, onConfirmar, onFechar,
}: TransferirCarteiraDialogProps) {
  const [escolhas, setEscolhas] = useState<Record<string, number>>({});
  const totalClientes = new Set(carteira.flatMap((s) => s.clientes.map((c) => c.id))).size;
  const completo = carteira.every((s) => escolhas[s.setor] != null);
  const opcoes = destinos.map((d) => ({ value: String(d.id), label: d.nome }));

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvando && onFechar()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferir clientes antes de desativar</DialogTitle>
          <DialogDescription>
            {usuarioNome} responde por {totalClientes} cliente(s). Escolha quem assume cada setor. O histórico de quem foi
            responsável fica guardado.
          </DialogDescription>
        </DialogHeader>

        {destinos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {destinos.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setEscolhas(Object.fromEntries(carteira.map((s) => [s.setor, d.id])))}
                className="rounded-full border border-input px-3 py-1 text-xs hover:bg-muted"
              >
                {d.nome} para todos
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {carteira.map((s) => (
            <div key={s.setor} className="rounded-md border border-border p-3 space-y-2">
              <p className="text-sm font-medium">{s.setorLabel} ({s.clientes.length})</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{s.clientes.map((c) => c.nome).join(', ')}</p>
              <AppSelect
                value={escolhas[s.setor] != null ? String(escolhas[s.setor]) : ''}
                onChange={(v) => setEscolhas((e) => ({ ...e, [s.setor]: Number(v) }))}
                placeholder="Quem assume?"
                options={opcoes}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onFechar} disabled={salvando}
            className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={() => onConfirmar(escolhas)} disabled={!completo || salvando}
            className="flex items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">
            {salvando && <Loader2 size={16} className="animate-spin" />}
            Transferir e desativar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
