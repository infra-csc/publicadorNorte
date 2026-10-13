// SEO e compartilhamento: <title>, meta description, favicon e as tags de redes sociais (Open Graph e Twitter).
// O que não foi preenchido sai automático: título e descrição do próprio HTML (ou o nome do evento e o primeiro
// parágrafo), compartilhamento copiando o SEO e a primeira foto da página.
import { esc } from './texto';

export interface TextosSeo {
  titulo?: string;
  descricao?: string;
}
export interface Seo extends TextosSeo {
  /** nome do evento (título automático quando o HTML não tem <title>) */
  nomeEvento?: string;
  /** ícone da aba (caminho na mídia) */
  favicon?: string;
  /** compartilhamento em redes sociais */
  share?: TextosSeo & { imagem?: string };
  /** páginas das cidades/etapas: título e descrição próprios (aceitam {cidade}, {etapa}, {evento}) */
  interna?: TextosSeo;
}
export interface ContextoSeo {
  cidade?: string;
  etapa?: string;
  /** endereço do site (https://dominio/): deixa og:image e og:url absolutos */
  urlSite?: string;
  /** arquivo da página (index.html, cotia.html) */
  arquivo?: string;
}

const LIMITE_DESCRICAO = 155;
const texto = (h: string) => h.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const desesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const atributo = (tag: string, nome: string) => {
  const m = new RegExp(`\\s${nome}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? desesc(m[1] ?? m[2] ?? m[3] ?? '') : undefined;
};
const metas = (html: string) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
const meta = (html: string, chave: 'name' | 'property', valor: string) => {
  const t = metas(html).find((m) => (atributo(m, chave) || '').toLowerCase() === valor);
  return t ? atributo(t, 'content') : undefined;
};

/** corta no fim de uma palavra, com reticências */
function resumir(s: string, max = LIMITE_DESCRICAO): string {
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const i = corte.lastIndexOf(' ');
  return corte.slice(0, i > max * 0.6 ? i : max).replace(/[\s,;:.–-]+$/, '') + '…';
}

/** o que a página tem hoje (para mostrar na tela e para os testes) */
export function lerSeo(html: string) {
  const cabeca = /<head\b[\s\S]*?<\/head>/i.exec(html)?.[0] || '';
  const icone = [...cabeca.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((l) => /(^|\s)icon(\s|$)/i.test(atributo(l, 'rel') || ''));
  const t = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(cabeca)?.[1];
  return {
    titulo: t != null ? desesc(t.trim()) : undefined,
    descricao: meta(cabeca, 'name', 'description'),
    ogTitulo: meta(cabeca, 'property', 'og:title'),
    ogDescricao: meta(cabeca, 'property', 'og:description'),
    ogImagem: meta(cabeca, 'property', 'og:image'),
    favicon: icone ? atributo(icone, 'href') : undefined,
  };
}

/** primeira foto da página (jpg/png/webp/avif/gif; svg costuma ser logo) */
function primeiraFoto(html: string): string | undefined {
  const corpo = /<body\b[\s\S]*$/i.exec(html)?.[0] || html;
  for (const m of corpo.matchAll(/<img\b[^>]*>/gi)) {
    const src = atributo(m[0], 'src');
    if (src && /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i.test(src) && !/^data:/i.test(src)) return src;
  }
  return undefined;
}

/** primeiro parágrafo com texto de verdade */
function primeiroParagrafo(html: string): string | undefined {
  const corpo = /<body\b[\s\S]*$/i.exec(html)?.[0] || html;
  for (const m of corpo.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = texto(m[1]);
    if (t.length >= 40) return t;
  }
  return undefined;
}

const absoluto = (url: string | undefined, base: string | undefined) => {
  if (!url || !base || /^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return url;
  return base.replace(/\/?$/, '/') + url.replace(/^\.?\//, '');
};
const tipoIcone = (href: string) => (/\.svg$/i.test(href) ? 'image/svg+xml' : /\.png$/i.test(href) ? 'image/png' : /\.ico$/i.test(href) ? 'image/x-icon' : undefined);

/**
 * Põe na página o título, a descrição, o favicon e as tags de compartilhamento.
 * Tira as que o HTML já tinha (para não duplicar) e coloca as finais no fim do <head>.
 */
export function aplicarSeo(html: string, seo: Seo, ctx: ContextoSeo): string {
  const interna = !!(ctx.cidade || ctx.etapa);
  const troca = (s: string | undefined) =>
    (s || '').replace(/\{cidade\}/gi, ctx.cidade || '').replace(/\{etapa\}/gi, ctx.etapa || '').replace(/\{evento\}/gi, seo.nomeEvento || '').replace(/\s+/g, ' ').trim();
  const doHtml = lerSeo(html);
  const nomePagina = [seo.nomeEvento, ctx.cidade, ctx.etapa].filter(Boolean).join(' · ');
  const proprio = interna ? seo.interna : seo;
  const titulo = troca(proprio?.titulo) || doHtml.titulo || nomePagina || '';
  const descricao = troca(proprio?.descricao) || doHtml.descricao || resumir(primeiroParagrafo(html) || '');
  const ogTitulo = troca(seo.share?.titulo) && !interna ? troca(seo.share?.titulo) : titulo;
  const ogDescricao = (troca(seo.share?.descricao) && !interna ? troca(seo.share?.descricao) : '') || descricao;
  const imagem = seo.share?.imagem || doHtml.ogImagem || primeiraFoto(html);
  const base = ctx.urlSite;
  const url = base ? base.replace(/\/?$/, '/') + (ctx.arquivo && ctx.arquivo !== 'index.html' ? ctx.arquivo : '') : undefined;

  // tira o que vai ser recolocado
  let h = html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\b[^>]*>\s*/gi, (m) => {
      const n = (atributo(m, 'name') || '').toLowerCase();
      const p = (atributo(m, 'property') || '').toLowerCase();
      return n === 'description' || n.startsWith('twitter:') || p.startsWith('og:') ? '' : m;
    });
  if (seo.favicon) h = h.replace(/<link\b[^>]*>\s*/gi, (l) => (/(^|\s)(icon|apple-touch-icon)(\s|$)/i.test(atributo(l, 'rel') || '') ? '' : l));

  const tags = [
    titulo && `<title>${esc(titulo)}</title>`,
    descricao && `<meta name="description" content="${esc(descricao)}">`,
    seo.favicon && `<link rel="icon" href="${esc(seo.favicon)}"${tipoIcone(seo.favicon) ? ` type="${tipoIcone(seo.favicon)}"` : ''}>`,
    seo.favicon && /\.(png|jpe?g)$/i.test(seo.favicon) && `<link rel="apple-touch-icon" href="${esc(seo.favicon)}">`,
    `<meta property="og:type" content="website">`,
    ogTitulo && `<meta property="og:title" content="${esc(ogTitulo)}">`,
    ogDescricao && `<meta property="og:description" content="${esc(ogDescricao)}">`,
    imagem && `<meta property="og:image" content="${esc(absoluto(imagem, base))}">`,
    // o arquivo da imagem vai para o site (o og:image absoluto não é lido como caminho)
    imagem && !/^(https?:)?\/\//i.test(imagem) && `<link rel="image_src" href="${esc(imagem)}">`,
    url && `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="${imagem ? 'summary_large_image' : 'summary'}">`,
    ogTitulo && `<meta name="twitter:title" content="${esc(ogTitulo)}">`,
    ogDescricao && `<meta name="twitter:description" content="${esc(ogDescricao)}">`,
    imagem && `<meta name="twitter:image" content="${esc(absoluto(imagem, base))}">`,
  ].filter(Boolean).join('\n');
  if (/<\/head\s*>/i.test(h)) return h.replace(/<\/head\s*>/i, tags + '\n</head>');
  if (/<head\b[^>]*>/i.test(h)) return h.replace(/<head\b[^>]*>/i, (m) => m + tags);
  return `<head>${tags}</head>` + h;
}
