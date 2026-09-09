import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Users, DollarSign, Receipt, UserCog, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { canModule } = useAuth();
  const visible = menuItems.filter(item => canModule(item.module));

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 208 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-sidebar"
    >
      <div
        className={cn(
          'flex items-center overflow-hidden border-b border-sidebar-border/60 shrink-0',
          collapsed ? 'h-16 justify-center px-2' : 'h-16 px-3'
        )}
      >
        {collapsed ? (
          <BrandLogo variant="white" symbolOnly imgClassName="h-9 w-9" />
        ) : (
          <BrandLogo
            variant="white"
            imgClassName="w-[168px] max-w-full h-auto max-h-[44px]"
          />
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visible.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:text-sidebar-primary hover:translate-x-0.5'
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-muted hover:text-sidebar-primary transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
}
