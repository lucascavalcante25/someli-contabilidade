import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Side = 'top' | 'right' | 'bottom' | 'left';

interface HintTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  /** Quando false, renderiza só o filho (útil se o texto for vazio). */
  enabled?: boolean;
  contentClassName?: string;
  asChild?: boolean;
}

/**
 * Tooltip padronizado do SOMELI (acima de modais).
 *
 * Não envolva TabsTrigger/Trigger com data-state próprio via asChild: o Tooltip
 * sobrescreve data-state (closed/open) no mesmo nó e quebra estilos ativos.
 * Prefira um wrapper (ex.: span) em torno do trigger, ou tooltip só no conteúdo interno.
 */
export default function HintTooltip({
  content,
  children,
  side = 'top',
  enabled = true,
  contentClassName,
  asChild = true,
}: HintTooltipProps) {
  if (!enabled || content == null || content === '') {
    return <>{children}</>;
  }

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild={asChild}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={contentClassName}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
