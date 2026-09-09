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

/** Tooltip padronizado do SOMELI (acima de modais). */
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
