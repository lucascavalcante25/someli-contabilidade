import { useArrastarParaRolar } from '@/hooks/useArrastarParaRolar';
import { cn } from '@/lib/utils';

interface TabelaCongeladaProps {
  /** Nome da área para leitores de tela. */
  rotulo: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Área de tabela larga como a do Painel do mês: altura limitada (a barra lateral fica sempre à vista),
 * rolagem nas duas direções e arrastar com o mouse para os lados. Cabeçalho e 1ª coluna ficam
 * congelados quando as células usam `sticky` (top-0 / left-0) com fundo opaco.
 */
export default function TabelaCongelada({ rotulo, children, className }: TabelaCongeladaProps) {
  const arrastar = useArrastarParaRolar<HTMLDivElement>();
  return (
    <div
      {...arrastar}
      role="region"
      aria-label={rotulo}
      title="Arraste para os lados para ver todas as colunas"
      className={cn(
        'isolate max-w-full max-h-[calc(100vh-260px)] min-h-[320px] overflow-auto overscroll-x-contain cursor-arrastar select-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
