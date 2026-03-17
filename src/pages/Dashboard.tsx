import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, DollarSign, Clock, Receipt, TrendingUp } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency, getGreeting } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { API_BASE_URL } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--sidebar-primary))', 'hsl(var(--accent))'];

function getAuthHeaders() {
  const token = localStorage.getItem('someli_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || ''}`,
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

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const [clientes, setClientes] = useState<ClienteResumo[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [chartData, setChartData] = useState<GraficoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [resClientes, resResumo, resGrafico] = await Promise.all([
        fetch(`${apiBaseUrl}/clientes`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/financeiro/resumo`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/financeiro/grafico`, { headers: getAuthHeaders() }),
      ]);

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

      if (resResumo.ok) {
        const data = await resResumo.json();
        setResumo({
          receitaTotal: Number(data.receitaTotal ?? 0),
          receitaRecebida: Number(data.receitaRecebida ?? 0),
          receitaPendente: Number(data.receitaPendente ?? 0),
          despesaTotal: Number(data.despesaTotal ?? 0),
          despesasPagas: Number(data.despesasPagas ?? 0),
          saldo: Number(data.saldo ?? 0),
        });
      }

      if (resGrafico.ok) {
        const data = await resGrafico.json();
        setChartData(
          (Array.isArray(data) ? data : []).map((d: any) => ({
            mes: d.mes ?? '',
            receita: Number(d.receita ?? 0),
            despesa: Number(d.despesa ?? 0),
          }))
        );
      }
    } catch {
      setClientes([]);
      setResumo(null);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{getGreeting()}, {user?.nome?.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Aqui está o resumo do seu escritório</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Clientes Ativos" value={String(totalClientes)} icon={Users} accent="primary" />
        <StatCard label="Receita Mensal" value={formatCurrency(receitaTotal)} icon={DollarSign} accent="success" />
        <StatCard label="Receita Pendente" value={formatCurrency(receitaPendente)} icon={Clock} accent="warning" />
        <StatCard label="Despesas do Mês" value={formatCurrency(despesaTotal)} icon={Receipt} accent="destructive" />
        <StatCard label="Saldo do Mês" value={formatCurrency(saldo)} icon={TrendingUp} accent={saldo >= 0 ? 'success' : 'destructive'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-surface p-5 lg:col-span-2"
        >
          <h3 className="text-sm font-semibold mb-4">Receita × Despesa Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartDataFinal} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
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
          className="card-surface p-5"
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
    </div>
  );
}
