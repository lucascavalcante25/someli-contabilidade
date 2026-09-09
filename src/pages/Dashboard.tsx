import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, DollarSign, Clock, Receipt, TrendingUp, AlertTriangle, Calendar, AlertCircle } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import ToggleValoresButton from '@/components/shared/ToggleValoresButton';
import { formatCurrency, getGreeting } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useValoresVisibilidade } from '@/contexts/ValoresVisibilidadeContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import OcorrenciaWorkList from '@/components/obrigacoes/OcorrenciaWorkList';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--sidebar-primary))', 'hsl(var(--accent))'];

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

interface ClienteResumo {
  id: number;
  status: string;
  honorario: number;
}

interface ResumoFinanceiro {
  receitaTotal: number;
  receitaRecebida: number;
  receitaPendente: number;
  despesaTotal: number;
  despesasPagas: number;
  saldo: number;
}

interface GraficoItem {
  mes: string;
  receita: number;
  despesa: number;
}

interface ObrigacoesDashboard {
  vencendoHoje: { id: number; obrigacaoNome: string; dataVencimento: string; clienteId: number }[];
  vencendoEmBreve: { id: number; obrigacaoNome: string; dataVencimento: string; clienteId: number }[];
  atrasadas: { id: number; obrigacaoNome: string; dataVencimento: string; clienteId: number }[];
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const { mascarar, visiveis } = useValoresVisibilidade();
  const isMobile = useIsMobile();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<ClienteResumo[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [chartData, setChartData] = useState<GraficoItem[]>([]);
  const [obrigacoesDashboard, setObrigacoesDashboard] = useState<ObrigacoesDashboard | null>(null);
  const [meuTrabalho, setMeuTrabalho] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const podeFinanceiro = can('FINANCEIRO_VISUALIZAR');
  const podeHonorario = can('HONORARIO_VISUALIZAR');

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        apiFetch(`${apiBaseUrl}/clientes`, { headers: getAuthHeaders() }),
        apiFetch(`${apiBaseUrl}/meu-trabalho`, { headers: getAuthHeaders() }),
        apiFetch(`${apiBaseUrl}/obrigacoes/dashboard`, { headers: getAuthHeaders() }),
      ];
      if (podeFinanceiro) {
        fetches.push(
          apiFetch(`${apiBaseUrl}/financeiro/resumo`, { headers: getAuthHeaders() }),
          apiFetch(`${apiBaseUrl}/financeiro/grafico`, { headers: getAuthHeaders() }),
        );
      }

      const results = await Promise.all(fetches);
      const resClientes = results[0];
      const resMeu = results[1];
      const resObrigacoes = results[2];
      const resResumo = podeFinanceiro ? results[3] : null;
      const resGrafico = podeFinanceiro ? results[4] : null;

      if (resClientes.ok) {
        const data = await resClientes.json();
        setClientes(
          (Array.isArray(data) ? data : []).map((c: any) => ({
            id: c.id,
            status: c.status ?? 'pendente',
            honorario: Number(c.honorario ?? 0),
          }))
        );
      }

      if (resMeu.ok) {
        setMeuTrabalho(await resMeu.json());
      }

      if (resResumo?.ok) {
        const data = await resResumo.json();
        setResumo({
          receitaTotal: Number(data.receitaTotal ?? 0),
          receitaRecebida: Number(data.receitaRecebida ?? 0),
          receitaPendente: Number(data.receitaPendente ?? 0),
          despesaTotal: Number(data.despesaTotal ?? 0),
          despesasPagas: Number(data.despesasPagas ?? 0),
          saldo: Number(data.saldo ?? 0),
        });
      } else if (!podeFinanceiro) {
        setResumo(null);
      }

      if (resGrafico?.ok) {
        const data = await resGrafico.json();
        setChartData(
          (Array.isArray(data) ? data : []).map((d: any) => ({
            mes: d.mes ?? '',
            receita: Number(d.receita ?? 0),
            despesa: Number(d.despesa ?? 0),
          }))
        );
      } else if (!podeFinanceiro) {
        setChartData([]);
      }

      if (resObrigacoes.ok) {
        const data = await resObrigacoes.json();
        setObrigacoesDashboard({
          vencendoHoje: Array.isArray(data.vencendoHoje) ? data.vencendoHoje : [],
          vencendoEmBreve: Array.isArray(data.vencendoEmBreve) ? data.vencendoEmBreve : [],
          atrasadas: Array.isArray(data.atrasadas) ? data.atrasadas : [],
        });
      } else {
        setObrigacoesDashboard({ vencendoHoje: [], vencendoEmBreve: [], atrasadas: [] });
      }
    } catch {
      setClientes([]);
      setResumo(null);
      setChartData([]);
      setObrigacoesDashboard(null);
      setMeuTrabalho(null);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, podeFinanceiro]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const totalClientes = clientes.length;
  const receitaTotal = resumo?.receitaTotal ?? clientes.reduce((s, c) => s + c.honorario, 0);
  const receitaPendente = resumo?.receitaPendente ?? clientes.filter((c) => c.status !== 'em_dia').reduce((s, c) => s + c.honorario, 0);
  const despesaTotal = resumo?.despesaTotal ?? 0;
  const saldo = resumo?.saldo ?? receitaTotal - despesaTotal;

  const adimplenciaData = [
    { name: 'Em dia', value: clientes.filter((c) => c.status === 'em_dia').length },
    { name: 'Pendente', value: clientes.filter((c) => c.status === 'pendente').length },
    { name: 'Atrasado', value: clientes.filter((c) => c.status === 'atrasado').length },
  ];

  const chartDataFull = chartData.length ? chartData : [
    { mes: 'Jan', receita: 0, despesa: 0 },
    { mes: 'Fev', receita: 0, despesa: 0 },
    { mes: 'Mar', receita: 0, despesa: 0 },
    { mes: 'Abr', receita: 0, despesa: 0 },
    { mes: 'Mai', receita: 0, despesa: 0 },
    { mes: 'Jun', receita: 0, despesa: 0 },
    { mes: 'Jul', receita: 0, despesa: 0 },
    { mes: 'Ago', receita: 0, despesa: 0 },
    { mes: 'Set', receita: 0, despesa: 0 },
    { mes: 'Out', receita: 0, despesa: 0 },
    { mes: 'Nov', receita: 0, despesa: 0 },
    { mes: 'Dez', receita: 0, despesa: 0 },
  ];

  const chartDataFinal = useMemo(() => {
    if (!isMobile) return chartDataFull;
    const mesAtualIndex = new Date().getMonth();
    const prev = (mesAtualIndex - 1 + 12) % 12;
    const next = (mesAtualIndex + 1) % 12;
    return [chartDataFull[prev], chartDataFull[mesAtualIndex], chartDataFull[next]];
  }, [isMobile, chartDataFull]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{getGreeting()}, {user?.nome?.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground mt-1">Aqui está o resumo do seu escritório</p>
        </div>
        {podeHonorario && <ToggleValoresButton />}
      </div>

      {meuTrabalho && (
        <div className="card-surface p-4 sm:p-5 space-y-3">
          <div>
            <h2 className="text-base font-semibold">Meu Trabalho</h2>
            <p className="text-sm text-muted-foreground">Obrigações e pendências da sua carteira</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-md bg-muted/40 p-3">
              <p className="label-text">Vence hoje</p>
              <p className="text-xl font-semibold tabular-nums">{meuTrabalho.vencendoHoje}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <p className="label-text">Próximos dias</p>
              <p className="text-xl font-semibold tabular-nums">{meuTrabalho.vencendoProximosDias}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <p className="label-text">Atrasadas</p>
              <p className="text-xl font-semibold tabular-nums text-destructive">{meuTrabalho.atrasadas}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <p className="label-text">Aguard. cliente</p>
              <p className="text-xl font-semibold tabular-nums">{meuTrabalho.aguardandoCliente}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <p className="label-text">Notificações</p>
              <p className="text-xl font-semibold tabular-nums">{meuTrabalho.notificacoesNaoLidas}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <p className="label-text">Minha carteira</p>
              <p className="text-xl font-semibold tabular-nums">{meuTrabalho.empresasNaCarteira}</p>
            </div>
          </div>
          {meuTrabalho.visaoGerencial && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-sm font-medium">Visão gerencial do mês</p>
              <p className="text-sm text-muted-foreground">
                {meuTrabalho.visaoGerencial.totalMes} obrigações · {meuTrabalho.visaoGerencial.concluidas} concluídas ·{' '}
                {meuTrabalho.visaoGerencial.pendentes} pendentes · {meuTrabalho.visaoGerencial.atrasadas} atrasadas
                {meuTrabalho.visaoGerencial.clientesSemResponsavel > 0
                  ? ` · ${meuTrabalho.visaoGerencial.clientesSemResponsavel} cliente(s) sem responsável`
                  : ''}
              </p>
              {Array.isArray(meuTrabalho.visaoGerencial.porSetor) && meuTrabalho.visaoGerencial.porSetor.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {meuTrabalho.visaoGerencial.porSetor.map((s: any) => (
                    <span key={s.setor} className="text-xs rounded-full bg-primary/10 text-primary px-2.5 py-1">
                      {s.label}: {s.percentual}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium">Fila de trabalho</p>
              <p className="text-xs text-muted-foreground">
                Admin/sócio com alçada global vê pendências de todas as áreas; demais perfis só a própria alçada.
              </p>
            </div>
            <OcorrenciaWorkList
              atrasadas={Array.isArray(meuTrabalho.obrigacoesAtrasadas) ? meuTrabalho.obrigacoesAtrasadas : []}
              proximas={Array.isArray(meuTrabalho.obrigacoesProximas) ? meuTrabalho.obrigacoesProximas : []}
              onUpdated={() => void carregarDados()}
            />
          </div>
        </div>
      )}

      {podeFinanceiro && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 min-w-0">
        <StatCard label="Clientes Ativos" value={String(totalClientes)} icon={Users} accent="primary" />
        <StatCard label="Receita Mensal" value={formatCurrency(receitaTotal)} icon={DollarSign} accent="success" sensitive />
        <StatCard label="Receita Pendente" value={formatCurrency(receitaPendente)} icon={Clock} accent="warning" sensitive />
        <StatCard label="Despesas do Mês" value={formatCurrency(despesaTotal)} icon={Receipt} accent="destructive" sensitive />
        <StatCard label="Saldo do Mês" value={formatCurrency(saldo)} icon={TrendingUp} accent={saldo >= 0 ? 'success' : 'destructive'} sensitive />
      </div>
      )}
      {!podeFinanceiro && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard label="Clientes na carteira" value={String(totalClientes)} icon={Users} accent="primary" />
        </div>
      )}

      {obrigacoesDashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card-surface p-5 cursor-pointer hover:ring-2 hover:ring-warning/30 transition-all"
            onClick={() => navigate('/clientes')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="label-text">Obrigações vencendo hoje</p>
                <p className="text-xl font-semibold tabular-nums">{obrigacoesDashboard.vencendoHoje.length}</p>
              </div>
              <div className="rounded-lg bg-warning/10 p-2.5">
                <Calendar size={18} className="text-warning" />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-surface p-5 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            onClick={() => navigate('/clientes')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="label-text">Obrigações vencendo em breve</p>
                <p className="text-xl font-semibold tabular-nums">{obrigacoesDashboard.vencendoEmBreve.length}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <AlertTriangle size={18} className="text-primary" />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-surface p-5 cursor-pointer hover:ring-2 hover:ring-destructive/30 transition-all"
            onClick={() => navigate('/clientes')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="label-text">Obrigações atrasadas</p>
                <p className="text-xl font-semibold tabular-nums">{obrigacoesDashboard.atrasadas.length}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-2.5">
                <AlertCircle size={18} className="text-destructive" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {podeFinanceiro && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-surface p-4 sm:p-5 lg:col-span-2 max-w-full overflow-hidden min-w-0"
        >
          <h3 className="text-sm font-semibold mb-4">Receita × Despesa Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartDataFinal} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(215, 16%, 47%)"
                tickFormatter={(v) => (visiveis ? `${(v / 1000).toFixed(0)}k` : '••')}
              />
              <Tooltip
                formatter={(v: number) => mascarar(formatCurrency(v))}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }}
              />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--sidebar-primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-surface p-4 sm:p-5 max-w-full overflow-hidden min-w-0"
        >
          <h3 className="text-sm font-semibold mb-4">Adimplência de Clientes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={adimplenciaData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {adimplenciaData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {adimplenciaData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      )}
    </div>
  );
}
