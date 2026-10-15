// Edição na prévia: com marcarEdicao, cada valor de variável sai entre marcas invisíveis
// (variável e linha do cadastro). Depois de montar a página, as marcas viram <pub-v> onde o texto aparece
// na tela; dentro de tags (atributos) e de <title>, <style>, <script> e <textarea> ficam só o valor.
// As mesmas marcas levam o texto formatado (que vira texto puro fora da tela) e os blocos ocultos ou movidos.
import { textoDoRico } from './rico';

export const MARCA_INI = '\uE000';
export const MARCA_MEIO = '\uE001';
export const MARCA_FIM = '\uE002';

/**
 * valor marcado: variável | linha (vazia = geral) | vazio (o que aparece é o texto de "a confirmar", não o valor) | opções:
 * e = editável na prévia (<pub-v>), t = ocultar o texto (o bloco mantém o tamanho), b = ocultar o bloco, m<n> = mover o bloco n posições.
 * O valor já vem pronto para o HTML (escapado, ou formatado e limpo).
 */
export const marcar = (variavel: string, linha: string, valor: string, vazio = false, opcoes = 'e') =>
  MARCA_INI + variavel + '|' + linha + '|' + (vazio ? '1' : '') + '|' + opcoes + MARCA_MEIO + valor + MARCA_FIM;

const atr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * troca as marcas por <pub-v data-v data-l> (e <pub-o> dos blocos) no texto visível; no resto fica só o texto puro.
 * Vai direto de marca em marca (o HTML entre elas é copiado inteiro): páginas grandes não pesam no Worker.
 */
export function converterMarcas(html: string): string {
  if (!html.includes(MARCA_INI)) return html;
  // trechos crus (<script>, <style>, <title>, <textarea>): marca dentro deles vira texto puro
  const crus: [number, number][] = [];
  for (const m of html.matchAll(/<(script|style|title|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)) crus.push([m.index!, m.index! + m[0].length]);
  const emCru = (i: number) => crus.some(([a, b]) => i > a && i < b);
  // dentro de uma tag (atributo): o último "<" antes da marca vem depois do último ">"
  const emTag = (i: number) => html.lastIndexOf('<', i) > html.lastIndexOf('>', i);
  const partes: string[] = [];
  let fim = 0;
  for (let i = html.indexOf(MARCA_INI); i >= 0; i = html.indexOf(MARCA_INI, fim)) {
    const m = html.indexOf(MARCA_MEIO, i);
    const f = m < 0 ? -1 : html.indexOf(MARCA_FIM, m);
    if (m < 0 || f < 0) break;
    partes.push(html.slice(fim, i));
    const [variavel, linha = '', vazio, opcoes = 'e'] = html.slice(i + 1, m).split('|');
    const valor = html.slice(m + 1, f);
    if (emCru(i) || emTag(i)) partes.push(textoDoRico(valor));
    else if (opcoes.includes('b')) partes.push('<pub-o data-bloco></pub-o>');
    else {
      const mover = /m(-?\d+)/.exec(opcoes)?.[1];
      let v = opcoes.includes('t') ? `<span style="visibility:hidden">${valor}</span>` : valor;
      if (opcoes.includes('e')) v = `<pub-v data-v="${atr(variavel)}" data-l="${atr(linha)}"${vazio ? ' data-ph="1"' : ''}>${v}</pub-v>`;
      partes.push((mover ? `<pub-o data-mover="${mover}"></pub-o>` : '') + v);
    }
    fim = f + 1;
  }
  partes.push(html.slice(fim));
  return partes.join('').replace(/[\uE000\uE001\uE002]/g, '');
}
