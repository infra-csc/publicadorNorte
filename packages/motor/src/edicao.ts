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

const CRU = ['script', 'style', 'title', 'textarea'];
const atr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** troca as marcas por <pub-v data-v data-l> (e <pub-o> dos blocos) no texto visível; no resto fica só o texto puro */
export function converterMarcas(html: string): string {
  if (!html.includes(MARCA_INI)) return html;
  let out = '';
  let emTag = false;
  let aspas = '';
  let cru: string | null = null;
  let abrindo: string | null = null;
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === MARCA_INI) {
      const m = html.indexOf(MARCA_MEIO, i);
      const f = html.indexOf(MARCA_FIM, m);
      if (m < 0 || f < 0) continue;
      const [variavel, linha = '', vazio, opcoes = 'e'] = html.slice(i + 1, m).split('|');
      const valor = html.slice(m + 1, f);
      if (emTag || cru) out += textoDoRico(valor);
      else if (opcoes.includes('b')) out += '<pub-o data-bloco></pub-o>';
      else {
        const mover = /m(-?\d+)/.exec(opcoes)?.[1];
        let v = opcoes.includes('t') ? `<span style="visibility:hidden">${valor}</span>` : valor;
        if (opcoes.includes('e')) v = `<pub-v data-v="${atr(variavel)}" data-l="${atr(linha)}"${vazio ? ' data-ph="1"' : ''}>${v}</pub-v>`;
        out += (mover ? `<pub-o data-mover="${mover}"></pub-o>` : '') + v;
      }
      i = f;
      continue;
    }
    if (ch === MARCA_MEIO || ch === MARCA_FIM) continue;
    if (cru) {
      if (ch === '<' && html.slice(i + 2, i + 2 + cru.length).toLowerCase() === cru && html[i + 1] === '/') { cru = null; emTag = true; }
    } else if (emTag) {
      if (aspas) { if (ch === aspas) aspas = ''; }
      else if (ch === '"' || ch === "'") aspas = ch;
      else if (ch === '>') { emTag = false; if (abrindo) { cru = abrindo; abrindo = null; } }
    } else if (ch === '<' && /[a-zA-Z!/]/.test(html[i + 1] || '')) {
      emTag = true;
      const m = /^<([a-zA-Z]+)/.exec(html.slice(i, i + 12));
      abrindo = m && CRU.includes(m[1].toLowerCase()) ? m[1].toLowerCase() : null;
    }
    out += ch;
  }
  return out;
}
