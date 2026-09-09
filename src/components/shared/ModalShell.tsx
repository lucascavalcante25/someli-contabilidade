import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const maxWidthClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-5xl',
};

interface ModalShellProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /**
   * Mantém largura/altura estáveis (não “pula” ao trocar abas/conteúdo).
   * O conteúdo interno deve usar overflow próprio se precisar rolar.
   */
  fixedSize?: boolean;
}

export default function ModalShell({
  onClose,
  children,
  className,
  maxWidth = 'md',
  fixedSize = false,
}: ModalShellProps) {
  const closeOnBackdropRef = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onPointerDown={(e) => {
        closeOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdropRef.current) onClose();
        closeOnBackdropRef.current = false;
      }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ y: 24, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 24, scale: 0.98, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          closeOnBackdropRef.current = false;
          e.stopPropagation();
        }}
        className={cn(
          'card-surface w-full',
          'rounded-t-2xl sm:rounded-xl',
          maxWidthClass[maxWidth],
          fixedSize
            ? cn(
                'flex flex-col overflow-hidden',
                'h-[min(100dvh,100%)] sm:h-[min(720px,90vh)]',
                'max-h-[100dvh] sm:max-h-[90vh]',
                'p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]'
              )
            : cn(
                'max-h-[92vh] sm:max-h-[90vh] overflow-y-auto',
                'p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]'
              ),
          className
        )}
      >
        {fixedSize ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        ) : (
          children
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
