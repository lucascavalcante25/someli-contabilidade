import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { carregarContagens, CHAVE_CONTAGENS, type FichaContagem } from '@/lib/acessos';
import { correspondeBusca } from '@/lib/buscaClientes';
import {
  alterarConclusao,
  carregarPainel,
  carregarSegmentos,
  definirSegmento,
  competenciaDeTrabalho,
  estaFeita,
  montarMatriz,
  type OcorrenciaPainel,
  type Segmento,
} from '@/lib/painelMensal';

export const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Dados do Painel do mês, compartilhados pelo painel em tabela (V1) e pelo quadro em cartões (V2):
 * mesma API e mesmas marcações, então o que se marca num aparece no outro.
 */
export function usePainelMensal() {
  const [competencia, setCompetencia] = useState(competenciaDeTrabalho());
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPainel[]>([]);
  const [segmentos, setSegmentos] = useState<Record<number, Segmento>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState('');
  const [segmento, setSegmento] = useState('');
  const [soPendentes, setSoPendentes] = useState(false);

  const contagensQuery = useQuery({
    queryKey: CHAVE_CONTAGENS,
    queryFn: () => carregarContagens().catch(() => [] as FichaContagem[]),
  });
  const contagens = useMemo(() => {
    const mapa: Record<number, FichaContagem> = {};
    for (const item of contagensQuery.data ?? []) mapa[item.clienteId] = item;
    return mapa;
  }, [contagensQuery.data]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [lista, segs] = await Promise.all([carregarPainel(competencia), carregarSegmentos().catch(() => ({}))]);
      setOcorrencias(lista);
      setSegmentos(segs);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o painel');
    } finally {
      setCarregando(false);
    }
  }, [competencia]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Recarrega sem trocar a tela por "Carregando" (o cartão aberto continua aberto). */
  const recarregarSemPiscar = useCallback(async () => {
    try {
      setOcorrencias(await carregarPainel(competencia));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar o painel');
    }
  }, [competencia]);

  const matriz = useMemo(() => {
    const filtradas = ocorrencias.filter(
      (o) =>
        (!setor || o.setor === setor) &&
        (!segmento || segmentos[o.clienteId] === segmento) &&
        correspondeBusca({ razaoSocial: o.clienteNome, nomeFantasia: o.clienteNomeFantasia ?? undefined, cnpj: '' }, busca)
    );
    const m = montarMatriz(filtradas);
    return soPendentes ? { ...m, linhas: m.linhas.filter((l) => l.feitas < l.total) } : m;
  }, [ocorrencias, setor, segmento, segmentos, busca, soPendentes]);

  const alternar = useCallback(async (o: OcorrenciaPainel, concluir: boolean) => {
    const anterior = o;
    setOcorrencias((lista) => lista.map((x) => (x.id === o.id ? { ...x, status: concluir ? 'CONCLUIDA' : 'PENDENTE' } : x)));
    setSalvando((s) => new Set(s).add(o.id));
    try {
      const atualizada = await alterarConclusao(o.id, concluir);
      setOcorrencias((lista) => lista.map((x) => (x.id === o.id ? { ...x, ...atualizada } : x)));
    } catch (e) {
      setOcorrencias((lista) => lista.map((x) => (x.id === o.id ? anterior : x)));
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando((s) => {
        const n = new Set(s);
        n.delete(o.id);
        return n;
      });
    }
  }, []);

  /** Arrastar o cartão para o outro segmento: muda na hora e grava; se falhar, volta. */
  const moverSegmento = useCallback(async (clienteId: number, novo: Segmento) => {
    let anterior: Segmento | undefined;
    setSegmentos((s) => {
      anterior = s[clienteId];
      return { ...s, [clienteId]: novo };
    });
    try {
      await definirSegmento(clienteId, novo);
      toast.success(novo === 'SERVICOS' ? 'Cliente movido para Serviços' : 'Cliente movido para Comércio e Indústria');
    } catch (e) {
      setSegmentos((s) => {
        const copia = { ...s };
        if (anterior) copia[clienteId] = anterior;
        else delete copia[clienteId];
        return copia;
      });
      toast.error(e instanceof Error ? e.message : 'Não foi possível mudar o segmento');
    }
  }, []);

  const percentual = matriz.total ? Math.round((matriz.feitas / matriz.total) * 100) : 0;
  const atrasadas = ocorrencias.filter((o) => !estaFeita(o) && o.status !== 'NAO_APLICAVEL' && o.dataVencimento < hojeIso()).length;

  return {
    competencia, setCompetencia,
    ocorrencias, segmentos, carregando, erro, carregar, recarregarSemPiscar, salvando,
    busca, setBusca, setor, setSetor, segmento, setSegmento, soPendentes, setSoPendentes,
    contagens, matriz, alternar, moverSegmento, percentual, atrasadas,
  };
}

export type PainelMensalEstado = ReturnType<typeof usePainelMensal>;
