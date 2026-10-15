// Texto formatado no cadastro: negrito, itálico, sublinhado, quebra de linha e trechos com cor, tamanho,
// espaçamento ou maiúsculas. O valor fica guardado como HTML limpo; qualquer outra tag sai (o texto fica).
// Também: links que abrem em nova aba e o que vai no HTML para ocultar e mover blocos de texto.

const TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'br', 'span']);
/** propriedades de estilo aceitas num <span> (valores simples: sem url(), sem ";") */
const PROPS = new Set(['color', 'background-color', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'line-height', 'text-transform', 'text-decoration']);
const VALOR_OK = /^[#\w\s.,%()+-]+$/;

/** o valor tem formatação (alguma tag do editor)? Texto comum com "<" (ex.: "<3") não conta. */
export const ehRico = (v: unknown): boolean => /<\/?(b|strong|i|em|u|s|br|span|div|p|font)\b[^<>]*>/i.test(String(v ?? ''));

const escTexto = (s: string) => s.replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z]+\d*);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function estiloLimpo(st: string): string {
  const out: string[] = [];
  for (const parte of st.split(';')) {
    const i = parte.indexOf(':');
    if (i < 0) continue;
    const p = parte.slice(0, i).trim().toLowerCase();
    const v = parte.slice(i + 1).trim();
    if (PROPS.has(p) && v && VALOR_OK.test(v) && !/url|expression/i.test(v)) out.push(`${p}:${v}`);
  }
  return out.join(';');
}

const atributo = (tag: string, nome: string) => {
  const m = new RegExp(`\\b${nome}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : '';
};

/**
 * HTML limpo do texto formatado: só as tags aceitas, fechadas na ordem; <div>/<p> (do editor) viram quebra de linha;
 * <font color> vira <span style="color">. O resto do texto fica, escapado.
 */
export function limparRico(html: string): string {
  let out = '';
  const pilha: string[] = [];
  let fim = 0;
  const rx = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/g;
  let m: RegExpExecArray | null;
  const fechar = (t: string) => {
    const k = pilha.lastIndexOf(t);
    if (k < 0) return;
    while (pilha.length > k) out += `</${pilha.pop()}>`;
  };
  while ((m = rx.exec(html))) {
    out += escTexto(html.slice(fim, m.index));
    fim = rx.lastIndex;
    const tag = m[0];
    const nome = m[1].toLowerCase();
    const fecha = tag.startsWith('</');
    if (nome === 'div' || nome === 'p') { if (fecha && out && !out.endsWith('<br>')) out += '<br>'; continue; }
    if (nome === 'font') {
      if (fecha) { fechar('span'); continue; }
      const cor = atributo(tag, 'color');
      const st = estiloLimpo(cor ? `color:${cor}` : '');
      out += st ? `<span style="${st}">` : '<span>';
      pilha.push('span');
      continue;
    }
    if (!TAGS.has(nome)) continue;
    if (nome === 'br') { out += '<br>'; continue; }
    if (fecha) { fechar(nome); continue; }
    if (nome === 'span') {
      const st = estiloLimpo(atributo(tag, 'style'));
      const cl = atributo(tag, 'class').split(/\s+/).filter((c) => /^[\w-]+$/.test(c)).join(' ');
      out += `<span${cl ? ` class="${cl}"` : ''}${st ? ` style="${st.replace(/"/g, '')}"` : ''}>`;
    } else out += `<${nome}>`;
    pilha.push(nome);
  }
  out += escTexto(html.slice(fim));
  while (pilha.length) out += `</${pilha.pop()}>`;
  return out.replace(/(<br>)+$/, '').replace(/<span>([^<]*)<\/span>/g, '$1');
}

/** texto puro do texto formatado (para atributos, <title> e scripts): quebra de linha vira espaço */
export const textoDoRico = (html: string): string => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');

/** um endereço que sai do site (abre em nova aba): http(s):// e //; âncoras (#…) e páginas do próprio site, não */
export const ehLinkExterno = (href: string): boolean => /^\s*(https?:)?\/\//i.test(href);

/** variáveis usadas no href de algum <a> dos modelos (campos de link: têm a opção "abrir em nova aba") */
export function varsDeLink(modelos: Partial<Record<string, string | null | undefined>>): Set<string> {
  const out = new Set<string>();
  for (const h of Object.values(modelos)) {
    for (const m of String(h || '').matchAll(/<a\b[^<>]*>/gi)) {
      for (const v of atributo(m[0], 'href').matchAll(/@\{?([a-z][a-z0-9_]*?)(?:_\d+)?\}?(?![a-z0-9_])/gi)) out.add(v[1].toLowerCase());
    }
  }
  return out;
}

/** marca os <a href="…@variavel…"> do modelo com a variável do link (para a opção "abrir em nova aba" de cada campo) */
export function anotarLinks(html: string): string {
  return html.replace(/<a\b[^<>]*>/gi, (tag) => {
    if (/\bdata-pub-aba=/.test(tag)) return tag;
    const href = atributo(tag, 'href');
    const v = /@\{?([a-z][a-z0-9_]*?)(?:_\d+)?\}?(?![a-z0-9_])/i.exec(href);
    return v ? tag.replace(/^<a\b/i, `<a data-pub-aba="${v[1].toLowerCase()}"`) : tag;
  });
}

/**
 * Links que saem do site abrem em nova aba (target="_blank" rel="noopener"); âncoras e páginas do site, não.
 * O link que vem de um campo segue a opção do campo (`novaAba: false` = mesma aba).
 */
export function ajustarLinks(html: string, novaAba: (variavel: string) => boolean): string {
  return html.replace(/<a\b[^<>]*>/gi, (tag) => {
    const v = /\bdata-pub-aba="([^"]*)"/.exec(tag)?.[1];
    let t = tag.replace(/\s*data-pub-aba="[^"]*"/, '');
    const externo = ehLinkExterno(atributo(t, 'href'));
    const nova = externo && (v ? novaAba(v) : true);
    if (nova) {
      if (!/\btarget\s*=/i.test(t)) t = t.replace(/>$/, ' target="_blank">');
      if (!/\brel\s*=/i.test(t)) t = t.replace(/>$/, ' rel="noopener">');
      else if (!/\bnoopener\b/i.test(atributo(t, 'rel'))) t = t.replace(/\brel\s*=\s*"([^"]*)"/i, 'rel="$1 noopener"');
    } else if (v) t = t.replace(/\s*\btarget\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, '');
    return t;
  });
}

/** blocos ocultos ou movidos pelo cadastro: o marcador <pub-o> fica dentro do bloco (o elemento em volta do texto); mover pula os blocos ocultos */
export const CSS_BLOCOS = '<style id="pub-blocos">pub-o{display:none}*:has(> pub-o[data-bloco]){display:none!important}</style>';
export const JS_MOVER = '<script id="pub-mover">(function(){document.querySelectorAll("pub-o[data-mover]").forEach(function(m){var el=m.parentElement,n=+m.getAttribute("data-mover");if(!el||!el.parentElement||!n)return;var a=el;for(var i=0;i<Math.abs(n);i++){var s=n<0?a.previousElementSibling:a.nextElementSibling;while(s&&getComputedStyle(s).display==="none")s=n<0?s.previousElementSibling:s.nextElementSibling;if(!s)break;a=s}if(a===el)return;if(n<0)a.before(el);else a.after(el)})})()</script>';

/** coloca o CSS e o script dos blocos na página, se ela usar */
export function colocarBlocos(html: string): string {
  if (!html.includes('<pub-o')) return html;
  let h = html;
  if (!h.includes('id="pub-blocos"')) h = /<\/head>/i.test(h) ? h.replace(/<\/head>/i, CSS_BLOCOS + '</head>') : CSS_BLOCOS + h;
  if (h.includes('data-mover=') && !h.includes('id="pub-mover"')) h = /<\/body>/i.test(h) ? h.replace(/<\/body>(?![\s\S]*<\/body>)/i, JS_MOVER + '</body>') : h + JS_MOVER;
  return h;
}
