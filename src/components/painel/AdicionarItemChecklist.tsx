import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { TIPOS_OBRIGACAO } from '@/lib/classificacao';
import {
  adicionarAoChecklist,
  carregarCatalogo,
  criarTipoObrigacao,
  rotuloCompetencia,
  type TipoObrigacao,
} from '@/lib/painelMensal';
import { competenciaDoVencimento, vencimentoNaCompetencia } from '@/lib/painelQuadro';
import { Permissoes } from '@/lib/permissions';

interface AdicionarItemChecklistProps {
  clienteId: number;
  /** Competência do painel aberto (yyyy-MM). */
  competencia: string;
  /** Nomes que já estão no checklist deste mês (não aparecem de novo na lista). */
  jaNoChecklist: string[];
  onAdicionado: () => void;
}

const NOVO = 'novo';
const campo = 'w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20';

/**
 * Adiciona um item ao checklist do cliente. Grava o mesmo vínculo do "Editar cliente"
 * (aparece no cadastro e no Painel do mês). Pode criar uma obrigação nova no catálogo.
 */
export default function AdicionarItemChecklist({ clienteId, competencia, jaNoChecklist, onAdicionado }: AdicionarItemChecklistProps) {
  const { can } = useAuth();
  const podeCriarTipo = can(Permissoes.OBRIGACOES_TIPOS_GERENCIAR);
  const [aberto, setAberto] = useState(false);
  const [catalogo, setCatalogo] = useState<TipoObrigacao[] | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [nomeNovo, setNomeNovo] = useState('');
  const [areaNova, setAreaNova] = useState<string>('FISCAL');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto || catalogo) return;
    let ativo = true;
    carregarCatalogo()
      .then((lista) => { if (ativo) setCatalogo(lista); })
      .catch((e) => { if (ativo) setErroCatalogo(e instanceof Error ? e.message : 'Não foi possível carregar as obrigações'); });
    return () => { ativo = false; };
  }, [aberto, catalogo]);

  const opcoes = useMemo(
    () => (catalogo ?? [])
      .filter((t) => !jaNoChecklist.includes(t.nome))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [catalogo, jaNoChecklist],
  );

  if (!can(Permissoes.OBRIGACOES_CRIAR)) return null;

  const escolher = (valor: string) => {
    setEscolhido(valor);
    const tipo = valor === NOVO ? {} : catalogo?.find((t) => String(t.id) === valor);
    setVencimento(tipo ? vencimentoNaCompetencia(tipo, competencia) : '');
  };

  const fechar = () => {
    setAberto(false);
    setEscolhido('');
    setVencimento('');
    setNomeNovo('');
  };

  const salvar = async () => {
    if (!escolhido || !vencimento) return;
    if (escolhido === NOVO && !nomeNovo.trim()) {
      toast.error('Informe o nome da obrigação nova');
      return;
    }
    setSalvando(true);
    try {
      let obrigacaoId = Number(escolhido);
      if (escolhido === NOVO) {
        const criado = await criarTipoObrigacao({ nome: nomeNovo.trim(), tipo: areaNova, diaVencimentoPadrao: Number(vencimento.slice(8, 10)) });
        obrigacaoId = criado.id;
        setCatalogo(null); // recarrega na próxima vez, já com o tipo novo
      }
      await adicionarAoChecklist(clienteId, obrigacaoId, vencimento);
      toast.success('Item adicionado ao checklist do cliente');
      fechar();
      onAdicionado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível adicionar o item');
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
      >
        <Plus size={14} /> Adicionar item
      </button>
    );
  }

  const outraCompetencia = vencimento && competenciaDoVencimento(vencimento) !== competencia;

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      {erroCatalogo ? (
        <p className="text-sm text-destructive">{erroCatalogo}</p>
      ) : !catalogo ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Carregando obrigações...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block min-w-0 text-xs font-medium text-muted-foreground">
              Obrigação
              <select aria-label="Obrigação" value={escolhido} onChange={(e) => escolher(e.target.value)} className={`${campo} mt-1`}>
                <option value="" disabled>Escolha...</option>
                {opcoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                {podeCriarTipo && <option value={NOVO}>+ Nova obrigação (criar no catálogo)</option>}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Vencimento
              <input aria-label="Vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)}
                className={`${campo} mt-1`} />
            </label>
          </div>
          {escolhido === NOVO && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block min-w-0 text-xs font-medium text-muted-foreground">
                Nome da obrigação nova
                <input aria-label="Nome da obrigação nova" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)}
                  placeholder="Ex.: Parcelamento ICMS" maxLength={120} className={`${campo} mt-1`} />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Área
                <select aria-label="Área" value={areaNova} onChange={(e) => setAreaNova(e.target.value)} className={`${campo} mt-1`}>
                  {TIPOS_OBRIGACAO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Entra no catálogo como mensal, no dia escolhido acima. Dá para ajustar depois em Tipos de Obrigação.
              </p>
            </div>
          )}
          {outraCompetencia && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Com esse vencimento, o item aparece no painel de {rotuloCompetencia(competenciaDoVencimento(vencimento))}, não neste mês.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Fica ligado ao cliente no sistema todo: aparece também no cadastro do cliente e nos dois painéis.
          </p>
        </>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={salvando}>Cancelar</Button>
        <Button type="button" size="sm" onClick={() => void salvar()} disabled={salvando || !escolhido || !vencimento}>
          {salvando && <Loader2 size={14} className="mr-1 animate-spin" />}
          Adicionar ao checklist
        </Button>
      </div>
    </div>
  );
}
