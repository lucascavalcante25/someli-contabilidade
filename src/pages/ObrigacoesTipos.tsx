import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Layers, Info } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import TableScroll from '@/components/shared/TableScroll';
import ModalShell from '@/components/shared/ModalShell';
import AppSelect from '@/components/shared/AppSelect';
import DateField from '@/components/shared/DateField';
import HintTooltip from '@/components/shared/HintTooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rotuloRegime, rotuloTipoObrigacao, TIPOS_OBRIGACAO } from '@/lib/classificacao';
import { proximaDataPadrao, rotuloVencimento, type VencimentoPadrao } from '@/lib/vencimentoPadrao';
import VencimentoPadraoFields, { type VencimentoPadraoForm } from '@/components/obrigacoes/VencimentoPadraoFields';

function labelRegime(regime: string): string {
  return rotuloRegime(regime);
}

function nomesDoTemplate(itens?: { obrigacaoNome?: string }[]): string[] {
  return (itens || []).map((i) => i.obrigacaoNome).filter((n): n is string => !!n && n.trim().length > 0);
}

interface ObrigacaoTipo extends VencimentoPadrao {
  id: number;
  nome: string;
  tipo: string;
  descricao: string;
  diasAntecedenciaAlerta: number;
  urlPortal?: string | null;
}

interface ClienteOpt {
  id: number;
  razaoSocial: string;
  tagIds?: number[];
}


export default function ObrigacoesTipos() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ObrigacaoTipo | null>(null);
  const [showMassa, setShowMassa] = useState(false);
  const [massaTipo, setMassaTipo] = useState<ObrigacaoTipo | null>(null);
  const [templates, setTemplates] = useState<
    { codigo: string; nome: string; regime: string; descricao?: string; itens: { obrigacaoNome: string }[] }[]
  >([]);
  const [aplicandoTemplate, setAplicandoTemplate] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [res, resTpl] = await Promise.all([
        apiFetch(`${apiBaseUrl}/obrigacoes`, { headers: { 'Content-Type': 'application/json' } }),
        apiFetch(`${apiBaseUrl}/obrigacao-templates`, { headers: { 'Content-Type': 'application/json' } }),
      ]);
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      setObrigacoes(Array.isArray(data) ? data : []);
      if (resTpl.ok) {
        const tpl = await resTpl.json();
        setTemplates(Array.isArray(tpl) ? tpl : []);
      }
    } catch {
      toast.error('Erro ao carregar tipos de obrigação');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const aplicarTemplateRegime = async (codigo: string) => {
    const tpl = templates.find((t) => t.codigo === codigo);
    const nomesFallback = nomesDoTemplate(tpl?.itens);
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-20`;
    setAplicandoTemplate(codigo);
    try {
      const res = await apiFetch(`${apiBaseUrl}/obrigacao-templates/${codigo}/aplicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataVencimento: iso, apenasDoRegime: true, clienteIds: [] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Falha ao aplicar template');
      }
      const body = await res.json();
      const nomesLista = Array.isArray(body.obrigacaoNomes) && body.obrigacaoNomes.length > 0
        ? body.obrigacaoNomes.map(String)
        : nomesFallback;
      const nomesTxt = nomesLista.length > 0 ? nomesLista.join(', ') : 'obrigações do pacote';
      const criados = Number(body.vinculosCriados ?? 0);
      const atingidos = Number(body.clientesAtingidos ?? 0);
      const alvo = Number(body.clientesAlvo ?? 0);
      const ignorados = Number(body.vinculosIgnorados ?? 0);
      const regimeLabel = labelRegime(String(body.regime || tpl?.regime || ''));

      if (criados === 0) {
        toast.message(
          `Nenhum vínculo novo em ${alvo} cliente(s) ${regimeLabel || 'do regime'}: já tinham ${nomesTxt}.`
          + (ignorados > 0 ? ` (${ignorados} já existentes ignorados.)` : '')
        );
      } else {
        toast.success(
          `Aplicado a ${atingidos} cliente(s)${regimeLabel ? ` (${regimeLabel})` : ''}: ${nomesTxt}. `
          + `${criados} vínculo(s) criado(s)`
          + (ignorados > 0 ? `; ${ignorados} já existiam e foram ignorados` : '')
          + '.'
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao aplicar template');
    } finally {
      setAplicandoTemplate(null);
    }
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSave = async (form: TipoForm) => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        descricao: form.descricao?.trim() || null,
        diasAntecedenciaAlerta: form.diasAntecedenciaAlerta ?? 7,
        urlPortal: form.urlPortal?.trim() ?? '',
        periodicidadePadrao: form.vencimento.periodicidadePadrao,
        diaVencimentoPadrao: form.vencimento.diaVencimentoPadrao ? Number(form.vencimento.diaVencimentoPadrao) : null,
        mesVencimentoPadrao: form.vencimento.mesVencimentoPadrao ? Number(form.vencimento.mesVencimentoPadrao) : null,
      };
      const url = editing ? `${apiBaseUrl}/obrigacoes/${editing.id}` : `${apiBaseUrl}/obrigacoes`;
      const res = await apiFetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || 'Erro ao salvar');
      }
      const saved = await res.json();
      if (editing) {
        setObrigacoes(prev => prev.map(o => (o.id === saved.id ? saved : o)));
        toast.success('Tipo atualizado');
      } else {
        setObrigacoes(prev => [...prev, saved]);
        toast.success('Tipo adicionado');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remover este tipo de obrigação?')) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/obrigacoes/${id}`, { method: 'DELETE', headers: {} });
      if (!res.ok) throw new Error('Erro ao remover');
      setObrigacoes(prev => prev.filter(o => o.id !== id));
      toast.success('Tipo removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Tipos de Obrigação</h1>
          <p className="text-sm text-muted-foreground mt-1">{obrigacoes.length} tipos cadastrados</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => { setMassaTipo(null); setShowMassa(true); }}
            className="flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <Layers size={16} /> Aplicar em massa
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} /> Novo Tipo
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="card-surface p-4 space-y-3 mb-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Templates por regime</p>
            <p className="text-sm text-muted-foreground">
              Cada pacote cria vínculos de obrigações (e a 1ª ocorrência) nos clientes <strong className="font-medium text-foreground">ativos</strong> cujo
              {' '}<strong className="font-medium text-foreground">regime tributário</strong> está cadastrado igual ao do card.
              Quem já tem a obrigação ativa é ignorado (não duplica).
            </p>
            <p className="text-xs text-muted-foreground">
              Sem regime preenchido, o cliente não é elegível.
              {' '}
              <Link to="/clientes" className="text-primary hover:underline font-medium">
                Abra Clientes → Editar
              </Link>
              {' '}e informe MEI, Simples Nacional, Lucro Presumido ou Lucro Real.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {templates.map((t) => {
              const nomes = nomesDoTemplate(t.itens);
              const regimeTxt = labelRegime(t.regime);
              return (
                <div key={t.codigo} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">{t.nome}</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          aria-label={`Ver obrigações do pacote ${t.nome}`}
                        >
                          <Info size={15} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72 space-y-2 p-3 text-sm">
                        <p className="font-medium text-foreground">Obrigações neste pacote</p>
                        {nomes.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                            {nomes.map((n) => (
                              <li key={n}>{n}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-xs">Nenhum item cadastrado neste template.</p>
                        )}
                        <p className="text-[11px] text-muted-foreground leading-snug border-t border-border pt-2">
                          Aplica estas obrigações a todos os clientes ativos com regime {regimeTxt}.
                          Quem já tem a obrigação ativa é ignorado (não atualiza nem duplica).
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {regimeTxt} · {nomes.length} obrigação{nomes.length === 1 ? '' : 'ões'}
                  </p>
                  {nomes.length > 0 && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2" title={nomes.join(', ')}>
                      {nomes.join(' · ')}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={aplicandoTemplate === t.codigo}
                    onClick={() => void aplicarTemplateRegime(t.codigo)}
                    className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {aplicandoTemplate === t.codigo ? 'Aplicando…' : 'Aplicar ao regime'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-surface overflow-hidden max-w-full">
        <TableScroll>
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-3 sm:px-4 py-3 text-left">Nome</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden sm:table-cell">Tipo</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden sm:table-cell whitespace-nowrap">Vencimento</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden lg:table-cell">Portal</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden md:table-cell">Descrição</th>
                <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Dias</th>
                <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!loading && obrigacoes.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Nenhum tipo cadastrado</td></tr>
              )}
              {obrigacoes.map(o => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 sm:px-4 py-3 font-medium min-w-[120px] max-w-[180px] sm:max-w-none">
                    <HintTooltip content={o.nome} enabled={!!o.nome && o.nome.length > 22}>
                      <span className="block truncate">{o.nome}</span>
                    </HintTooltip>
                    <span className="sm:hidden text-[10px] text-muted-foreground">{rotuloTipoObrigacao(o.tipo)} · {rotuloVencimento(o)}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">{rotuloTipoObrigacao(o.tipo)}</td>
                  <td className="px-3 sm:px-4 py-3 hidden sm:table-cell whitespace-nowrap text-muted-foreground">{rotuloVencimento(o)}</td>
                  <td className="px-3 sm:px-4 py-3 hidden lg:table-cell text-muted-foreground max-w-[160px] truncate">
                    {o.urlPortal ? (
                      <a href={o.urlPortal} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                        Link rápido
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{o.descricao || '-'}</td>
                  <td className="px-3 sm:px-4 py-3 text-center tabular-nums">{o.diasAntecedenciaAlerta}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <HintTooltip content="Aplicar em massa">
                        <button
                          type="button"
                          onClick={() => { setMassaTipo(o); setShowMassa(true); }}
                          className="p-1.5 rounded hover:bg-muted"
                          aria-label="Aplicar em massa"
                        >
                          <Layers size={14} />
                        </button>
                      </HintTooltip>
                      <HintTooltip content="Editar">
                        <button
                          type="button"
                          onClick={() => { setEditing(o); setShowForm(true); }}
                          className="p-1.5 rounded hover:bg-muted"
                          aria-label="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      </HintTooltip>
                      <HintTooltip content="Excluir">
                        <button
                          type="button"
                          onClick={() => void handleDelete(o.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          aria-label="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </HintTooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <AnimatePresence>
        {showForm && (
          <ObrigacaoTipoFormModal
            editing={editing}
            loading={saving}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMassa && (
          <AplicarEmMassaModal
            tipos={obrigacoes}
            tipoInicial={massaTipo}
            apiBaseUrl={apiBaseUrl}
            onClose={() => { setShowMassa(false); setMassaTipo(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AplicarEmMassaModal({
  tipos,
  tipoInicial,
  apiBaseUrl,
  onClose,
}: {
  tipos: ObrigacaoTipo[];
  tipoInicial: ObrigacaoTipo | null;
  apiBaseUrl: string;
  onClose: () => void;
}) {
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [obrigacaoId, setObrigacaoId] = useState(String(tipoInicial?.id ?? tipos[0]?.id ?? ''));
  const [selected, setSelected] = useState<number[]>([]);
  const [tagId, setTagId] = useState('');
  const [tags, setTags] = useState<{ id: number; nome: string }[]>([]);
  const dataSugerida = (id: string) => {
    const tipo = tipos.find((t) => String(t.id) === id);
    if (tipo) {
      const padrao = proximaDataPadrao(tipo);
      if (padrao) return padrao;
    }
    const d = new Date();
    d.setDate(20);
    return d.toISOString().slice(0, 10);
  };
  const [dataVencimento, setDataVencimento] = useState(() => dataSugerida(String(tipoInicial?.id ?? tipos[0]?.id ?? '')));
  const tipoSelecionado = tipos.find((t) => String(t.id) === obrigacaoId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [resCli, resTags] = await Promise.all([
          apiFetch(`${apiBaseUrl}/clientes`, { headers: { 'Content-Type': 'application/json' } }),
          apiFetch(`${apiBaseUrl}/tags`, { headers: { 'Content-Type': 'application/json' } }),
        ]);
        if (resCli.ok) {
          const data = await resCli.json();
          setClientes(
            (Array.isArray(data) ? data : []).map((c: any) => ({
              id: c.id,
              razaoSocial: c.razaoSocial || c.nomeFantasia || `#${c.id}`,
              tagIds: Array.isArray(c.tags) ? c.tags.map((t: any) => Number(t.id)) : [],
            }))
          );
        }
        if (resTags.ok) {
          const data = await resTags.json();
          setTags((Array.isArray(data) ? data : []).map((t: any) => ({ id: Number(t.id), nome: String(t.nome) })));
        }
      } catch {
        setClientes([]);
      }
    })();
  }, [apiBaseUrl]);

  const clientesVisiveis = tagId
    ? clientes.filter((c) => (c as any).tagIds?.includes(Number(tagId)))
    : clientes;

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const aplicar = async () => {
    if (!obrigacaoId || selected.length === 0) {
      toast.error('Selecione o tipo e ao menos um cliente');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`${apiBaseUrl}/obrigacoes/aplicar-em-massa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteIds: selected,
          obrigacaoId: Number(obrigacaoId),
          dataVencimento,
          // Periodicidade e dia vêm do tipo (anual continua anual)
          tagId: tagId ? Number(tagId) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Falha na aplicação em massa');
      }
      const body = await res.json();
      toast.success(`${body.criadas} vínculo(s) criado(s) de ${body.solicitadas} solicitados`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="md">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Aplicar obrigação em massa</h2>
          <p className="text-sm text-muted-foreground">Clientes que já possuem o vínculo ativo são ignorados.</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="label-text">Tipo de obrigação</label>
          <AppSelect
            className="mt-1.5"
            value={obrigacaoId}
            onChange={(v) => { setObrigacaoId(v); setDataVencimento(dataSugerida(v)); }}
            options={tipos.map((t) => ({ value: String(t.id), label: t.nome }))}
          />
        </div>
        <div>
          <label className="label-text">Filtrar por tag (opcional)</label>
          <AppSelect
            className="mt-1.5"
            value={tagId}
            onChange={(v) => { setTagId(v); setSelected([]); }}
            allowEmpty
            placeholder="Todas"
            options={[
              { value: '', label: 'Todas' },
              ...tags.map((t) => ({ value: String(t.id), label: t.nome })),
            ]}
          />
        </div>
        <div>
          <label className="label-text">Data de vencimento (1ª ocorrência)</label>
          <DateField value={dataVencimento} onChange={setDataVencimento} className="mt-1.5" />
          {tipoSelecionado && (
            <p className="mt-1 text-[11px] text-muted-foreground">Repete: {rotuloVencimento(tipoSelecionado)}</p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text">Clientes</label>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setSelected(clientesVisiveis.map((c) => c.id))}
            >
              Selecionar todos
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto border border-border rounded-md divide-y">
            {clientesVisiveis.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                <span className="truncate">{c.razaoSocial}</span>
              </label>
            ))}
            {clientesVisiveis.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum cliente na sua alçada{tagId ? ' com esta tag' : ''}.</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
        <button onClick={onClose} className="px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
        <button
          disabled={saving}
          onClick={() => void aplicar()}
          className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Aplicando...' : `Aplicar (${selected.length})`}
        </button>
      </div>
    </ModalShell>
  );
}

function ObrigacaoTipoFormModal({
  editing,
  loading,
  onClose,
  onSave,
}: {
  editing: ObrigacaoTipo | null;
  loading: boolean;
  onClose: () => void;
  onSave: (f: TipoForm) => void;
}) {
  const [form, setForm] = useState<TipoForm>(() => formDoTipo(editing));

  useEffect(() => {
    setForm(formDoTipo(editing));
  }, [editing]);

  return (
    <ModalShell onClose={onClose} maxWidth="sm">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold">{editing ? 'Editar Tipo' : 'Novo Tipo'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label-text">Nome</label>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm" placeholder="Ex: DAS, Alvará" />
          </div>
          <div>
            <label className="label-text">Tipo</label>
            <AppSelect
              value={form.tipo}
              onChange={(v) => setForm((p) => ({ ...p, tipo: v }))}
              className="mt-1.5"
              options={TIPOS_OBRIGACAO.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>
          <VencimentoPadraoFields value={form.vencimento} onChange={(vencimento) => setForm((p) => ({ ...p, vencimento }))} />
          <div>
            <label className="label-text">Link rápido (portal)</label>
            <input
              value={form.urlPortal}
              onChange={e => setForm(p => ({ ...p, urlPortal: e.target.value }))}
              className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm"
              placeholder="https://login.esocial.gov.br/..."
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              URL oficial onde a equipe executa a obrigação (eSocial, PGDAS, FGTS…).
            </p>
          </div>
          <div>
            <label className="label-text">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm resize-none" placeholder="Opcional" />
          </div>
          <div>
            <label className="label-text">Dias de antecedência do alerta</label>
            <input type="number" min={0} value={form.diasAntecedenciaAlerta} onChange={e => setForm(p => ({ ...p, diasAntecedenciaAlerta: Number(e.target.value) }))} className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm tabular-nums" />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
          <button disabled={loading} onClick={() => onSave(form)} className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">{loading ? 'Salvando...' : 'Salvar'}</button>
        </div>
    </ModalShell>
  );
}

interface TipoForm {
  nome: string;
  tipo: string;
  descricao: string;
  diasAntecedenciaAlerta: number;
  urlPortal: string;
  vencimento: VencimentoPadraoForm;
}

function formDoTipo(t: ObrigacaoTipo | null): TipoForm {
  return {
    nome: t?.nome ?? '',
    tipo: t?.tipo ?? 'FISCAL',
    descricao: t?.descricao ?? '',
    diasAntecedenciaAlerta: t?.diasAntecedenciaAlerta ?? 7,
    urlPortal: t?.urlPortal ?? '',
    vencimento: {
      periodicidadePadrao: t?.periodicidadePadrao ?? 'MENSAL',
      diaVencimentoPadrao: t?.diaVencimentoPadrao ? String(t.diaVencimentoPadrao) : '',
      mesVencimentoPadrao: t?.mesVencimentoPadrao ? String(t.mesVencimentoPadrao) : '',
    },
  };
}
