import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Users, DollarSign, Receipt, UserCog, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Consultas', icon: Search, path: '/consultas' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { label: 'Despesas', icon: Receipt, path: '/despesas' },
  { label: 'Tipos de Obrigação', icon: ClipboardList, path: '/obrigacoes-tipos' },
  { label: 'Usuários', icon: UserCog, path: '/usuarios' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-sidebar"
    >
      {/* Logo alinhada com a altura da toolbar (mesma faixa superior) */}
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
            imgClassName="h-12 w-auto max-w-[min(204px,100%)]"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map(item => {
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

      {/* Toggle */}
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
