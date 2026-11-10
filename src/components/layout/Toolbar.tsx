import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import UserAvatar from '@/components/UserAvatar';
import BrandLogo from '@/components/BrandLogo';
import HintTooltip from '@/components/shared/HintTooltip';
import { LogOut, Bell, ChevronRight, Menu, AlertCircle, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMensagemDoDia } from '@/lib/mensagemDiaria';
import { useIsMobile } from '@/hooks/useMediaQuery';
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
  clienteId?: number;
  link?: string;
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
  const isMobile = useIsMobile();
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

  const mensagemExibida = useMensagemDoDia();

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

  const handleMarcarLida = async (notificacao: Notificacao) => {
    const { id } = notificacao;
    const destino = notificacao.link || `/clientes/${notificacao.clienteId}`;
    try {
      await apiFetch(`${apiBaseUrl}/notifications/${id}/lida`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      setNotificacoes(prev => prev.filter(n => n.id !== id));
      setCount(prev => Math.max(0, prev - 1));
      navigate(destino);
    } catch {
      navigate(destino);
    }
  };

  const temNotificacoes = notificacoes.length > 0;

  const topBar = (
    <div className="flex h-14 md:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-6">
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <HintTooltip content="Abrir menu">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-1 rounded-md text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/50 transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
        </HintTooltip>
        <div className="md:hidden flex items-center min-w-0">
          <BrandLogo variant="white" imgClassName="w-[140px] max-w-[min(140px,52vw)] h-auto max-h-[36px]" />
        </div>
      </div>

      {/* Mensagem diária — centro (desktop) */}
      <div className="hidden md:flex flex-1 min-w-0 items-center justify-center px-2">
        {!isMobile && mensagemExibida ? (
          <div className="max-w-4xl w-full text-center">
            {/* Fixo e discreto: sem efeito de digitação a cada página */}
            <p className="text-[12.5px] italic leading-snug text-sidebar-foreground/75 whitespace-normal line-clamp-2">
              {mensagemExibida}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
        <DropdownMenu onOpenChange={handleOpenChange}>
          <HintTooltip content="Notificações">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative p-2 rounded-md text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/50 transition-colors"
                aria-label="Notificações"
              >
                <Bell size={18} />
                {count > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-medium px-1 ${
                    notificacoes.some(n => n.prioridade === 'critica')
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-sidebar-primary text-sidebar-primary-foreground'
                  }`}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
          </HintTooltip>
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
                    onClick={() => void handleMarcarLida(n)}
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
        <div className="h-6 w-px bg-sidebar-border hidden sm:block" />
        <DropdownMenu>
          <HintTooltip content="Conta">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 sm:gap-3 rounded-md p-1 pr-1.5 sm:pr-2 hover:bg-sidebar-accent/50 transition-colors outline-none"
                aria-label="Conta"
              >
                <UserAvatar
                  userId={user?.id}
                  fotoUrl={user?.fotoUrl}
                  nome={user?.nome}
                  avatarVersion={user?._avatarVersion}
                  className="ring-sidebar-primary ring-offset-sidebar"
                />
                <div className="hidden sm:block min-w-0 text-left">
                  <p className="text-sm font-medium leading-none text-sidebar-foreground truncate max-w-[9rem]">
                    {user?.nome}
                  </p>
                  <p className="text-xs text-sidebar-muted mt-0.5">{user?.perfil}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
          </HintTooltip>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold truncate">{user?.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || user?.perfil}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate('/configuracoes')}>
              <UserRound size={16} />
              Minha conta
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate('/configuracoes')}>
              <Settings size={16} />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      <header
        className={
          isMobile
            ? 'fixed top-0 left-0 right-0 z-20 shrink-0 min-w-0 pt-[env(safe-area-inset-top)] bg-sidebar'
            : 'sticky top-0 z-20 shrink-0 min-w-0 pt-[env(safe-area-inset-top)] bg-sidebar border-b border-sidebar-border'
        }
      >
        {topBar}
      </header>

      {/* Mobile: reserva espaço da barra fixa; versículo rola com o conteúdo */}
      {isMobile ? (
        <div
          className="md:hidden shrink-0"
          aria-hidden
          style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
        />
      ) : null}

      {/* No celular o versículo fica no Dashboard, abaixo da saudação (não empurra todas as telas) */}
    </>
  );
}
