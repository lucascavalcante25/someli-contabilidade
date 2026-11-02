export interface PedidoParaEnvio {
  cliente: string;
  titulo: string;
  link: string;
}

/** Número no formato do wa.me. Exige DDD para não abrir conversa com a pessoa errada. */
export function numeroWhatsApp(telefone?: string | null): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  const nacional = digitos.length >= 12 && digitos.startsWith('55') ? digitos.slice(2) : digitos;
  return nacional.length === 10 || nacional.length === 11 ? `55${nacional}` : null;
}

export function mensagemPedido({ cliente, titulo, link }: PedidoParaEnvio): string {
  return [
    `Olá, ${cliente}!`,
    '',
    `A Someli precisa do seguinte documento: ${titulo}.`,
    '',
    'Envie por este link seguro, sem precisar de login:',
    link,
    '',
    'O link vale por 7 dias.',
  ].join('\n');
}

export function linkWhatsApp(telefone: string | null | undefined, pedido: PedidoParaEnvio): string | null {
  const numero = numeroWhatsApp(telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagemPedido(pedido))}` : null;
}

/** Sem número: o WhatsApp pede para escolher a conversa, inclusive um grupo. */
export function linkWhatsAppEscolherConversa(pedido: PedidoParaEnvio): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagemPedido(pedido))}`;
}

/** Abre a tela de escrever do Gmail, na conta logada no navegador, para revisar e enviar. */
export function linkGmail(email: string | null | undefined, pedido: PedidoParaEnvio): string | null {
  const destino = (email ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
    return null;
  }
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: destino,
    su: `Someli: ${pedido.titulo}`,
    body: mensagemPedido(pedido),
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
