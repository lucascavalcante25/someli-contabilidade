import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModalShellProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export default function ModalShell({
  onClose,
  children,
  className,
  maxWidth = 'md',
}: ModalShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 24, scale: 0.98, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'card-surface w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto',
          'rounded-t-2xl sm:rounded-xl p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]',
          maxWidthClass[maxWidth],
          className
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
