// SEO e compartilhamento: <title>, meta description, favicon e as tags de redes sociais (Open Graph e Twitter).
// Página principal: o que não foi preenchido sai automático (título e descrição do próprio HTML, ou o nome do evento
// e o primeiro parágrafo; compartilhamento copiando o SEO e a primeira foto da página).
// Cidades/etapas: cada uma tem o seu cadastro; o que ficar vazio herda da principal, com o nome da cidade na frente
// do título.
import { esc } from './texto';

export interface TextosSeo {
  titulo?: string;
  descricao?: string;
}
/** cadastro de SEO de uma página */
export interface SeoPagina extends TextosSeo {
  /** ícone da aba (caminho na mídia) */
  favicon?: string;
  /** compartilhamento em redes sociais */
  share?: TextosSeo & { imagem?: string };
}
export interface Seo extends SeoPagina {
  /** nome do evento (título automático quando o HTML não tem <title>) */
  nomeEvento?: string;
  /** cidades e etapas (pelo _id): o que ficar vazio herda da principal */
  porPagina?: Record<string, SeoPagina>;
}
/** valores finais de uma página (os da principal são herdados pelas cidades) */
export interface ValoresSeo {
  titulo: string;
  descricao: string;
  ogTitulo: string;
  ogDescricao: string;
  /** caminho como está na mídia (antes de virar endereço completo) */
  imagem?: string;
  favicon?: string;
}
export interface ContextoSeo {
  cidade?: string;
  etapa?: string;
  /** cidade/etapa: o _id da linha (cadastro próprio em seo.porPagina) */
  linha?: string;
  /** valores da página principal (as cidades herdam) */
  herdado?: ValoresSeo;
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

/** valores finais da página: o preenchido; senão o herdado da principal (cidades); senão o automático */
export function resolverSeo(html: string, seo: Seo, ctx: ContextoSeo): ValoresSeo {
  const troca = (v: string | undefined) =>
    (v || '').replace(/\{cidade\}/gi, ctx.cidade || '').replace(/\{etapa\}/gi, ctx.etapa || '').replace(/\{evento\}/gi, seo.nomeEvento || '').replace(/\s+/g, ' ').trim();
  const doHtml = lerSeo(html);
  const nome = [ctx.cidade, ctx.etapa].filter(Boolean).join(' · ');
  const interna = !!nome;
  const p: SeoPagina = interna ? seo.porPagina?.[ctx.linha || ''] || {} : seo;
  const h = interna ? ctx.herdado : undefined;
  const naFrente = (t: string | undefined) => (t ? (nome ? `${nome} - ${t}` : t) : nome);
  const titulo = troca(p.titulo) || (h ? naFrente(h.titulo) : doHtml.titulo || [seo.nomeEvento, nome].filter(Boolean).join(' · ')) || '';
  const descricao = troca(p.descricao) || (h ? h.descricao : '') || doHtml.descricao || resumir(primeiroParagrafo(html) || '');
  const ogTitulo = troca(p.share?.titulo) || (h ? (troca(p.titulo) ? titulo : naFrente(h.ogTitulo)) : titulo);
  const ogDescricao = troca(p.share?.descricao) || (h && !troca(p.descricao) ? h.ogDescricao : '') || descricao;
  const imagem = p.share?.imagem || h?.imagem || (h ? undefined : doHtml.ogImagem) || primeiraFoto(html);
  const favicon = p.favicon || h?.favicon || doHtml.favicon;
  return { titulo, descricao, ogTitulo, ogDescricao, imagem, favicon };
}

/**
 * Põe na página o título, a descrição, o favicon e as tags de compartilhamento.
 * Tira as que o HTML já tinha (para não duplicar) e coloca as finais no fim do <head>.
 */
export function aplicarSeo(html: string, seo: Seo, ctx: ContextoSeo, valores = resolverSeo(html, seo, ctx)): string {
  const { titulo, descricao, ogTitulo, ogDescricao, imagem, favicon } = valores;
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
  if (favicon) h = h.replace(/<link\b[^>]*>\s*/gi, (l) => (/(^|\s)(icon|apple-touch-icon)(\s|$)/i.test(atributo(l, 'rel') || '') ? '' : l));

  const tags = [
    titulo && `<title>${esc(titulo)}</title>`,
    descricao && `<meta name="description" content="${esc(descricao)}">`,
    favicon && `<link rel="icon" href="${esc(favicon)}"${tipoIcone(favicon) ? ` type="${tipoIcone(favicon)}"` : ''}>`,
    favicon && /\.(png|jpe?g)$/i.test(favicon) && `<link rel="apple-touch-icon" href="${esc(favicon)}">`,
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
