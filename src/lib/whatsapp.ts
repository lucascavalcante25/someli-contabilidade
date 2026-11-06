/** Atalho para conversar com o responsável legal do cliente pelo WhatsApp (wa.me, sem integração). */

function digitosNacionais(telefone: string | null | undefined): string {
  let d = (telefone ?? '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
}

/** Link wa.me com DDI 55; null quando falta DDD ou o número está incompleto. */
export function linkWhatsApp(telefone: string | null | undefined): string | null {
  const d = digitosNacionais(telefone);
  return d.length === 10 || d.length === 11 ? `https://wa.me/55${d}` : null;
}

export function formatarTelefone(telefone: string | null | undefined): string {
  const d = digitosNacionais(telefone);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone ?? '';
}
