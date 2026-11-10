import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { carregarContagens, CHAVE_CONTAGENS, type FichaContagem } from '@/lib/acessos';
import { correspondeBusca } from '@/lib/buscaClientes';
import {
  AGUARDANDO_CLIENTE,
  alterarStatus,
  carregarPainel,
  carregarClientesDoPainel,
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
 * Dados do Painel do mês (quadro em cartões): ocorrências da competência, segmento e CNPJ de cada cliente.
 * As marcações são as mesmas do cadastro do cliente e do Andamento do Dashboard.
 */
export function usePainelMensal() {
  const [competencia, setCompetencia] = useState(competenciaDeTrabalho());
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPainel[]>([]);
  const [segmentos, setSegmentos] = useState<Record<number, Segmento>>({});
  const [cnpjs, setCnpjs] = useState<Record<number, string>>({});
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
      const [lista, clientes] = await Promise.all([
        carregarPainel(competencia),
        carregarClientesDoPainel().catch(() => ({ segmentos: {}, cnpjs: {} })),
      ]);
      setOcorrencias(lista);
      setSegmentos(clientes.segmentos);
      setCnpjs(clientes.cnpjs);
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

  const mudarStatus = useCallback(async (o: OcorrenciaPainel, status: Parameters<typeof alterarStatus>[1]) => {
    const anterior = o;
    setOcorrencias((lista) => lista.map((x) => (x.id === o.id ? { ...x, status } : x)));
    setSalvando((s) => new Set(s).add(o.id));
    try {
      const atualizada = await alterarStatus(o.id, status);
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

  const alternar = useCallback(
    (o: OcorrenciaPainel, concluir: boolean) => mudarStatus(o, concluir ? 'CONCLUIDA' : 'PENDENTE'),
    [mudarStatus],
  );
  const aguardarCliente = useCallback(
    (o: OcorrenciaPainel, aguardar: boolean) => mudarStatus(o, aguardar ? AGUARDANDO_CLIENTE : 'PENDENTE'),
    [mudarStatus],
  );

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
    ocorrencias, segmentos, cnpjs, carregando, erro, carregar, recarregarSemPiscar, salvando,
    busca, setBusca, setor, setSetor, segmento, setSegmento, soPendentes, setSoPendentes,
    contagens, matriz, alternar, aguardarCliente, moverSegmento, percentual, atrasadas,
  };
}

export type PainelMensalEstado = ReturnType<typeof usePainelMensal>;
