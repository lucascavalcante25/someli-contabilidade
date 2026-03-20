import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, Bell, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

const STORAGE_KEY = 'someli_notifications_modal_date';

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
  return { 'Content-Type': 'application/json' };
}

function naoMostrarHoje() {
  const hoje = new Date().toDateString();
  localStorage.setItem(STORAGE_KEY, hoje);
}

function foiOcultadoHoje(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  return stored === new Date().toDateString();
}

export default function NotificationsLoginModal() {
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (foiOcultadoHoje()) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/notifications`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setNotificacoes(lista);
      setVisible(lista.length > 0);
    } catch {
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleFechar = () => {
    setVisible(false);
  };

  const handleNaoMostrarHoje = () => {
    naoMostrarHoje();
    setVisible(false);
  };

  const handleIrParaCliente = (clienteId: number) => {
    setVisible(false);
    navigate(`/clientes/${clienteId}`);
  };

  if (loading || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
        onClick={handleFechar}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Bell size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Notificações pendentes</h2>
                <p className="text-xs text-muted-foreground">
                  {notificacoes.length} obrigação(ões) vencendo ou em atraso
                </p>
              </div>
            </div>
            <button
              onClick={handleFechar}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-64">
            {notificacoes.map(n => (
              <button
                key={n.id}
                onClick={() => handleIrParaCliente(n.clienteId)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors flex items-start gap-3"
              >
                {n.prioridade === 'critica' && (
                  <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{n.descricao}</p>
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    Ver detalhes do cliente <ChevronRight size={12} />
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-border flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleNaoMostrarHoje}
              className="text-xs text-muted-foreground hover:text-foreground py-2 px-3 rounded-md hover:bg-muted"
            >
              Não mostrar novamente hoje
            </button>
            <button
              onClick={() => { handleFechar(); navigate('/clientes'); }}
              className="text-sm font-medium text-primary hover:underline py-2 px-3"
            >
              Ir para clientes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
