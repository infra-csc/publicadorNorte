// Google: o endereço de teste (GitHub Pages) não é indexado; a produção é.
// Os dois servem os mesmos arquivos (a produção usa o commit do teste), então a publicação marca cada página
// com um "noindex" de teste, e o Worker da produção tira essa marca ao servir, põe o canonical e gera
// robots.txt e sitemap.xml a partir da lista de páginas abertas (_pub/paginas.json).

export const ARQ_PAGINAS = '_pub/paginas.json';
const MARCA = '<meta name="robots" content="noindex" data-pub-teste>';

/** publicação: a página não é indexada no endereço de teste */
export function marcarTeste(html: string): string {
  if (html.includes(MARCA)) return html;
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (m) => m + MARCA) : MARCA + html;
}

/** produção: tira a marca do teste e põe o endereço oficial da página */
export function paraProducao(html: string, url: string): string {
  let h = html.split(MARCA).join('');
  if (!/<link\b[^>]*rel=["']?canonical/i.test(h) && !/<meta\b[^>]*name=["']?robots["']?[^>]*noindex/i.test(h)) {
    const tag = `<link rel="canonical" href="${url.replace(/"/g, '%22')}">`;
    h = /<\/head\s*>/i.test(h) ? h.replace(/<\/head\s*>/i, tag + '</head>') : tag + h;
  }
  return h;
}

/** endereço público de uma página (index.html = a raiz) */
export const urlDaPagina = (host: string, arquivo: string) => `https://${host}/${arquivo === 'index.html' ? '' : arquivo.replace(/(^|\/)index\.html$/, '$1')}`;

export function robotsTxt(host: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: https://${host}/sitemap.xml\n`;
}

export function sitemapXml(host: string, paginas: { arquivo: string }[], em?: string): string {
  const data = em ? `<lastmod>${em.slice(0, 10)}</lastmod>` : '';
  const urls = paginas.map((p) => `  <url><loc>${urlDaPagina(host, p.arquivo).replace(/&/g, '&amp;')}</loc>${data}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
