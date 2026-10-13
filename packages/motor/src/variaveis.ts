// @nome, @nome_N ou @{nome_N} (chaves quando vem texto colado depois: @{parcelamento_1}x).
// Tudo que começa com @ é variável, exceto: e-mail (x@y), pacote npm (/@scope/), comentários,
// at-rules de CSS dentro de <style>/style="" e chaves de JSON-LD.

export const RX_VAR =
  /(?<![\w.@-])@(?:\{([A-Za-z][A-Za-z0-9_]*?)(?:_(\d+))?\}|([A-Za-z][A-Za-z0-9]*(?:_[A-Za-z][A-Za-z0-9]*)*)(?:_(\d+))?(?![\w]))/g;

const CSS_AT = new Set([
  'media', 'import', 'font', 'keyframes', 'supports', 'charset', 'page', 'namespace', 'container', 'layer',
  'property', 'counter', 'viewport', 'document', 'scope', 'starting', 'tailwind', 'apply', 'top', 'bottom', 'left', 'right',
]);
const LD_KEYS = new Set([
  'context', 'type', 'id', 'graph', 'vocab', 'language', 'list', 'set', 'value', 'base', 'reverse', 'index', 'container', 'nest', 'json',
]);

export type Faixa = [number, number];
export interface Zonas { com: Faixa[]; css: Faixa[]; ld: Faixa[] }

export function faixas(src: string, rx: RegExp): Faixa[] {
  const r: Faixa[] = [];
  rx.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src))) r.push([m.index, m.index + m[0].length]);
  return r;
}

export function zonas(src: string): Zonas {
  return {
    // comentários (<!-- -->, /* */) são explicação do designer: nunca viram variável
    com: faixas(src, /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g),
    css: faixas(src, /<style\b[\s\S]*?<\/style>|\sstyle\s*=\s*"[^"]*"/gi),
    ld: faixas(src, /<script[^>]*ld\+json[^>]*>[\s\S]*?<\/script>/gi),
  };
}

export const dentro = (rs: Faixa[], i: number): boolean => rs.some(([a, b]) => i >= a && i < b);

/** cdn…/npm/@scope/pacote não é variável (barra antes e depois) */
const pacote = (src: string, i: number, tok: string): boolean => src[i - 1] === '/' && src[i + tok.length] === '/';
/** @cidade_N escrito com N literal é documentação */
const documentacao = (base: string): boolean => /_n$/.test(base);

export function ehVar(src: string, z: Zonas, at: number, tok: string, base: string): boolean {
  return !(
    pacote(src, at, tok) ||
    documentacao(base) ||
    dentro(z.com, at) ||
    (CSS_AT.has(base) && dentro(z.css, at)) ||
    (LD_KEYS.has(base) && dentro(z.ld, at))
  );
}

export interface Achado { tok: string; base: string; num: number | null; ini: number }

/** Variáveis de um trecho de texto (sem marcadores de bloco), com a posição de cada uma. */
export function varsDoTexto(src: string): Achado[] {
  const z = zonas(src);
  const out: Achado[] = [];
  const rx = new RegExp(RX_VAR.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src))) {
    const base = (m[1] || m[3]).toLowerCase();
    const n = m[2] || m[4];
    if (ehVar(src, z, m.index, m[0], base)) out.push({ tok: m[0], base, num: n ? +n : null, ini: m.index });
  }
  return out;
}

/** Troca cada variável de um trecho pelo que `fn` devolver (null = deixa como está). */
export function trocarVars(src: string, fn: (base: string, num: number | null, tok: string) => string | null): string {
  const z = zonas(src);
  const rx = new RegExp(RX_VAR.source, 'g');
  return src.replace(rx, (tok: string, b1: string, n1: string, b2: string, n2: string, at: number) => {
    const base = (b1 || b2).toLowerCase();
    if (!ehVar(src, z, at, tok, base)) return tok;
    const n = n1 || n2;
    const r = fn(base, n ? +n : null, tok);
    return r == null ? tok : r;
  });
}

/** @img_<secao>_<nome>, @video_<secao>_<nome>, @media_<secao>_<nome> */
/** variável de arquivo do _media: imagem, vídeo, imagem ou vídeo, ou qualquer arquivo (PDF para link de download) */
export const ehMidia = (base: string): boolean => /^(img|video|media|arquivo)_[a-z0-9]+/.test(base);
