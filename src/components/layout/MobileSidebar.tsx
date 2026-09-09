import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Users, DollarSign, Receipt, UserCog, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', module: 'DASHBOARD' },
  { label: 'Consultas', icon: Search, path: '/consultas', module: 'CONSULTAS' },
  { label: 'Clientes', icon: Users, path: '/clientes', module: 'CLIENTES' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro', module: 'FINANCEIRO' },
  { label: 'Despesas', icon: Receipt, path: '/despesas', module: 'DESPESAS' },
  { label: 'Tipos de Obrigação', icon: ClipboardList, path: '/obrigacoes-tipos', module: 'OBRIGACOES_TIPOS' },
  { label: 'Usuários', icon: UserCog, path: '/usuarios', module: 'USUARIOS' },
];

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const { canModule } = useAuth();
  const visible = menuItems.filter(item => canModule(item.module));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[240px] max-w-[85vw] p-0 bg-sidebar border-sidebar-border pt-[env(safe-area-inset-top)] [&>button]:top-[max(1rem,env(safe-area-inset-top))] [&>button]:text-sidebar-foreground [&>button]:hover:text-sidebar-primary">
        <div className="flex flex-col h-full">
          <div className="flex h-16 items-center px-3 border-b border-sidebar-border shrink-0">
            <BrandLogo variant="white" imgClassName="w-[168px] max-w-full h-auto max-h-[44px]" />
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {visible.map((item) => {
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
