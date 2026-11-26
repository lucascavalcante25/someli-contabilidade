import { RefreshCw, WifiOff } from 'lucide-react';
import type { RegimeRtc } from '@/lib/simuladorRtc';

interface Props {
  regime: RegimeRtc;
  mensagem?: string | null;
  onTentarDeNovo: () => void;
}

const NOME: Record<RegimeRtc, string> = {
  REGIME_REGULAR: 'do regime regular',
  SIMPLES_NACIONAL: 'do Simples Nacional',
};

/** Aparece quando a calculadora da Receita não responde (ainda não instalada ou fora do ar). */
export default function AvisoCalculadoraIndisponivel({ regime, mensagem, onTentarDeNovo }: Props) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-start">
      <WifiOff size={20} className="shrink-0 text-destructive" />
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="font-medium">A calculadora {NOME[regime]} não está respondendo agora.</p>
        <p className="text-muted-foreground">
          Sem ela não dá para simular nem salvar cenário neste regime. O restante do sistema funciona normalmente.
          Se continuar assim, avise o administrador: a calculadora roda num serviço próprio no servidor.
        </p>
        {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
      </div>
      <button type="button" onClick={onTentarDeNovo}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
        <RefreshCw size={14} /> Tentar de novo
      </button>
    </div>
  );
}
