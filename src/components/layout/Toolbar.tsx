import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Bell, ChevronRight, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClienteAtrasado {
  id: number;
  razaoSocial: string;
  nomeFantasia: string;
  honorario: number;
  status: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function getAuthHeaders() {
  const token = localStorage.getItem('someli_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || ''}`,
  };
}

interface ToolbarProps {
  onMenuClick?: () => void;
}

export default function Toolbar({ onMenuClick }: ToolbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [atrasados, setAtrasados] = useState<ClienteAtrasado[]>([]);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const carregarAtrasados = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/clientes`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      const atrasadosList = lista
        .filter((c: any) => (c.status || '').toLowerCase() === 'atrasado')
        .map((c: any) => ({
          id: c.id,
          razaoSocial: c.razaoSocial ?? '',
          nomeFantasia: c.nomeFantasia ?? '',
          honorario: Number(c.honorario ?? 0),
          status: c.status ?? '',
        }));
      setAtrasados(atrasadosList);
    } catch {
      setAtrasados([]);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void carregarAtrasados();
  }, [carregarAtrasados]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) void carregarAtrasados();
    },
    [carregarAtrasados]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleVerCobrancas = () => {
    navigate('/financeiro');
  };

  const temAtrasados = atrasados.length > 0;

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Menu"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              className="relative p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="Notificações"
            >
              <Bell size={18} />
              {temAtrasados && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">
                  {atrasados.length > 9 ? '9+' : atrasados.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-foreground">
                {temAtrasados ? 'Clientes em atraso' : 'Notificações'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {temAtrasados
                  ? `${atrasados.length} cliente(s) com pagamento em atraso`
                  : 'Nenhum cliente em atraso'}
              </p>
            </div>
            {temAtrasados && (
              <div className="max-h-48 overflow-y-auto">
                {atrasados.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                    onClick={handleVerCobrancas}
                  >
                    <span className="font-medium text-sm truncate w-full">
                      {c.nomeFantasia || c.razaoSocial || 'Cliente'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(c.honorario)} em atraso
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center justify-between cursor-pointer mt-1"
              onClick={handleVerCobrancas}
            >
              <span className="text-sm font-medium">Ver financeiro</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            {user?.nome?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.nome}</p>
            <p className="text-xs text-muted-foreground">{user?.perfil}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-md text-muted-foreground hover:text-destructive transition-colors"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
