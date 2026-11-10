/**
 * Copia o texto para a área de transferência. Se o navegador bloquear a API moderna
 * (aba sem foco, permissão negada), tenta pelo execCommand com um campo escondido.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // cai no plano B
  }
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.position = 'fixed';
  campo.style.opacity = '0';
  document.body.appendChild(campo);
  try {
    campo.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    campo.remove();
  }
}
