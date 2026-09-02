import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import UserAvatar from '@/components/UserAvatar';
import BrandLogo from '@/components/BrandLogo';
import TypewriterText from '@/components/shared/TypewriterText';
import { LogOut, Bell, ChevronRight, Menu, AlertCircle, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  clienteId: number;
  titulo: string;
  descricao: string;
  prioridade: string;
  dataCriacao: string;
  lida: boolean;
}

interface MensagemDiaria {
  id?: number;
  diaAno?: number;
  texto: string;
  referencia?: string;
  tipo?: string;
}

/** Autor (citação) ou referência bíblica (versículo). Ignora rótulo genérico. */
function autorOuReferencia(ref?: string): string | undefined {
  if (!ref) return undefined;
  const t = ref.trim();
  if (!t) return undefined;
  const n = t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (n === 'mensagem de animo' || n.startsWith('mensagem de animo')) return undefined;
  return t;
}

/**
 * Sempre: texto + ponto + autor/referência bíblica na mesma linha.
 * Ex.: "...lugar. — João 14:2"
 */
function montarMensagem(texto: string, referencia?: string): string {
  const base = (texto || '').trim();
  if (!base) return '';
  const autor = autorOuReferencia(referencia);
  const comPonto = /[.!?…]$/.test(base) ? base : `${base}.`;
  if (!autor) return comPonto;
  if (base.includes(`— ${autor}`) || base.endsWith(autor)) return comPonto;
  // NBSP evita quebrar a referência para a linha de baixo
  return `${comPonto}\u00A0—\u00A0${autor.replace(/ /g, '\u00A0')}`;
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
  const [mensagem, setMensagem] = useState<MensagemDiaria | null>(null);

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

  const carregarMensagem = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/mensagens-diarias/hoje`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setMensagem({
        id: data.id,
        diaAno: data.diaAno,
        texto: String(data.texto || ''),
        referencia: data.referencia ? String(data.referencia) : undefined,
        tipo: data.tipo ? String(data.tipo) : undefined,
      });
    } catch {
      setMensagem(null);
    }
  }, [apiBaseUrl]);

  const mensagemExibida = mensagem?.texto
    ? montarMensagem(mensagem.texto, mensagem.referencia)
    : '';

  useEffect(() => {
    void carregarNotificacoes();
    void carregarMensagem();
  }, [carregarNotificacoes, carregarMensagem]);

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
    <header className="sticky top-0 z-20 shrink-0 min-w-0 pt-[env(safe-area-inset-top)] bg-sidebar border-b border-sidebar-border">
      <div className="flex h-14 md:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-6">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-1 rounded-md text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/50 transition-colors shrink-0"
            title="Menu"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="md:hidden flex items-center min-w-0">
            <BrandLogo variant="white" imgClassName="w-[140px] max-w-[min(140px,52vw)] h-auto max-h-[36px]" />
          </div>
        </div>

        {/* Mensagem diária — centro (desktop) */}
        <div className="hidden md:flex flex-1 min-w-0 items-center justify-center px-2">
          {!isMobile && mensagemExibida ? (
            <div className="max-w-4xl w-full text-center">
              <p className="text-[13px] leading-snug text-sidebar-foreground/95 font-medium whitespace-normal">
                <TypewriterText text={mensagemExibida} speedMs={34} />
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
          <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                className="relative p-2 rounded-md text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/50 transition-colors"
                title="Notificações"
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
          <div className="h-6 w-px bg-sidebar-border hidden sm:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 sm:gap-3 rounded-md p-1 pr-1.5 sm:pr-2 hover:bg-sidebar-accent/50 transition-colors outline-none"
                title="Conta"
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

      {/* Mobile: mensagem compacta abaixo */}
      {isMobile && mensagemExibida ? (
        <div className="md:hidden px-3 pb-2.5 border-t border-sidebar-border/50">
          <p className="text-[11px] leading-snug text-sidebar-foreground/90">
            <TypewriterText text={mensagemExibida} speedMs={30} />
          </p>
        </div>
      ) : null}
    </header>
  );
}
