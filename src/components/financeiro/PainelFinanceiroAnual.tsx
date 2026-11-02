import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { useValoresVisibilidade } from '@/contexts/ValoresVisibilidadeContext';

interface PainelFinanceiro {
  recebidoNoAno: number;
  despesasNoAno: number;
  resultadoNoAno: number;
  margemPercentual: number;
  totalEmAberto: number;
  inadimplentes: { clienteId: number; nome: string; valor: number; meses: number }[];
  reajustes: { clienteId: number; nome: string; dataReajuste: string; anosDeContrato: number; honorario: number }[];
}

function moeda(valor: number) {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Indicador({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-md bg-muted/40 p-3 min-w-0">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`truncate text-base font-semibold tabular-nums ${destaque ? 'text-destructive' : ''}`}>{valor}</p>
    </div>
  );
}

export default function PainelFinanceiroAnual({ ano }: { ano: number }) {
  const { mascarar } = useValoresVisibilidade();
  const [painel, setPainel] = useState<PainelFinanceiro | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    apiFetch(`${API_BASE_URL}/financeiro/painel?ano=${ano}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as PainelFinanceiro;
        if (ativo) setPainel(data);
      })
      .catch(() => {
        if (ativo) setErro(true);
      });
    return () => {
      ativo = false;
    };
  }, [ano]);

  if (erro) {
    return <div className="card-surface p-4 text-sm text-muted-foreground">Não foi possível carregar o painel do escritório.</div>;
  }
  if (!painel) {
    return <div className="card-surface p-4 text-sm text-muted-foreground">Carregando painel do escritório…</div>;
  }

  return (
    <section className="card-surface space-y-4 p-4 sm:p-5" aria-label="Painel do escritório">
      <div>
        <h2 className="text-sm font-semibold">Painel do escritório em {ano}</h2>
        <p className="text-xs text-muted-foreground">Resultado acumulado até o mês atual, com base nos pagamentos marcados.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Indicador titulo="Recebido" valor={mascarar(moeda(painel.recebidoNoAno))} />
        <Indicador titulo="Despesas pagas" valor={mascarar(moeda(painel.despesasNoAno))} />
        <Indicador titulo="Resultado" valor={mascarar(moeda(painel.resultadoNoAno))} destaque={painel.resultadoNoAno < 0} />
        <Indicador titulo="Margem" valor={mascarar(`${painel.margemPercentual.toLocaleString('pt-BR')}%`)} />
        <Indicador titulo="Em aberto" valor={mascarar(moeda(painel.totalEmAberto))} destaque={painel.totalEmAberto > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium">Maiores valores em aberto</h3>
          {painel.inadimplentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum valor em aberto.</p>
          ) : (
            <ul className="divide-y divide-border">
              {painel.inadimplentes.slice(0, 5).map((item) => (
                <li key={item.clienteId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link to={`/clientes/${item.clienteId}`} className="min-w-0 truncate hover:underline">{item.nome}</Link>
                  <span className="shrink-0 tabular-nums">{mascarar(moeda(item.valor))} · {item.meses} mês(es)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium">Reajustes nos próximos 60 dias</h3>
          {painel.reajustes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contrato faz aniversário nesse período.</p>
          ) : (
            <ul className="divide-y divide-border">
              {painel.reajustes.slice(0, 5).map((item) => (
                <li key={item.clienteId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link to={`/clientes/${item.clienteId}`} className="min-w-0 truncate hover:underline">{item.nome}</Link>
                  <span className="shrink-0 tabular-nums">
                    {item.dataReajuste.split('-').reverse().join('/')} · {item.anosDeContrato} ano(s)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
