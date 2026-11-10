import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

/** Pagamento de honorário de um mês: o mesmo lançamento da tela Financeiro (marcar / desmarcar como pago). */
async function enviar(acao: 'marcar' | 'desmarcar', clienteId: number, mes: number, ano: number) {
  let res: Response;
  try {
    res = await apiFetch(`${API_BASE_URL}/financeiro/pagamentos/${clienteId}/${acao}?mes=${mes}&ano=${ano}`, { method: 'POST' });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
  }
  if (res.status === 403) throw new Error('Você não tem permissão para alterar pagamentos.');
  if (!res.ok) {
    const corpo: unknown = await res.json().catch(() => null);
    const msg = corpo && typeof corpo === 'object' && 'message' in corpo && typeof corpo.message === 'string' ? corpo.message : null;
    throw new Error(msg ?? `Erro ${res.status} ao salvar o pagamento`);
  }
}

export const marcarPagamento = (clienteId: number, mes: number, ano: number) => enviar('marcar', clienteId, mes, ano);
export const desmarcarPagamento = (clienteId: number, mes: number, ano: number) => enviar('desmarcar', clienteId, mes, ano);
