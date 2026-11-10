import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

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
 * Texto + ponto + autor/referência bíblica na mesma linha.
 * Ex.: "...lugar. — João 14:2"
 */
export function montarMensagem(texto: string, referencia?: string): string {
  const base = (texto || '').trim();
  if (!base) return '';
  const autor = autorOuReferencia(referencia);
  const comPonto = /[.!?…]$/.test(base) ? base : `${base}.`;
  if (!autor) return comPonto;
  if (base.includes(`— ${autor}`) || base.endsWith(autor)) return comPonto;
  // NBSP evita quebrar a referência para a linha de baixo
  return `${comPonto}\u00A0—\u00A0${autor.replace(/ /g, '\u00A0')}`;
}

/** Mensagem do dia (versículo ou frase), já montada; vazio enquanto carrega ou se falhar. */
export function useMensagemDoDia(): string {
  const [mensagem, setMensagem] = useState('');
  useEffect(() => {
    let ativo = true;
    apiFetch(`${API_BASE_URL}/mensagens-diarias/hoje`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { texto?: unknown; referencia?: unknown };
        if (ativo) setMensagem(montarMensagem(String(data.texto ?? ''), data.referencia ? String(data.referencia) : undefined));
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);
  return mensagem;
}
