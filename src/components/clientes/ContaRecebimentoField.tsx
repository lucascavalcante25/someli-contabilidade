import AppSelect from '@/components/shared/AppSelect';
import { CONTA_RECEBIMENTO_OPCOES } from '@/lib/contaRecebimento';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ContaRecebimentoField({ value, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="label-text">Conta de recebimento</label>
      <AppSelect
        value={value}
        onChange={onChange}
        allowEmpty
        placeholder="Não informado"
        options={CONTA_RECEBIMENTO_OPCOES}
      />
    </div>
  );
}
