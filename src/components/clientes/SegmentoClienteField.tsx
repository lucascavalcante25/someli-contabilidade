import type { Segmento } from '@/lib/painelMensal';
import { ORDEM_SEGMENTOS, ROTULO_SEGMENTO } from '@/lib/painelQuadro';
import { cn } from '@/lib/utils';

interface SegmentoClienteFieldProps {
  value: Segmento | '';
  onChange: (segmento: Segmento) => void;
  /** O valor veio do CNAE da consulta do CNPJ (só sugestão). */
  sugeridoPeloCnae?: boolean;
}

/** Segmento do cliente no cadastro: define em qual lista do Painel do mês o cartão fica. */
export default function SegmentoClienteField({ value, onChange, sugeridoPeloCnae }: SegmentoClienteFieldProps) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <span id="segmento-cliente-rotulo" className="label-text">Segmento</span>
      <div role="radiogroup" aria-labelledby="segmento-cliente-rotulo" className="flex w-full rounded-md bg-muted p-0.5">
        {ORDEM_SEGMENTOS.map((seg) => {
          const marcado = value === seg;
          return (
            <button
              key={seg}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => onChange(seg)}
              className={cn(
                'flex-1 whitespace-nowrap rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                marcado ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {ROTULO_SEGMENTO[seg]}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {sugeridoPeloCnae
          ? 'Sugerido pelo CNAE principal. Confira e troque se precisar.'
          : value
            ? 'Define a lista do cliente no Painel do mês.'
            : 'Sem segmento, o cartão fica em Serviços no Painel do mês.'}
      </p>
    </div>
  );
}
