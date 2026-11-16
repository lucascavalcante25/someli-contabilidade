import { API_BASE_URL } from '@/lib/api';
import { requisicao } from '@/lib/painelMensal';
import { linkWhatsApp } from '@/lib/whatsapp';

/** Aniversário do dono, aniversário da empresa ou dia da profissão do cliente. */
export type TipoDataEspecial = 'ANIVERSARIO_RESPONSAVEL' | 'ANIVERSARIO_EMPRESA' | 'DIA_PROFISSAO';

export interface DataEspecial {
  /** yyyy-MM-dd */
  data: string;
  tipo: TipoDataEspecial;
  clienteId: number;
  clienteNome: string;
  pessoa: string | null;
  profissao: string | null;
  /** Anos de empresa (só no aniversário da empresa). */
  anos: number | null;
  telefone: string | null;
}

export interface Profissao {
  id: number;
  nome: string;
  dia: number;
  mes: number;
  cnaePrefixos: string | null;
  ativo: boolean;
}

export interface ProfissaoEntrada {
  nome: string;
  dia: number;
  mes: number;
  cnaePrefixos?: string | null;
  ativo?: boolean;
}

export const CHAVE_PROFISSOES = ['profissoes'] as const;

export function carregarDatasEspeciais(ano: number, mes: number) {
  return requisicao<DataEspecial[]>(`${API_BASE_URL}/datas-especiais?ano=${ano}&mes=${mes}`);
}

export function listarProfissoes() {
  return requisicao<Profissao[]>(`${API_BASE_URL}/profissoes`);
}

export function salvarProfissao(entrada: ProfissaoEntrada, id?: number) {
  return requisicao<Profissao>(id ? `${API_BASE_URL}/profissoes/${id}` : `${API_BASE_URL}/profissoes`, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entrada),
  });
}

export interface DiaCalendario {
  dia: number;
  /** yyyy-MM-dd */
  iso: string;
  eventos: DataEspecial[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Semanas do mês (domingo a sábado); dias de fora do mês ficam null. */
export function montarCalendario(ano: number, mes: number, eventos: DataEspecial[]): (DiaCalendario | null)[][] {
  const primeiro = new Date(ano, mes - 1, 1).getDay();
  const total = new Date(ano, mes, 0).getDate();
  const celulas: (DiaCalendario | null)[] = Array.from({ length: primeiro }, () => null);
  for (let dia = 1; dia <= total; dia++) {
    const iso = `${ano}-${pad(mes)}-${pad(dia)}`;
    celulas.push({ dia, iso, eventos: eventos.filter((e) => e.data === iso) });
  }
  while (celulas.length % 7 !== 0) celulas.push(null);
  const semanas: (DiaCalendario | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}

/** Texto curto do que acontece no dia (balão do calendário e lista). */
export function descreverEvento(e: DataEspecial): string {
  if (e.tipo === 'DIA_PROFISSAO') return `Dia do ${e.profissao}: ${e.clienteNome}`;
  if (e.tipo === 'ANIVERSARIO_EMPRESA') return `${e.clienteNome} faz ${e.anos} ${e.anos === 1 ? 'ano' : 'anos'} de empresa`;
  return e.pessoa ? `Aniversário de ${e.pessoa} (${e.clienteNome})` : `Aniversário do responsável (${e.clienteNome})`;
}

function primeiroNome(nome: string | null): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}

function mensagemParabens(e: DataEspecial): string {
  const nome = primeiroNome(e.pessoa);
  const ola = nome ? `Olá, ${nome}!` : 'Olá!';
  if (e.tipo === 'DIA_PROFISSAO') {
    return `${ola} Feliz Dia do ${e.profissao}! A equipe da Someli Contabilidade deseja muito sucesso para você e para a ${e.clienteNome}.`;
  }
  if (e.tipo === 'ANIVERSARIO_EMPRESA') {
    return `${ola} Hoje a ${e.clienteNome} completa ${e.anos} ${e.anos === 1 ? 'ano' : 'anos'}! Parabéns pela trajetória. Conte sempre com a Someli Contabilidade.`;
  }
  return `Feliz aniversário${nome ? `, ${nome}` : ''}! A equipe da Someli Contabilidade deseja um dia muito especial e um novo ano cheio de conquistas.`;
}

/** wa.me com a mensagem pronta; quem envia confere e manda pelo WhatsApp da Someli. Null sem telefone válido. */
export function linkParabens(e: DataEspecial): string | null {
  const base = linkWhatsApp(e.telefone);
  return base ? `${base}?text=${encodeURIComponent(mensagemParabens(e))}` : null;
}

/** Profissão sugerida pelo CNAE principal: vale o prefixo mais longo que bate. */
export function sugerirProfissao(profissoes: Profissao[], cnae: string | null | undefined): Profissao | undefined {
  const digitos = (cnae ?? '').replace(/\D/g, '');
  if (!digitos) return undefined;
  let melhor: { p: Profissao; tamanho: number } | undefined;
  for (const p of profissoes) {
    if (!p.ativo) continue;
    for (const prefixo of (p.cnaePrefixos ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
      if (digitos.startsWith(prefixo) && (!melhor || prefixo.length > melhor.tamanho)) {
        melhor = { p, tamanho: prefixo.length };
      }
    }
  }
  return melhor?.p;
}

/** Data da Receita (dd/mm/aaaa) para o campo de data (aaaa-mm-dd); vazio se não vier. */
export function dataDaConsulta(valor: string | null | undefined): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((valor ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
