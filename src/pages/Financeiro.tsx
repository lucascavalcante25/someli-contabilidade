import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StatCard from '@/components/shared/StatCard';
import AppSelect from '@/components/shared/AppSelect';
import { DollarSign, Clock, TrendingUp, CheckCircle, Receipt, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { Checkbox } from '@/components/ui/checkbox';

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesesCompletos = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
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
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [chartData, setChartData] = useState<GraficoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const mesAtual = selectedMonth + 1;
  const rotuloMesAno = `${mesesCompletos[selectedMonth]} / ${selectedYear}`;
  const isMesCorrente =
    selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
  const detalheRef = useRef<HTMLDivElement>(null);

  const selecionarMes = useCallback((indice: number) => {
    setSelectedMonth(indice);
    // leve delay para o resumo do mês novo começar a carregar
    requestAnimationFrame(() => {
      detalheRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const carregarResumo = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await apiFetch(
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
      if (!opts?.silent) setLoading(false);
    }
  }, [apiBaseUrl, mesAtual, selectedYear]);

  const carregarGrafico = useCallback(async () => {
    try {
      const res = await apiFetch(
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

  const [togglingPagamento, setTogglingPagamento] = useState<Set<number>>(new Set());
  const [togglingDespesa, setTogglingDespesa] = useState<Set<number>>(new Set());

  const togglePagamento = async (clienteId: number) => {
    if (!resumo || togglingPagamento.has(clienteId)) return;
    const cliente = resumo.clientes.find((c) => c.id === clienteId);
    if (!cliente) return;

    const acao = cliente.pago ? 'desmarcar' : 'marcar';
    const novoPago = !cliente.pago;
    const delta = cliente.honorario;
    const snapshot = resumo;

    setResumo({
      ...resumo,
      clientes: resumo.clientes.map((c) => (c.id === clienteId ? { ...c, pago: novoPago } : c)),
      receitaRecebida: resumo.receitaRecebida + (novoPago ? delta : -delta),
      receitaPendente: resumo.receitaPendente + (novoPago ? -delta : delta),
      saldo: resumo.saldo + (novoPago ? delta : -delta),
    });
    setTogglingPagamento((prev) => new Set(prev).add(clienteId));

    try {
      const url = `${apiBaseUrl}/financeiro/pagamentos/${clienteId}/${acao}?mes=${mesAtual}&ano=${selectedYear}`;
      const res = await apiFetch(url, { method: 'POST', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao atualizar pagamento');
      toast.success(
        acao === 'marcar'
          ? `Pagamento registrado: ${formatCurrency(cliente.honorario)}`
          : 'Pagamento desmarcado'
      );
      void carregarGrafico();
    } catch (e) {
      setResumo(snapshot);
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar pagamento');
    } finally {
      setTogglingPagamento((prev) => {
        const next = new Set(prev);
        next.delete(clienteId);
        return next;
      });
    }
  };

  const toggleDespesa = async (despesaId: number) => {
    if (!resumo || togglingDespesa.has(despesaId)) return;
    const despesa = resumo.despesas.find((d) => d.id === despesaId);
    if (!despesa) return;

    const acao = despesa.paga ? 'desmarcar' : 'marcar';
    const novaPaga = !despesa.paga;
    const delta = despesa.valorMensal;
    const snapshot = resumo;

    setResumo({
      ...resumo,
      despesas: resumo.despesas.map((d) => (d.id === despesaId ? { ...d, paga: novaPaga } : d)),
      despesasPagas: resumo.despesasPagas + (novaPaga ? delta : -delta),
      despesasPendentes: resumo.despesasPendentes + (novaPaga ? -delta : delta),
      saldo: resumo.saldo + (novaPaga ? -delta : delta),
    });
    setTogglingDespesa((prev) => new Set(prev).add(despesaId));

    try {
      const url = `${apiBaseUrl}/financeiro/despesas/${despesaId}/${acao}?mes=${mesAtual}&ano=${selectedYear}`;
      const res = await apiFetch(url, { method: 'POST', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao atualizar despesa');
      toast.success('Despesa atualizada');
      void carregarGrafico();
    } catch (e) {
      setResumo(snapshot);
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar despesa');
    } finally {
      setTogglingDespesa((prev) => {
        const next = new Set(prev);
        next.delete(despesaId);
        return next;
      });
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
    <div className="page-shell">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle financeiro mensal</p>
        </div>
        <p className="text-sm font-medium text-foreground">
          Exibindo: <span className="text-primary">{rotuloMesAno}</span>
          {isMesCorrente ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(mês atual)</span>
          ) : null}
        </p>
      </div>

      {/* Stats do mês selecionado */}
      <div className="space-y-2 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resumo de {rotuloMesAno}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 min-w-0">
          <StatCard label="Receita Total" value={formatCurrency(r.receitaTotal)} icon={DollarSign} accent="primary" subtitle={rotuloMesAno} />
          <StatCard label="Receita Recebida" value={formatCurrency(r.receitaRecebida)} icon={CheckCircle} accent="success" subtitle={rotuloMesAno} />
          <StatCard label="Receita Pendente" value={formatCurrency(r.receitaPendente)} icon={Clock} accent="warning" subtitle={rotuloMesAno} />
          <StatCard label="Despesas" value={formatCurrency(r.despesaTotal)} icon={Receipt} accent="destructive" subtitle={rotuloMesAno} />
          <StatCard label="Despesas Pagas" value={formatCurrency(r.despesasPagas)} icon={Banknote} accent="success" subtitle={rotuloMesAno} />
          <StatCard label="Saldo" value={formatCurrency(r.saldo)} icon={TrendingUp} accent={r.saldo >= 0 ? 'success' : 'destructive'} subtitle="Recebida − despesas pagas" />
        </div>
      </div>

      {/* Chart */}
      <div className="card-surface p-4 sm:p-5 max-w-full overflow-hidden min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-sm font-semibold">Receita × Despesa — {selectedYear}</h3>
          <p className="text-xs text-muted-foreground">Clique em um mês no gráfico para ver clientes e despesas daquele mês</p>
        </div>
        <div className="w-full min-w-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartDataParaGrafico}
            barGap={2}
            style={{ cursor: 'pointer' }}
            onClick={(state) => {
              const label = state?.activeLabel;
              if (!label) return;
              // No mobile o gráfico mostra só 3 meses; mapear pelo nome
              const idx = meses.indexOf(String(label));
              if (idx >= 0) selecionarMes(idx);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }} />
            <Bar dataKey="receita" name="Receita" radius={[4, 4, 0, 0]} cursor="pointer">
              {chartDataParaGrafico.map((entry, index) => {
                const mesIdx = meses.indexOf(entry.mes);
                const ativo = mesIdx === selectedMonth;
                return (
                  <Cell
                    key={`rec-${entry.mes}-${index}`}
                    fill={ativo ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.45)'}
                    stroke={ativo ? 'hsl(var(--primary))' : undefined}
                    strokeWidth={ativo ? 2 : 0}
                  />
                );
              })}
            </Bar>
            <Bar dataKey="despesa" name="Despesa" radius={[4, 4, 0, 0]} cursor="pointer">
              {chartDataParaGrafico.map((entry, index) => {
                const mesIdx = meses.indexOf(entry.mes);
                const ativo = mesIdx === selectedMonth;
                return (
                  <Cell
                    key={`desp-${entry.mes}-${index}`}
                    fill={ativo ? 'hsl(var(--sidebar-primary))' : 'hsl(var(--sidebar-primary) / 0.4)'}
                    stroke={ativo ? 'hsl(var(--sidebar-primary))' : undefined}
                    strokeWidth={ativo ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Month Tabs */}
      <div ref={detalheRef} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center min-w-0 scroll-mt-24">
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 max-w-full">
          {meses.map((m, i) => (
            <button
              key={m}
              onClick={() => selecionarMes(i)}
              className={`shrink-0 px-3 py-2 rounded-md text-xs font-medium transition-colors ${selectedMonth === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <AppSelect
          value={String(selectedYear)}
          onChange={(v) => setSelectedYear(Number(v))}
          className="w-full sm:w-[110px] shrink-0"
          options={[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => ({
            value: String(y),
            label: String(y),
          }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        {/* Clientes Table */}
        <div className="card-surface overflow-hidden max-w-full min-w-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold truncate">Clientes — {rotuloMesAno}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marque &quot;Pago?&quot; para registrar o honorário deste mês. Se o cliente quitar atrasados, marque também nos meses anteriores no gráfico.
            </p>
          </div>
          <div className="overflow-x-auto max-w-full">
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
                    Nenhum cliente cobrado neste mês
                  </td>
                </tr>
              ) : (
                r.clientes.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium max-w-[140px] sm:max-w-none truncate" title={c.nomeFantasia || '—'}>{c.nomeFantasia || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(c.honorario)}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{c.diaVencimento}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={c.pago}
                          disabled={togglingPagamento.has(c.id)}
                          onCheckedChange={() => void togglePagamento(c.id)}
                          className="h-5 w-5 rounded-md"
                          aria-label={c.pago ? 'Desmarcar como pago' : 'Marcar como pago'}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Despesas Table */}
        <div className="card-surface overflow-hidden max-w-full min-w-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold truncate">Despesas — {rotuloMesAno}</h3>
          </div>
          <div className="overflow-x-auto max-w-full">
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
                    Nenhuma despesa neste mês
                  </td>
                </tr>
              ) : (
                r.despesas.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium max-w-[140px] sm:max-w-none">
                      <span className="block truncate" title={d.descricao}>{d.descricao}</span>
                      {d.parcelas != null && d.parcelaDoMes != null && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({d.parcelaDoMes}/{d.parcelas})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(d.valorMensal)}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{d.diaPagamento}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={d.paga}
                          disabled={togglingDespesa.has(d.id)}
                          onCheckedChange={() => void toggleDespesa(d.id)}
                          className="h-5 w-5 rounded-md"
                          aria-label={d.paga ? 'Desmarcar como paga' : 'Marcar como paga'}
                        />
                      </div>
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
