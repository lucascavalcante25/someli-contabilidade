import { cn } from '@/lib/utils';

interface TableScrollProps {
  children: React.ReactNode;
  className?: string;
}

export default function TableScroll({ children, className }: TableScrollProps) {
  return (
    <div className={cn('overflow-x-auto overscroll-x-contain max-w-full', className)}>
      {children}
    </div>
  );
}
