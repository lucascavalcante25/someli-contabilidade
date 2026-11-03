import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

/** Controle de envio do boleto do mês (evita enviar duplicado ou esquecer). */

export interface BoletoEnviadoInfo {
  clienteId: number;
  mes: number;
  ano: number;
  enviado: boolean;
  enviadoEm: string | null;
  enviadoPor: string | null;
}

/** Separa falha de rede (sem resposta) de erro devolvido pelo servidor. */
export class ErroBoleto extends Error {
  constructor(
    message: string,
    readonly tipo: 'rede' | 'servidor',
  ) {
    super(message);
    this.name = 'ErroBoleto';
  }
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function descreverEnvioBoleto(enviado: boolean, enviadoEm: string | null, enviadoPor: string | null): string {
  if (!enviado) return 'Boleto ainda não enviado';
  const data = enviadoEm ? new Date(enviadoEm) : null;
  if (!data || Number.isNaN(data.getTime())) {
    return enviadoPor ? `Boleto enviado por ${enviadoPor}` : 'Boleto enviado';
  }
  const quando = `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)} às ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
  return `Enviado em ${quando}${enviadoPor ? ` por ${enviadoPor}` : ''}`;
}

export async function alterarBoletoEnviado(
  clienteId: number,
  mes: number,
  ano: number,
  enviado: boolean,
): Promise<BoletoEnviadoInfo> {
  const url = `${API_BASE_URL}/financeiro/pagamentos/${clienteId}/boleto-enviado?mes=${mes}&ano=${ano}`;
  let response: Response;
  try {
    response = await apiFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enviado }),
    });
  } catch {
    throw new ErroBoleto('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'rede');
  }
  const corpo: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo && typeof corpo.message === 'string'
        ? corpo.message
        : `Erro ${response.status} ao salvar o envio do boleto`;
    throw new ErroBoleto(mensagem, 'servidor');
  }
  return corpo as BoletoEnviadoInfo;
}
