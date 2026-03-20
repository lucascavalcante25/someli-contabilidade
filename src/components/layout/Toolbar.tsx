import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import UserAvatar from '@/components/UserAvatar';
import { LogOut, Bell, ChevronRight, Menu, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notificacao {
  id: number;
  clienteObrigacaoId: number;
  clienteId: number;
  titulo: string;
  descricao: string;
  prioridade: string;
  dataCriacao: string;
  lida: boolean;
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

interface ToolbarProps {
  onMenuClick?: () => void;
}

export default function Toolbar({ onMenuClick }: ToolbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [count, setCount] = useState(0);

  const apiBaseUrl = API_BASE_URL;

  const carregarNotificacoes = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        apiFetch(`${apiBaseUrl}/notifications`, { headers: getAuthHeaders() }),
        apiFetch(`${apiBaseUrl}/notifications/count`, { headers: getAuthHeaders() }),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setNotificacoes(Array.isArray(data) ? data : []);
      }
      if (countRes.ok) {
        const countData = await countRes.json();
        setCount(Number(countData?.count ?? 0));
      }
    } catch {
      setNotificacoes([]);
      setCount(0);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void carregarNotificacoes();
  }, [carregarNotificacoes]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) void carregarNotificacoes();
    },
    [carregarNotificacoes]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleIrParaCliente = (clienteId: number) => {
    navigate(`/clientes/${clienteId}`);
  };

  const handleMarcarLida = async (id: number, clienteId: number) => {
    try {
      await apiFetch(`${apiBaseUrl}/notifications/${id}/lida`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      setNotificacoes(prev => prev.filter(n => n.id !== id));
      setCount(prev => Math.max(0, prev - 1));
      navigate(`/clientes/${clienteId}`);
    } catch {
      navigate(`/clientes/${clienteId}`);
    }
  };

  const temNotificacoes = notificacoes.length > 0;

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
              {count > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-medium px-1 ${
                  notificacoes.some(n => n.prioridade === 'critica') ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                }`}>
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-foreground">Notificações</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {temNotificacoes
                  ? `${count} obrigação(ões) vencendo ou em atraso`
                  : 'Nenhuma notificação pendente'}
              </p>
            </div>
            {temNotificacoes && (
              <div className="max-h-64 overflow-y-auto">
                {notificacoes.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                    onClick={() => void handleMarcarLida(n.id, n.clienteId)}
                  >
                    <div className="flex items-start gap-2 w-full">
                      {n.prioridade === 'critica' && (
                        <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm block truncate">{n.titulo}</span>
                        <span className="text-xs text-muted-foreground block truncate">{n.descricao}</span>
                        <span className="text-xs text-primary mt-1 block">Ver detalhes do cliente →</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            {temNotificacoes && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => navigate('/clientes')}
                >
                  <span className="text-sm font-medium">Ver todos os clientes</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-3">
          <UserAvatar userId={user?.id} fotoUrl={user?.fotoUrl} nome={user?.nome} avatarVersion={user?._avatarVersion} />
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
