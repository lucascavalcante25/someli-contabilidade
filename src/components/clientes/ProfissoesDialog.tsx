import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CHAVE_PROFISSOES, listarProfissoes, salvarProfissao, type Profissao } from '@/lib/datasEspeciais';

const pad = (n: number) => String(n).padStart(2, '0');
const VAZIO = { nome: '', data: '', cnae: '' };

/** "25/10" → { dia: 25, mes: 10 } */
function lerDiaMes(texto: string): { dia: number; mes: number } | null {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(texto.trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const d = new Date(2024, mes - 1, dia); // 2024 é bissexto: 29/02 vale
  return d.getMonth() === mes - 1 && d.getDate() === dia ? { dia, mes } : null;
}

/** Lista de profissões e dias comemorativos, editável pelo escritório (sem mexer no código). */
export default function ProfissoesDialog({ onFechar }: { onFechar: () => void }) {
  const queryClient = useQueryClient();
  const consulta = useQuery({ queryKey: CHAVE_PROFISSOES, queryFn: listarProfissoes });
  const [editando, setEditando] = useState<Profissao | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const editar = (p: Profissao) => {
    setEditando(p);
    setForm({ nome: p.nome, data: `${pad(p.dia)}/${pad(p.mes)}`, cnae: p.cnaePrefixos ?? '' });
  };

  const salvar = async (entrada: Parameters<typeof salvarProfissao>[0], id?: number) => {
    setSalvando(true);
    try {
      await salvarProfissao(entrada, id);
      await queryClient.invalidateQueries({ queryKey: CHAVE_PROFISSOES });
      await queryClient.invalidateQueries({ queryKey: ['datas-especiais'] });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar a profissão');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const diaMes = lerDiaMes(form.data);
    if (!form.nome.trim()) return toast.error('Informe o nome da profissão');
    if (!diaMes) return toast.error('Informe o dia no formato dd/mm (ex.: 25/10)');
    const ok = await salvar({ nome: form.nome.trim(), ...diaMes, cnaePrefixos: form.cnae || null, ativo: editando?.ativo ?? true }, editando?.id);
    if (ok) {
      toast.success(editando ? 'Profissão atualizada' : 'Profissão incluída');
      setEditando(null);
      setForm(VAZIO);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => { if (!aberto) onFechar(); }}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-3 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Profissões e datas</DialogTitle>
          <DialogDescription>O dia de cada profissão aparece no calendário do Dashboard para os clientes dessa profissão.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void enviar(e)} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_6rem]">
          <input aria-label="Nome da profissão" placeholder="Profissão" value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-1" />
          <input aria-label="Dia comemorativo (dd/mm)" placeholder="dd/mm" inputMode="numeric" value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value.replace(/[^\d/]/g, '').slice(0, 5) })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm tabular-nums" />
          <input aria-label="CNAE que sugere a profissão" placeholder="CNAE (opcional, ex.: 8630504)" value={form.cnae}
            onChange={(e) => setForm({ ...form, cnae: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-1" />
          <div className="col-span-2 flex justify-end gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-2">
            {editando && (
              <button type="button" onClick={() => { setEditando(null); setForm(VAZIO); }}
                className="h-9 rounded-md border border-border px-3 text-xs hover:bg-muted">Cancelar</button>
            )}
            <button type="submit" disabled={salvando}
              className="h-9 flex-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {editando ? 'Salvar' : 'Incluir'}
            </button>
          </div>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {consulta.isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Carregando profissões…</p>
          ) : consulta.isError ? (
            <div className="py-4 text-center text-sm text-destructive">
              {consulta.error instanceof Error ? consulta.error.message : 'Não foi possível carregar as profissões.'}{' '}
              <button type="button" className="underline" onClick={() => void consulta.refetch()}>Tentar de novo</button>
            </div>
          ) : !consulta.data?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma profissão cadastrada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {consulta.data.map((p) => (
                <li key={p.id} className={`flex items-center gap-2 py-2 text-sm ${p.ativo ? '' : 'opacity-60'}`}>
                  <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{`${pad(p.dia)}/${pad(p.mes)}`}</span>
                  <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                  <button type="button" aria-label={`Editar ${p.nome}`} onClick={() => editar(p)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" disabled={salvando}
                    onClick={() => void salvar({ nome: p.nome, dia: p.dia, mes: p.mes, cnaePrefixos: p.cnaePrefixos, ativo: !p.ativo }, p.id)}
                    className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-muted">
                    {p.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
