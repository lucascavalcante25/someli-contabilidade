/**
 * Limpa o Markdown que veio das descrições do Trello (blocos ```, **negrito**, \*escapes\*,
 * links [url](url "smartCard-inline")) para mostrar acessos e anotações como texto simples.
 * Não muda o que está gravado; ao editar e salvar, o texto limpo é o que fica.
 */

const URL = 'https?:\\/\\/[^\\s\\])"]+';

function link(texto: string, url: string): string {
  const t = texto.trim();
  return !t || t === url || /^https?:\/\//.test(t) ? url : `${t} (${url})`;
}

export function limparTextoTrello(entrada: string | null | undefined): string {
  if (!entrada) return '';
  let s = entrada.replace(/\r\n?/g, '\n');

  // \*\*SISTEMA\*\* → **SISTEMA**
  s = s.replace(/\\([*_`[\]()#>])/g, '$1');

  // [texto](url "título")
  s = s.replace(new RegExp(`\\[([^\\]\\n]*)\\]\\s*\\((${URL})(?:\\s+"[^"]*")?\\)`, 'g'), (_m, t: string, u: string) => link(t, u));
  // link partido em duas linhas: "url]" + "(url" (com ou sem fechar)
  s = s.replace(new RegExp(`(${URL})\\]\\s*\\((${URL})(?:\\s+"[^"]*")?\\)?`, 'g'), (_m, a: string, b: string) => (a === b ? a : `${a} ${b}`));
  // colchete solto antes de endereço
  s = s.replace(/\[(https?:\/\/)/g, '$1');

  // **negrito** e __negrito__
  s = s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');

  const linhas: string[] = [];
  let ultimaComTexto = '';
  for (const bruta of s.split('\n')) {
    if (/^\s*```/.test(bruta)) continue; // cerca de bloco de código
    const linha = bruta.trim().replace(/\s{2,}/g, ' ');
    if (linha && linha === ultimaComTexto) continue; // mesma linha repetida
    if (!linha && linhas.length > 0 && linhas[linhas.length - 1] === '') continue; // várias linhas em branco
    linhas.push(linha);
    if (linha) ultimaComTexto = linha;
  }
  return linhas.join('\n').trim();
}
