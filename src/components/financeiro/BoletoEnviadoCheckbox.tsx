import { Checkbox } from '@/components/ui/checkbox';
import HintTooltip from '@/components/shared/HintTooltip';
import { descreverEnvioBoleto } from '@/lib/boletoEnviado';

interface BoletoEnviadoCheckboxProps {
  enviado: boolean;
  enviadoEm: string | null;
  enviadoPor: string | null;
  salvando: boolean;
  onAlterar: (enviado: boolean) => void;
}

/** Caixa "Boleto enviado?" da tabela do Financeiro; o tooltip mostra quando e quem enviou. */
export default function BoletoEnviadoCheckbox({
  enviado,
  enviadoEm,
  enviadoPor,
  salvando,
  onAlterar,
}: BoletoEnviadoCheckboxProps) {
  return (
    <div className="flex justify-center">
      <HintTooltip content={descreverEnvioBoleto(enviado, enviadoEm, enviadoPor)}>
        <span className="inline-flex">
          <Checkbox
            checked={enviado}
            disabled={salvando}
            onCheckedChange={() => onAlterar(!enviado)}
            className="h-5 w-5 rounded-md data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
            aria-label={enviado ? 'Desmarcar boleto enviado' : 'Marcar boleto como enviado'}
          />
        </span>
      </HintTooltip>
    </div>
  );
}
