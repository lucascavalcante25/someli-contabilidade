import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Calculator, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import FormRegimeRegularCampos from '@/components/simulador/FormRegimeRegularCampos';
import FormSimplesCampos from '@/components/simulador/FormSimplesCampos';
import ResultadoSimulacao from '@/components/simulador/ResultadoSimulacao';
import CenariosCliente from '@/components/simulador/CenariosCliente';
import AvisoCalculadoraIndisponivel from '@/components/simulador/AvisoCalculadoraIndisponivel';
import {
  CHAVE_VERSOES_RTC,
  REGIME_LABEL,
  buscarVersoes,
  calcularSimulacao,
  itemRegimeRegularVazio,
  itemSimplesVazio,
  montarOperacaoRegimeRegular,
  montarOperacaoSimples,
  novoIdSimulacao,
  versaoDosDetalhes,
  type CenarioRtc,
  type FormRegimeRegular,
  type FormSimples,
  type RegimeRtc,
} from '@/lib/simuladorRtc';

interface Exibicao {
  titulo: string;
  regime: RegimeRtc;
  versaoCalculadora: string | null;
  versaoBase: string | null;
  avisoDadosSimulados: string | null;
  resultado: unknown;
}

const FORM_RR_INICIAL: FormRegimeRegular = {
  data: '2027-01-15',
  municipio: '2304400',
  uf: 'CE',
  tpDoc: '',
  aliquotas: { cbs: '8.8', ibsEstadual: '0.05', ibsMunicipal: '0.05' },
  itens: [itemRegimeRegularVazio()],
};

const FORM_SN_INICIAL: FormSimples = {
  data: '2027-01-15',
  documento: '55',
  fatorR: false,
  impedimentoSublimite: false,
  aliquotaCbs: '',
  aliquotaIbs: '',
  itens: [itemSimplesVazio()],
};

export default function SimuladorRtc() {
  const [regime, setRegime] = useState<RegimeRtc>('REGIME_REGULAR');
  const [formRR, setFormRR] = useState(FORM_RR_INICIAL);
  const [formSN, setFormSN] = useState(FORM_SN_INICIAL);
  const [exibicao, setExibicao] = useState<Exibicao | null>(null);

  const versoes = useQuery({ queryKey: CHAVE_VERSOES_RTC, queryFn: buscarVersoes, staleTime: 60_000, retry: false });
  const versaoAtual = versoes.data?.find((v) => v.regime === regime);

  const operacaoAtual = () =>
    regime === 'REGIME_REGULAR' ? montarOperacaoRegimeRegular(formRR, novoIdSimulacao()) : montarOperacaoSimples(formSN, novoIdSimulacao());

  const calcular = useMutation({
    mutationFn: () => calcularSimulacao(regime, operacaoAtual()),
    onSuccess: (r) => setExibicao({
      titulo: `Simulação CBS/IBS · ${REGIME_LABEL[r.regime]}`,
      regime: r.regime,
      versaoCalculadora: r.versaoCalculadora,
      versaoBase: r.versaoBase,
      avisoDadosSimulados: r.avisoDadosSimulados,
      resultado: r.resultado,
    }),
  });

  const abrirCenario = (c: CenarioRtc) => setExibicao({
    titulo: c.nome,
    regime: c.regime,
    versaoCalculadora: c.versaoCalculadora,
    versaoBase: c.versaoBase,
    avisoDadosSimulados: c.avisoDadosSimulados,
    resultado: c.resultado,
  });

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Simulador CBS/IBS</h1>
          <p className="text-sm text-muted-foreground">
            Uso interno. Calcula com as calculadoras oficiais da Receita Federal, sem emitir nota.
          </p>
        </div>
        <div className="text-xs text-muted-foreground" aria-live="polite">
          {versoes.isLoading ? (
            <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Conferindo calculadoras…</span>
          ) : versoes.isError ? (
            <span className="inline-flex items-center gap-1 text-destructive"><WifiOff size={12} /> {(versoes.error as Error).message}</span>
          ) : versaoAtual?.disponivel ? (
            <span>Calculadora {REGIME_LABEL[regime]}: <strong className="text-foreground">versão {versaoDosDetalhes(versaoAtual.detalhes) ?? '—'}</strong></span>
          ) : (
            <span className="inline-flex items-center gap-1 text-destructive">
              <WifiOff size={12} /> Calculadora indisponível
              <button type="button" onClick={() => versoes.refetch()} className="ml-1 inline-flex items-center gap-0.5 underline">
                <RefreshCw size={12} /> tentar de novo
              </button>
            </span>
          )}
        </div>
      </div>

      {versaoAtual && !versaoAtual.disponivel && (
        <AvisoCalculadoraIndisponivel regime={regime} mensagem={versaoAtual.mensagem} onTentarDeNovo={() => versoes.refetch()} />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 min-w-0">
          <div className="card-surface p-4 sm:p-5 min-w-0 space-y-4">
            <div className="inline-flex w-full rounded-md border border-input p-0.5 sm:w-auto" role="tablist" aria-label="Regime">
              {(['REGIME_REGULAR', 'SIMPLES_NACIONAL'] as RegimeRtc[]).map((r) => (
                <button key={r} type="button" role="tab" aria-selected={regime === r} onClick={() => setRegime(r)}
                  className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors sm:flex-none ${regime === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  {r === 'REGIME_REGULAR' ? 'Regime regular' : 'Simples Nacional'}
                </button>
              ))}
            </div>

            {regime === 'REGIME_REGULAR'
              ? <FormRegimeRegularCampos form={formRR} onChange={setFormRR} />
              : <FormSimplesCampos form={formSN} onChange={setFormSN} />}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button type="button" onClick={() => calcular.mutate()} disabled={calcular.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto">
                {calcular.isPending ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                Calcular
              </button>
              {calcular.isError && (
                <p className="text-sm text-destructive break-words" role="alert">{(calcular.error as Error).message}</p>
              )}
            </div>
          </div>

          {exibicao ? (
            <ResultadoSimulacao {...exibicao} />
          ) : (
            <div className="card-surface p-4 sm:p-5 text-sm text-muted-foreground">
              Preencha a operação e clique em Calcular. O resultado mostra CBS, IBS, IS e a memória de cálculo de cada item.
            </div>
          )}
        </div>

        <CenariosCliente regime={regime} operacaoAtual={operacaoAtual} onAbrir={abrirCenario} />
      </div>
    </div>
  );
}
