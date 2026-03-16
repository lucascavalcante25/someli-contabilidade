import { Users, DollarSign, Clock, Receipt, TrendingUp } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { mockClientes, mockDespesas, receitaMensal, formatCurrency, getGreeting } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

const CHART_COLORS = ['hsl(222, 47%, 11%)', 'hsl(222, 47%, 30%)', 'hsl(222, 47%, 50%)', 'hsl(222, 47%, 70%)'];

export default function Dashboard() {
  const { user } = useAuth();
  const totalClientes = mockClientes.length;
  const receitaTotal = mockClientes.reduce((s, c) => s + c.honorario, 0);
  const receitaPendente = mockClientes.filter(c => c.status !== 'em_dia').reduce((s, c) => s + c.honorario, 0);
  const despesaTotal = mockDespesas.filter(d => d.ativo).reduce((s, d) => s + d.valorMensal, 0);
  const saldo = receitaTotal - despesaTotal;

  const adimplenciaData = [
    { name: 'Em dia', value: mockClientes.filter(c => c.status === 'em_dia').length },
    { name: 'Pendente', value: mockClientes.filter(c => c.status === 'pendente').length },
    { name: 'Atrasado', value: mockClientes.filter(c => c.status === 'atrasado').length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{getGreeting()}, {user?.nome?.split(' ')[0]}</h1>
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
        {/* Revenue x Expenses Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-surface p-5 lg:col-span-2"
        >
          <h3 className="text-sm font-semibold mb-4">Receita × Despesa Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={receitaMensal} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }}
              />
              <Bar dataKey="receita" name="Receita" fill="hsl(222, 47%, 11%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="hsl(222, 47%, 70%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Adimplência Pie */}
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
