import { useCallback, useEffect, useMemo, useState } from 'react';
import ToggleValoresButton from '@/components/shared/ToggleValoresButton';
import ModalShell from '@/components/shared/ModalShell';
import BuscaRapidaCliente, { type ClienteParaBusca } from '@/components/dashboard/BuscaRapidaCliente';
import DashboardOperacao from '@/components/dashboard/DashboardOperacao';
import DashboardAtencao, { type CertificadoAlerta, type InadimplenteAlerta } from '@/components/dashboard/DashboardAtencao';
import DashboardFinanceiro, { type ResumoFinanceiroMes } from '@/components/dashboard/DashboardFinanceiro';
import { ClienteDetalhePanel } from '@/pages/ClienteDetalhe';
import { getGreeting } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useValoresVisibilidade } from '@/contexts/ValoresVisibilidadeContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { hojeIso } from '@/hooks/usePainelMensal';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { useMensagemDoDia } from '@/lib/mensagemDiaria';
import { carregarPainel, competenciaDeTrabalho, type OcorrenciaPainel } from '@/lib/painelMensal';

interface Alertas {
  certificados: CertificadoAlerta[];
  inadimplentes: InadimplenteAlerta[];
}

async function lerJson(url: string): Promise<unknown> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/**
 * Dashboard enxuto: Hoje, Andamento do mês (mesmos dados do Painel do mês), Atenção e Financeiro.
 * A antiga Fila de trabalho e os blocos repetidos saíram; o trabalho do dia fica no Painel do mês.
 */
export default function Dashboard() {
  const { user, can } = useAuth();
  const { mascarar } = useValoresVisibilidade();
  const isMobile = useIsMobile();
  const mensagem = useMensagemDoDia();
  const podeFinanceiro = can('FINANCEIRO_VISUALIZAR');
  const podeHonorario = can('HONORARIO_VISUALIZAR');
  const competencia = useMemo(() => competenciaDeTrabalho(), []);

  const [clientes, setClientes] = useState<ClienteParaBusca[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPainel[]>([]);
  const [carregandoOperacao, setCarregandoOperacao] = useState(true);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<Alertas>({ certificados: [], inadimplentes: [] });
  const [resumo, setResumo] = useState<ResumoFinanceiroMes | null>(null);
  const [grafico, setGrafico] = useState<{ mes: string; receita: number; despesa: number }[]>([]);
  const [viewClienteId, setViewClienteId] = useState<number | null>(null);
  // A lupa abre direto nas obrigações; os demais atalhos abrem no resumo
  const [abaInicial, setAbaInicial] = useState<'resumo' | 'obrigacoes'>('resumo');

  const carregarOperacao = useCallback(async () => {
    setCarregandoOperacao(true);
    setErroOperacao(null);
    try {
      setOcorrencias(await carregarPainel(competencia));
    } catch (e) {
      setErroOperacao(e instanceof Error ? e.message : 'Não foi possível carregar as atividades do mês.');
    } finally {
      setCarregandoOperacao(false);
    }
  }, [competencia]);

  useEffect(() => {
    void carregarOperacao();
    lerJson(`${API_BASE_URL}/clientes`)
      .then((data) => setClientes(lista(data).map((item) => {
        const c = objeto(item);
        return {
          id: Number(c.id),
          razaoSocial: String(c.razaoSocial ?? ''),
          nomeFantasia: String(c.nomeFantasia ?? ''),
          cnpj: String(c.cnpj ?? ''),
          proprietario: String(c.proprietario ?? ''),
          regimeTributario: c.regimeTributario ? String(c.regimeTributario) : undefined,
          tags: lista(c.tags) as ClienteParaBusca['tags'],
        };
      })))
      .catch(() => setClientes([]));
    lerJson(`${API_BASE_URL}/alertas-operacionais`)
      .then((data) => {
        const d = objeto(data);
        setAlertas({
          certificados: lista(d.certificados) as CertificadoAlerta[],
          inadimplentes: lista(d.inadimplentesItens) as InadimplenteAlerta[],
        });
      })
      .catch(() => setAlertas({ certificados: [], inadimplentes: [] }));
    if (podeFinanceiro) {
      lerJson(`${API_BASE_URL}/financeiro/resumo`)
        .then((data) => {
          const d = objeto(data);
          setResumo({
            receitaTotal: Number(d.receitaTotal ?? 0),
            receitaRecebida: Number(d.receitaRecebida ?? 0),
            receitaPendente: Number(d.receitaPendente ?? 0),
            despesaTotal: Number(d.despesaTotal ?? 0),
            saldo: Number(d.saldo ?? 0),
          });
        })
        .catch(() => setResumo(null));
      lerJson(`${API_BASE_URL}/financeiro/grafico`)
        .then((data) => setGrafico(lista(data).map((item) => {
          const g = objeto(item);
          return { mes: String(g.mes ?? ''), receita: Number(g.receita ?? 0), despesa: Number(g.despesa ?? 0) };
        })))
        .catch(() => setGrafico([]));
    }
  }, [carregarOperacao, podeFinanceiro]);

  // No celular o gráfico mostra só mês anterior, atual e próximo
  const graficoVisivel = useMemo(() => {
    if (!isMobile || grafico.length < 12) return grafico;
    const atual = new Date().getMonth();
    return [grafico[(atual + 11) % 12], grafico[atual], grafico[(atual + 1) % 12]];
  }, [isMobile, grafico]);

  const fecharCliente = () => {
    setViewClienteId(null);
    setAbaInicial('resumo');
  };

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{getGreeting()}, {user?.nome?.split(' ')[0]}</h1>
          {/* No celular o versículo do dia fica aqui (no computador ele aparece no topo) */}
          {isMobile && mensagem ? (
            <p className="mt-1 text-[13px] italic leading-snug text-muted-foreground">{mensagem}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Resumo do escritório</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <BuscaRapidaCliente
            clientes={clientes}
            onAbrir={(id) => {
              setAbaInicial('obrigacoes');
              setViewClienteId(id);
            }}
          />
          {podeHonorario && <ToggleValoresButton />}
        </div>
      </div>

      <DashboardOperacao
        ocorrencias={ocorrencias}
        competencia={competencia}
        hoje={hojeIso()}
        carregando={carregandoOperacao}
        erro={erroOperacao}
        onTentarDeNovo={() => void carregarOperacao()}
      />

      <DashboardAtencao
        certificados={alertas.certificados}
        inadimplentes={podeFinanceiro || podeHonorario ? alertas.inadimplentes : null}
        mascarar={mascarar}
        onAbrirCliente={(id) => setViewClienteId(id)}
      />

      {podeFinanceiro && <DashboardFinanceiro resumo={resumo} grafico={graficoVisivel} mascarar={mascarar} />}

      {viewClienteId != null && (
        <ModalShell onClose={fecharCliente} maxWidth="3xl" fixedSize className="sm:h-[min(860px,92vh)] sm:max-h-[92vh]">
          <ClienteDetalhePanel clienteId={viewClienteId} variant="modal" initialTab={abaInicial} onClose={fecharCliente} />
        </ModalShell>
      )}
    </div>
  );
}
