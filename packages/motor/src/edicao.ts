// Edição na prévia: com marcarEdicao, cada valor de variável sai entre marcas invisíveis
// (variável e linha do cadastro). Depois de montar a página, as marcas viram <pub-v> onde o texto aparece
// na tela; dentro de tags (atributos) e de <title>, <style>, <script> e <textarea> ficam só o valor.

export const MARCA_INI = '';
export const MARCA_MEIO = '';
export const MARCA_FIM = '';

/** valor marcado: variável | linha (vazia = geral) */
export const marcar = (variavel: string, linha: string, valor: string) => MARCA_INI + variavel + '|' + linha + MARCA_MEIO + valor + MARCA_FIM;

const CRU = ['script', 'style', 'title', 'textarea'];
const atr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** troca as marcas por <pub-v data-v data-l> no texto visível e tira as marcas do resto */
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
      const [variavel, linha = ''] = html.slice(i + 1, m).split('|');
      const valor = html.slice(m + 1, f);
      out += emTag || cru ? valor : `<pub-v data-v="${atr(variavel)}" data-l="${atr(linha)}">${valor}</pub-v>`;
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
