import { useState } from 'react';
import { mockClientes, mockDespesas, mockPagamentos, mockDespesasMensais, formatCurrency, meses, type PagamentoMensal, type DespesaMensal } from '@/data/mockData';
import StatCard from '@/components/shared/StatCard';
import { Users, DollarSign, Clock, Receipt, TrendingUp, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Financeiro() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [pagamentos, setPagamentos] = useState<PagamentoMensal[]>(mockPagamentos);
  const [despesasMensais, setDespesasMensais] = useState<DespesaMensal[]>(mockDespesasMensais);

  const mesAtual = selectedMonth + 1;

  const clientesPagos = pagamentos.filter(p => p.mes === mesAtual && p.pago);
  const receitaTotal = mockClientes.reduce((s, c) => s + c.honorario, 0);
  const receitaRecebida = mockClientes.filter(c => clientesPagos.some(p => p.clienteId === c.id)).reduce((s, c) => s + c.honorario, 0);
  const receitaPendente = receitaTotal - receitaRecebida;

  const despesasAtivas = mockDespesas.filter(d => d.ativo);
  const despesaTotal = despesasAtivas.reduce((s, d) => s + d.valorMensal, 0);
  const despesasPagas = despesasAtivas.filter(d => despesasMensais.some(dm => dm.despesaId === d.id && dm.mes === mesAtual && dm.paga)).reduce((s, d) => s + d.valorMensal, 0);
  const despesasPendentes = despesaTotal - despesasPagas;
  const saldo = receitaRecebida - despesasPagas;

  const togglePagamento = (clienteId: number) => {
    setPagamentos(prev => prev.map(p =>
      p.clienteId === clienteId && p.mes === mesAtual ? { ...p, pago: !p.pago } : p
    ));
    const cliente = mockClientes.find(c => c.id === clienteId);
    toast.success(`Pagamento ${pagamentos.find(p => p.clienteId === clienteId && p.mes === mesAtual)?.pago ? 'desmarcado' : 'registrado'}: ${formatCurrency(cliente?.honorario || 0)}`);
  };

  const toggleDespesa = (despesaId: number) => {
    setDespesasMensais(prev => prev.map(d =>
      d.despesaId === despesaId && d.mes === mesAtual ? { ...d, paga: !d.paga } : d
    ));
    toast.success('Despesa atualizada');
  };

  const chartData = meses.map((m, i) => {
    const rec = mockClientes.filter(c => pagamentos.some(p => p.clienteId === c.id && p.mes === i + 1 && p.pago)).reduce((s, c) => s + c.honorario, 0);
    const desp = despesasAtivas.filter(d => despesasMensais.some(dm => dm.despesaId === d.id && dm.mes === i + 1 && dm.paga)).reduce((s, d) => s + d.valorMensal, 0);
    return { mes: m, receita: rec, despesa: desp };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Controle financeiro mensal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Receita Total" value={formatCurrency(receitaTotal)} icon={DollarSign} accent="primary" />
        <StatCard label="Receita Recebida" value={formatCurrency(receitaRecebida)} icon={CheckCircle} accent="success" />
        <StatCard label="Receita Pendente" value={formatCurrency(receitaPendente)} icon={Clock} accent="warning" />
        <StatCard label="Saldo" value={formatCurrency(saldo)} icon={TrendingUp} accent={saldo >= 0 ? 'success' : 'destructive'} />
      </div>

      {/* Chart */}
      <div className="card-surface p-5">
        <h3 className="text-sm font-semibold mb-4">Receita × Despesa</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }} />
            <Bar dataKey="receita" name="Receita" fill="hsl(222, 47%, 11%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesa" name="Despesa" fill="hsl(222, 47%, 70%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month Tabs */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clientes Table */}
        <div className="card-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Clientes — {meses[selectedMonth]}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-4 py-2.5 text-left">Cliente</th>
                <th className="label-text px-4 py-2.5 text-right">Honorário</th>
                <th className="label-text px-4 py-2.5 text-center">Venc.</th>
                <th className="label-text px-4 py-2.5 text-center">Pago?</th>
              </tr>
            </thead>
            <tbody>
              {mockClientes.map(c => {
                const pago = pagamentos.find(p => p.clienteId === c.id && p.mes === mesAtual)?.pago || false;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{c.nomeFantasia}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(c.honorario)}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{c.diaVencimento}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={pago}
                        onChange={() => togglePagamento(c.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Despesas Table */}
        <div className="card-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Despesas — {meses[selectedMonth]}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-4 py-2.5 text-left">Descrição</th>
                <th className="label-text px-4 py-2.5 text-right">Valor</th>
                <th className="label-text px-4 py-2.5 text-center">Dia</th>
                <th className="label-text px-4 py-2.5 text-center">Paga?</th>
              </tr>
            </thead>
            <tbody>
              {despesasAtivas.map(d => {
                const paga = despesasMensais.find(dm => dm.despesaId === d.id && dm.mes === mesAtual)?.paga || false;
                return (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{d.descricao}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(d.valorMensal)}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{d.diaPagamento}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={paga}
                        onChange={() => toggleDespesa(d.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
