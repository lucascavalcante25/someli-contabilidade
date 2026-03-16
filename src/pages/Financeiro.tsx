import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '@/components/shared/StatCard';
import { DollarSign, Clock, TrendingUp, CheckCircle, Receipt, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useIsMobile } from '@/hooks/useMediaQuery';

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function getAuthHeaders() {
  const token = localStorage.getItem('someli_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || ''}`,
  };
}

interface ClientePagamento {
  id: number;
  nomeFantasia: string;
  honorario: number;
  diaVencimento: number;
  pago: boolean;
}

interface DespesaMensalItem {
  id: number;
  descricao: string;
  valorMensal: number;
  diaPagamento: number;
  paga: boolean;
  parcelaDoMes?: number;
  parcelas?: number;
}

interface ResumoFinanceiro {
  receitaTotal: number;
  receitaRecebida: number;
  receitaPendente: number;
  despesaTotal: number;
  despesasPagas: number;
  despesasPendentes: number;
  saldo: number;
  mes: number;
  ano: number;
  clientes: ClientePagamento[];
  despesas: DespesaMensalItem[];
}

interface GraficoItem {
  mes: string;
  receita: number;
  despesa: number;
}

export default function Financeiro() {
  const isMobile = useIsMobile();
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:8080', []);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [chartData, setChartData] = useState<GraficoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const mesAtual = selectedMonth + 1;

  const carregarResumo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/financeiro/resumo?mes=${mesAtual}&ano=${selectedYear}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error('Erro ao carregar resumo');
      const data = await res.json();
      setResumo({
        receitaTotal: Number(data.receitaTotal ?? 0),
        receitaRecebida: Number(data.receitaRecebida ?? 0),
        receitaPendente: Number(data.receitaPendente ?? 0),
        despesaTotal: Number(data.despesaTotal ?? 0),
        despesasPagas: Number(data.despesasPagas ?? 0),
        despesasPendentes: Number(data.despesasPendentes ?? 0),
        saldo: Number(data.saldo ?? 0),
        mes: data.mes ?? mesAtual,
        ano: data.ano ?? selectedYear,
        clientes: (data.clientes ?? []).map((c: any) => ({
          id: c.id,
          nomeFantasia: c.nomeFantasia ?? '',
          honorario: Number(c.honorario ?? 0),
          diaVencimento: c.diaVencimento ?? 10,
          pago: !!c.pago,
        })),
        despesas: (data.despesas ?? []).map((d: any) => ({
          id: d.id,
          descricao: d.descricao ?? '',
          valorMensal: Number(d.valorMensal ?? 0),
          diaPagamento: d.diaPagamento ?? 10,
          paga: !!d.paga,
          parcelaDoMes: d.parcelaDoMes,
          parcelas: d.parcelas,
        })),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar financeiro');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, mesAtual, selectedYear]);

  const carregarGrafico = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/financeiro/grafico?ano=${selectedYear}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      setChartData(
        (Array.isArray(data) ? data : []).map((d: any) => ({
          mes: d.mes ?? '',
          receita: Number(d.receita ?? 0),
          despesa: Number(d.despesa ?? 0),
        }))
      );
    } catch {
      setChartData([]);
    }
  }, [apiBaseUrl, selectedYear]);

  useEffect(() => {
    void carregarResumo();
  }, [carregarResumo]);

  useEffect(() => {
    void carregarGrafico();
  }, [carregarGrafico]);

  const chartDataFull = chartData.length ? chartData : meses.map((m) => ({ mes: m, receita: 0, despesa: 0 }));
  const chartDataParaGrafico = useMemo(() => {
    if (!isMobile) return chartDataFull;
    const prev = (selectedMonth - 1 + 12) % 12;
    const next = (selectedMonth + 1) % 12;
    return [chartDataFull[prev], chartDataFull[selectedMonth], chartDataFull[next]];
  }, [isMobile, chartDataFull, selectedMonth]);

  const togglePagamento = async (clienteId: number) => {
    const cliente = resumo?.clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    const acao = cliente.pago ? 'desmarcar' : 'marcar';
    try {
      const url = `${apiBaseUrl}/financeiro/pagamentos/${clienteId}/${acao}?mes=${mesAtual}&ano=${selectedYear}`;
      const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao atualizar pagamento');
      toast.success(
        acao === 'marcar'
          ? `Pagamento registrado: ${formatCurrency(cliente.honorario)}`
          : 'Pagamento desmarcado'
      );
      await carregarResumo();
      await carregarGrafico();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar pagamento');
    }
  };

  const toggleDespesa = async (despesaId: number) => {
    const despesa = resumo?.despesas.find((d) => d.id === despesaId);
    if (!despesa) return;
    const acao = despesa.paga ? 'desmarcar' : 'marcar';
    try {
      const url = `${apiBaseUrl}/financeiro/despesas/${despesaId}/${acao}?mes=${mesAtual}&ano=${selectedYear}`;
      const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao atualizar despesa');
      toast.success('Despesa atualizada');
      await carregarResumo();
      await carregarGrafico();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar despesa');
    }
  };

  if (loading && !resumo) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const r = resumo ?? {
    receitaTotal: 0,
    receitaRecebida: 0,
    receitaPendente: 0,
    despesaTotal: 0,
    despesasPagas: 0,
    despesasPendentes: 0,
    saldo: 0,
    clientes: [],
    despesas: [],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Controle financeiro mensal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Receita Total" value={formatCurrency(r.receitaTotal)} icon={DollarSign} accent="primary" />
        <StatCard label="Receita Recebida" value={formatCurrency(r.receitaRecebida)} icon={CheckCircle} accent="success" />
        <StatCard label="Receita Pendente" value={formatCurrency(r.receitaPendente)} icon={Clock} accent="warning" />
        <StatCard label="Despesas" value={formatCurrency(r.despesaTotal)} icon={Receipt} accent="destructive" />
        <StatCard label="Despesas Pagas" value={formatCurrency(r.despesasPagas)} icon={Banknote} accent="success" />
        <StatCard label="Saldo" value={formatCurrency(r.saldo)} icon={TrendingUp} accent={r.saldo >= 0 ? 'success' : 'destructive'} />
      </div>

      {/* Chart */}
      <div className="card-surface p-5">
        <h3 className="text-sm font-semibold mb-4">Receita × Despesa — {selectedYear}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartDataParaGrafico} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }} />
            <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--sidebar-primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {meses.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(i)}
              className={`shrink-0 px-3 py-2 rounded-md text-xs font-medium transition-colors ${selectedMonth === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clientes Table */}
        <div className="card-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Clientes — {meses[selectedMonth]} {selectedYear}</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[280px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-4 py-2.5 text-left">Cliente</th>
                <th className="label-text px-4 py-2.5 text-right">Honorário</th>
                <th className="label-text px-4 py-2.5 text-center">Venc.</th>
                <th className="label-text px-4 py-2.5 text-center">Pago?</th>
              </tr>
            </thead>
            <tbody>
              {r.clientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum cliente cadastrado
                  </td>
                </tr>
              ) : (
                r.clientes.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{c.nomeFantasia || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(c.honorario)}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{c.diaVencimento}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={c.pago}
                        onChange={() => togglePagamento(c.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Despesas Table */}
        <div className="card-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Despesas — {meses[selectedMonth]} {selectedYear}</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[280px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-4 py-2.5 text-left">Descrição</th>
                <th className="label-text px-4 py-2.5 text-right">Valor</th>
                <th className="label-text px-4 py-2.5 text-center">Dia</th>
                <th className="label-text px-4 py-2.5 text-center">Paga?</th>
              </tr>
            </thead>
            <tbody>
              {r.despesas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma despesa cadastrada
                  </td>
                </tr>
              ) : (
                r.despesas.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">
                      {d.descricao}
                      {d.parcelas != null && d.parcelaDoMes != null && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({d.parcelaDoMes}/{d.parcelas})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(d.valorMensal)}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{d.diaPagamento}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={d.paga}
                        onChange={() => toggleDespesa(d.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
