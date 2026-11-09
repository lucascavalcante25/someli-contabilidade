import AppSelect from '@/components/shared/AppSelect';
import { MESES, PERIODICIDADES } from '@/lib/vencimentoPadrao';

export interface VencimentoPadraoForm {
  periodicidadePadrao: string;
  diaVencimentoPadrao: string;
  mesVencimentoPadrao: string;
}

interface Props {
  value: VencimentoPadraoForm;
  onChange: (v: VencimentoPadraoForm) => void;
}

/** Periodicidade e vencimento padrão do tipo. Nas anuais, o mês define a data (ex.: DEFIS 31/03). */
export default function VencimentoPadraoFields({ value, onChange }: Props) {
  const anual = value.periodicidadePadrao === 'ANUAL';
  const set = (parcial: Partial<VencimentoPadraoForm>) => onChange({ ...value, ...parcial });

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="min-w-0">
        <label className="label-text">Periodicidade</label>
        <AppSelect
          className="mt-1.5"
          value={value.periodicidadePadrao}
          onChange={(v) => set({ periodicidadePadrao: v, mesVencimentoPadrao: v === 'ANUAL' ? value.mesVencimentoPadrao : '' })}
          options={PERIODICIDADES}
        />
      </div>
      <div className="min-w-0">
        <label className="label-text" htmlFor="dia-vencimento-padrao">Dia do vencimento</label>
        <input
          id="dia-vencimento-padrao"
          type="number"
          min={1}
          max={31}
          inputMode="numeric"
          value={value.diaVencimentoPadrao}
          onChange={(e) => set({ diaVencimentoPadrao: e.target.value })}
          className="mt-1.5 w-full rounded-md border border-input px-3 py-2.5 text-sm tabular-nums"
          placeholder="Ex.: 20"
        />
      </div>
      {anual && (
        <div className="min-w-0">
          <label className="label-text">Mês</label>
          <AppSelect
            className="mt-1.5"
            value={value.mesVencimentoPadrao}
            onChange={(v) => set({ mesVencimentoPadrao: v })}
            allowEmpty
            placeholder="Cada cliente"
            options={[{ value: '', label: 'Data de cada cliente' }, ...MESES]}
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground sm:col-span-3">
        {anual
          ? 'Anual com mês: ao vincular ao cliente já entra na próxima data (ex.: DEFIS 31/03). Sem mês: cada cliente tem a sua (alvarás, bombeiros).'
          : 'Ao concluir uma ocorrência, a próxima é criada sozinha conforme a periodicidade.'}
      </p>
    </div>
  );
}
