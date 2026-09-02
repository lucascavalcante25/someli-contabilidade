import { cn } from '@/lib/utils';

type BrandLogoVariant = 'white' | 'color';

interface BrandLogoProps {
  /** white = fundo escuro/roxo; color = fundo claro */
  variant?: BrandLogoVariant;
  /** Só o símbolo S (útil na sidebar recolhida) */
  symbolOnly?: boolean;
  className?: string;
  imgClassName?: string;
}

const SOURCES = {
  whiteFull: '/logos/logo-branca.png',
  colorFull: '/logos/logo-rosa.png',
  whiteSymbol: '/logos/simbolo-branco.png',
  colorSymbol: '/logos/simbolo-rosa.png',
} as const;

export default function BrandLogo({
  variant = 'white',
  symbolOnly = false,
  className,
  imgClassName,
}: BrandLogoProps) {
  const src = symbolOnly
    ? variant === 'white'
      ? SOURCES.whiteSymbol
      : SOURCES.colorSymbol
    : variant === 'white'
      ? SOURCES.whiteFull
      : SOURCES.colorFull;

  return (
    <div className={cn('flex items-center shrink-0', className)}>
      <img
        src={src}
        alt="SOMELI Assessoria Contábil"
        className={cn(
          'object-contain object-left',
          symbolOnly ? 'h-9 w-9' : 'h-8 w-auto max-w-[140px] sm:h-9 sm:max-w-[160px]',
          imgClassName
        )}
      />
    </div>
  );
}
