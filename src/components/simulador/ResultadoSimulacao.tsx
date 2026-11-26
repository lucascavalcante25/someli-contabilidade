import { useState } from 'react';
import { ChevronDown, ChevronRight, FileDown, FileSpreadsheet, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  AVISO_LICENCA,
  avisoSimulacao,
  relatorioHtml,
  resumirResultado,
  resumoParaCsv,
  type RegimeRtc,
} from '@/lib/simuladorRtc';

interface Props {
  titulo: string;
  regime: RegimeRtc;
  versaoCalculadora: string | null;
  versaoBase: string | null;
  avisoDadosSimulados: string | null;
  resultado: unknown;
}

const reais = (v: number | null) =>
  v === null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number | null) => (v === null ? '' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`);

function nomeArquivo(titulo: string, extensao: string) {
  const base = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${base || 'simulacao-cbs-ibs'}.${extensao}`;
}

export default function ResultadoSimulacao({ titulo, regime, versaoCalculadora, versaoBase, avisoDadosSimulados, resultado }: Props) {
  const resumo = resumirResultado(regime, resultado);
  const [aberto, setAberto] = useState<number | null>(null);

  const baixarPlanilha = () => {
    const csv = resumoParaCsv({ titulo, regime, versao: versaoCalculadora, resumo });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo(titulo, 'csv');
    a.click();
    URL.revokeObjectURL(url);
  };

  const imprimir = () => {
    const janela = window.open('', '_blank');
    if (!janela) {
      toast.error('O navegador bloqueou a janela. Libere pop-ups para este site e tente de novo.');
      return;
    }
    janela.document.write(relatorioHtml({ titulo, regime, versao: versaoCalculadora, versaoBase, resumo }));
    janela.document.close();
    janela.focus();
    janela.print();
  };

  return (
    <div className="card-surface p-4 sm:p-5 min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Resultado</h3>
          <p className="text-xs text-muted-foreground">
            Calculadora {versaoCalculadora ?? 'sem versão'}{versaoBase ? ` · base ${versaoBase}` : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={baixarPlanilha}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
            <FileSpreadsheet size={16} /> Planilha
          </button>
          <button type="button" onClick={imprimir}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
            <FileDown size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="flex gap-2 rounded-md border-l-4 border-accent bg-muted/40 p-3 text-xs">
        <Info size={16} className="shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium">{avisoSimulacao(versaoCalculadora)}</p>
          {avisoDadosSimulados && (
            <p className="text-muted-foreground">Cálculo com alíquotas informadas por você (aviso {avisoDadosSimulados} da calculadora).</p>
          )}
        </div>
      </div>

      {resumo.total && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['Base', resumo.total.base],
            ['CBS', resumo.total.cbs],
            ['IBS', resumo.total.ibs],
            ['IS', resumo.total.is],
            ['Total de tributos', resumo.total.totalTributos],
          ].map(([rotulo, valor]) => (
            <div key={rotulo as string} className="rounded-md border border-border p-2.5 min-w-0">
              <p className="text-[11px] text-muted-foreground">{rotulo}</p>
              <p className="text-sm font-semibold tabular-nums truncate">{reais(valor as number | null)}</p>
            </div>
          ))}
        </div>
      )}

      {resumo.itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">A calculadora não devolveu itens.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {resumo.itens.map((item) => (
            <li key={item.numero} className="p-3 text-sm">
              <button type="button" className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setAberto(aberto === item.numero ? null : item.numero)} aria-expanded={aberto === item.numero}>
                <span className="flex min-w-0 items-start gap-1.5">
                  {aberto === item.numero ? <ChevronDown size={16} className="mt-0.5 shrink-0" /> : <ChevronRight size={16} className="mt-0.5 shrink-0" />}
                  <span className="min-w-0">
                    <span className="font-medium">Item {item.numero}</span>{' '}
                    <span className={`text-xs ${item.calculado ? 'text-success' : 'text-destructive'}`}>{item.estado}</span>
                    {item.calculado && (
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        Base {reais(item.base)} · CBS {reais(item.cbs)} {pct(item.aliquotaCbs)} · IBS {reais(item.ibs)} {pct(item.aliquotaIbs)}
                        {item.is !== null && item.is > 0 ? ` · IS ${reais(item.is)}` : ''}
                        {item.reducao ? ` · redução ${pct(item.reducao)}` : ''}
                      </span>
                    )}
                  </span>
                </span>
              </button>
              {item.erros.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 pl-6 text-xs text-destructive">
                  {item.erros.map((e) => <li key={e} className="break-words">{e}</li>)}
                </ul>
              )}
              {aberto === item.numero && (
                <div className="mt-2 pl-6 space-y-2">
                  {item.ibsUf !== null && (
                    <p className="text-xs text-muted-foreground tabular-nums">IBS estadual {reais(item.ibsUf)} · IBS municipal {reais(item.ibsMun)}</p>
                  )}
                  <pre className="whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-[11px] leading-relaxed">
                    {item.memoria || 'A calculadora não trouxe memória de cálculo para este item.'}
                  </pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">{AVISO_LICENCA}</p>
    </div>
  );
}
