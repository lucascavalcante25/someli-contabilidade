import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Users, DollarSign, Receipt, UserCog, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Consultas', icon: Search, path: '/consultas' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { label: 'Despesas', icon: Receipt, path: '/despesas' },
  { label: 'Tipos de Obrigação', icon: ClipboardList, path: '/obrigacoes-tipos' },
  { label: 'Usuários', icon: UserCog, path: '/usuarios' },
];

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 bg-sidebar border-sidebar-border [&>button]:text-sidebar-foreground [&>button]:hover:text-sidebar-primary">
        <div className="flex flex-col h-full">
          <div className="flex h-16 items-center px-4 gap-3 border-b border-sidebar-border">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent font-bold text-sidebar-primary text-sm">
              S
            </div>
            <span className="text-sidebar-primary font-semibold text-sm tracking-tight">SOMELI</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/50'
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
