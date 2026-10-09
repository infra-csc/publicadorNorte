// Módulo de imagem (passo Seções): uma faixa com uma imagem (PNG/JPG do _media, ou SVG embutido), com cor de fundo,
// largura e espaço em volta. Entra na página como uma <section id="pub-img-…"> de primeiro nível, então a ordem
// (arrastar) e o esconder (no evento e por cidade) funcionam como nas seções do HTML.
import { blocos } from './secoes';
import { esc } from './texto';

export interface ModuloImagem {
  /** id da <section> (começa com "pub-img-") */
  id: string;
  /** nome do arquivo, para a tela */
  nome?: string;
  /** PNG/JPG: caminho na mídia do evento (ex.: _media/modulos/faixa.png) */
  arquivo?: string;
  /** SVG: o código, já limpo (vai embutido na página) */
  svg?: string;
  /** SVG: uma cor só para o desenho todo ('' = as cores originais) */
  cor?: string;
  /** cor de fundo da faixa ('' = sem fundo) */
  fundo?: string;
  /** largura da imagem em % da largura do conteúdo (10 a 100); no celular ela cresce até 1,6× (sem passar de 100%) */
  largura: number;
  /** espaço acima e abaixo */
  espaco?: 'nenhum' | 'p' | 'm' | 'g';
  /** texto alternativo */
  alt?: string;
}

export const PREFIXO_MODULO = 'pub-img-';
export const ehModulo = (id: string) => id.startsWith(PREFIXO_MODULO);

const ESPACO: Record<string, string> = { nenhum: '0px', p: 'clamp(12px,3vw,24px)', m: 'clamp(24px,5vw,56px)', g: 'clamp(40px,8vw,96px)' };
const cor = (c: unknown) => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.trim()) ? c.trim() : '');
const idOk = (id: string) => /^pub-img-[\w-]{1,40}$/.test(id);

const CSS =
  '<style id="pub-modulo-css">' +
  'section.pub-modulo{display:block;margin:0;min-height:0;height:auto;padding:var(--pub-esp,0px) 16px;background:var(--pub-fundo,transparent)}' +
  '.pub-modulo__in{max-width:1200px;margin:0 auto;display:flex;justify-content:center}' +
  '.pub-modulo__img{display:block;width:var(--pub-larg,100%);max-width:100%;height:auto}' +
  '.pub-modulo__img svg{display:block;width:100%;height:auto}' +
  '@media (max-width:640px){.pub-modulo__img{width:min(100%,calc(var(--pub-larg,100%) * 1.6))}}' +
  '</style>';

/**
 * SVG enviado → código seguro para embutir: sem script, foreignObject, on…= e javascript: (imagens data: dentro do SVG ficam); só o <svg>;
 * largura/altura fixas viram viewBox (a largura passa a ser a do módulo).
 */
export function limparSvg(svg: string): string {
  let s = String(svg || '')
    .replace(/<\?xml[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->/gi, '')
    .replace(/<script\b[\s\S]*?<\/script\s*>|<script\b[^>]*\/>/gi, '')
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/((?:xlink:)?href\s*=\s*["'])\s*javascript:[^"']*/gi, '$1#');
  const m = /<svg\b[\s\S]*<\/svg\s*>/i.exec(s);
  if (!m) return '';
  s = m[0];
  const abre = /^<svg\b[^>]*>/i.exec(s)![0];
  const num = (n: string) => Number((new RegExp(`\\s${n}\\s*=\\s*["']?([\\d.]+)`, 'i').exec(abre) || [])[1]);
  let nova = abre.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  if (!/\sviewBox\s*=/i.test(abre) && num('width') > 0 && num('height') > 0) nova = nova.replace(/^<svg\b/i, `<svg viewBox="0 0 ${num('width')} ${num('height')}"`);
  return nova + s.slice(abre.length);
}

/** uma cor só: fill/stroke (atributo e style) viram currentColor, menos none/transparent/url(…) */
export function pintar(svg: string): string {
  const troca = (v: string) => (/^\s*(none|transparent|url\()/i.test(v) ? v : 'currentColor');
  let s = svg
    .replace(/\s(fill|stroke)\s*=\s*"([^"]*)"/gi, (_, a, v) => ` ${a}="${troca(v)}"`)
    .replace(/\s(fill|stroke)\s*=\s*'([^']*)'/gi, (_, a, v) => ` ${a}="${troca(v)}"`)
    .replace(/\b(fill|stroke)\s*:\s*([^;"'}]+)/gi, (_, a, v) => `${a}:${troca(v)}`);
  // o que não tem fill herda do <svg>
  s = s.replace(/^<svg\b([^>]*)>/i, (t, at) => (/\sfill\s*=/i.test(at) ? t : `<svg${at} fill="currentColor">`));
  return s;
}

/** HTML de um módulo */
export function htmlModulo(m: ModuloImagem): string {
  if (!idOk(m.id)) return '';
  const larg = Math.max(10, Math.min(100, Math.round(Number(m.largura) || 100)));
  const vars = [`--pub-larg:${larg}%`, `--pub-esp:${ESPACO[m.espaco || 'm'] ?? ESPACO.m}`];
  const f = cor(m.fundo);
  if (f) vars.push(`--pub-fundo:${f}`);
  const rotulo = 'Imagem' + (m.nome ? ': ' + m.nome : '');
  let miolo = '';
  if (m.svg) {
    const c = cor(m.cor);
    const svg = c ? pintar(m.svg) : m.svg;
    miolo = `<div class="pub-modulo__img" role="img" aria-label="${esc(m.alt || '')}"${c ? ` style="color:${c}"` : ''}>${svg}</div>`;
  } else if (m.arquivo) {
    miolo = `<img class="pub-modulo__img" src="${esc(m.arquivo)}" alt="${esc(m.alt || '')}" loading="lazy">`;
  }
  return `<section id="${m.id}" class="pub-modulo" aria-label="${esc(rotulo)}" data-pub-modulo style="${vars.join(';')}"><div class="pub-modulo__in">${miolo}</div></section>`;
}

/**
 * Põe os módulos na página, logo depois da última <section> de primeiro nível (sem seções: antes do </body>).
 * Depois disso, a ordem salva coloca cada um no lugar escolhido.
 */
export function colocarModulos(html: string, modulos: ModuloImagem[] | undefined): string {
  const ms = (modulos || []).map(htmlModulo).filter(Boolean);
  if (!ms.length) return html;
  const trecho = CSS + ms.join('');
  const bs = blocos(html);
  if (bs.length) {
    const ult = bs[bs.length - 1].fim;
    return html.slice(0, ult) + trecho + html.slice(ult);
  }
  const corpo = html.search(/<\/body\s*>/i);
  return corpo >= 0 ? html.slice(0, corpo) + trecho + html.slice(corpo) : html + trecho;
}
