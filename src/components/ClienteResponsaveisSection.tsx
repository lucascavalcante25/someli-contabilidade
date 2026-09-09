import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { useAuth } from '@/contexts/AuthContext';
import { Permissoes, SETORES_RESPONSAVEL } from '@/lib/permissions';
import AppSelect from '@/components/shared/AppSelect';

interface ResponsavelItem {
  id?: number;
  setor: string;
  setorLabel: string;
  usuarioId?: number;
  usuarioNome?: string;
}

interface FuncionarioOpt {
  id: number;
  nome: string;
}

interface Props {
  clienteId: number;
}

const SETORES_PRINCIPAIS = [
  'FISCAL',
  'DEPARTAMENTO_PESSOAL',
  'CONTABIL',
  'FINANCEIRO',
  'GERENTE_CONTA',
];

export default function ClienteResponsaveisSection({ clienteId }: Props) {
  const { can } = useAuth();
  const podeEditar = can(Permissoes.CLIENTES_RESPONSAVEIS_EDITAR);
  const [itens, setItens] = useState<ResponsavelItem[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resResp, resFunc] = await Promise.all([
        apiFetch(`${API_BASE_URL}/clientes/${clienteId}/responsaveis`),
        apiFetch(`${API_BASE_URL}/usuarios/ativos`),
      ]);
      if (resResp.ok) {
        const data = await resResp.json();
        setItens(Array.isArray(data) ? data : []);
      }
      if (resFunc.ok) {
        const data = await resFunc.json();
        setFuncionarios((Array.isArray(data) ? data : []).map((u: any) => ({ id: u.id, nome: u.nome })));
      }
    } catch {
      toast.error('Falha ao carregar responsáveis');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = async (setor: string, usuarioId: number | null) => {
    setSaving(setor);
    try {
      const res = await apiFetch(`${API_BASE_URL}/clientes/${clienteId}/responsaveis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setor, usuarioId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Falha ao salvar');
      }
      toast.success('Responsável atualizado');
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const principais = itens.filter(i => SETORES_PRINCIPAIS.includes(i.setor));
  const extras = itens.filter(i => !SETORES_PRINCIPAIS.includes(i.setor));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando responsáveis…</p>;
  }

  return (
    <div className="card-surface p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold">Responsáveis pelo Cliente</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Defina o responsável de cada setor a partir dos funcionários ativos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[...principais, ...extras].map(item => {
          const label = item.setorLabel
            || SETORES_RESPONSAVEL.find(s => s.value === item.setor)?.label
            || item.setor;
          return (
            <div key={item.setor} className="rounded-md border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              {podeEditar ? (
                <AppSelect
                  value={item.usuarioId ? String(item.usuarioId) : ''}
                  onChange={(v) => void salvar(item.setor, v ? Number(v) : null)}
                  disabled={saving === item.setor}
                  placeholder="Sem responsável"
                  allowEmpty
                  options={[
                    { value: '', label: '— Sem responsável —' },
                    ...funcionarios.map(f => ({ value: String(f.id), label: f.nome })),
                  ]}
                />
              ) : (
                <p className="text-sm font-medium">{item.usuarioNome || '—'}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
