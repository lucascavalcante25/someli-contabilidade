import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { Permissoes } from '@/lib/permissions';
import HintTooltip from '@/components/shared/HintTooltip';

export interface TagItem {
  id: number;
  nome: string;
  cor?: string;
  automatica?: boolean;
  regra?: string | null;
}

interface Props {
  clienteId: number;
  onChanged?: (tags: TagItem[]) => void;
}

export default function ClienteTagsSection({ clienteId, onChanged }: Props) {
  const { can } = useAuth();
  const podeEditar = can(Permissoes.CLIENTES_EDITAR);
  const [catalogo, setCatalogo] = useState<TagItem[]>([]);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [resTags, resCli] = await Promise.all([
        apiFetch(`${API_BASE_URL}/tags`, { headers: { 'Content-Type': 'application/json' } }),
        apiFetch(`${API_BASE_URL}/clientes/${clienteId}/tags`, { headers: { 'Content-Type': 'application/json' } }),
      ]);
      if (resTags.ok) {
        const data = await resTags.json();
        setCatalogo(Array.isArray(data) ? data : []);
      }
      if (resCli.ok) {
        const data = await resCli.json();
        const lista: TagItem[] = Array.isArray(data) ? data : [];
        setSelecionadas(lista.map((t) => t.id));
        onChanged?.(lista);
      }
    } catch {
      toast.error('Erro ao carregar tags');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onChanged é opcional e instável
  }, [clienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const toggle = async (tag: TagItem) => {
    if (!podeEditar || tag.automatica) return;
    const next = selecionadas.includes(tag.id)
      ? selecionadas.filter((id) => id !== tag.id)
      : [...selecionadas, tag.id];
    // Mantém IDs de tags automáticas já aplicadas no cliente
    const autoIds = catalogo.filter((t) => t.automatica && selecionadas.includes(t.id)).map((t) => t.id);
    const payload = Array.from(new Set([...next.filter((id) => !catalogo.find((t) => t.id === id)?.automatica), ...autoIds]));
    setSelecionadas(payload);
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/clientes/${clienteId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Falha ao salvar tags');
      }
      const saved: TagItem[] = await res.json();
      setSelecionadas(saved.map((t) => t.id));
      onChanged?.(saved);
      toast.success('Tags atualizadas');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar tags');
      void carregar();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Tags operacionais</p>
        <p className="text-sm text-muted-foreground">
          Manuais (MEI, regime…) você escolhe. Automáticas (Novo cliente, Inadimplente) sobem e somem com o estado do cliente.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {catalogo.map((t) => {
          const checked = selecionadas.includes(t.id);
          const auto = !!t.automatica;
          return (
            <HintTooltip
              key={t.id}
              content={
                auto
                  ? 'Tag automática — sincronizada pelo sistema (não editar manualmente).'
                  : 'Tag manual — classificação estável.'
              }
            >
              <label
                className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/40'
                } ${!podeEditar || saving || auto ? 'opacity-70' : 'cursor-pointer'}`}
              >
                <Checkbox
                  checked={checked}
                  disabled={!podeEditar || saving || auto}
                  onCheckedChange={() => void toggle(t)}
                />
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: t.cor || 'hsl(var(--muted-foreground))' }}
                />
                <span className="font-medium">{t.nome.replace(/_/g, ' ')}</span>
                {auto && (
                  <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    auto
                  </span>
                )}
              </label>
            </HintTooltip>
          );
        })}
        {catalogo.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada no sistema.</p>
        )}
      </div>
    </div>
  );
}
