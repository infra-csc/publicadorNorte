import { beforeEach, describe, expect, it } from 'vitest';
import { normalizarDominio } from '../comum/dominios';
import { esquecerIndice, servirProducao } from './sitesProducao';

const indice = { sites: {
  'cuidar.com.br': { slug: 'cuidar', commit: 'abc123', versao: 3, principal: 'cuidar.com.br' },
  'www.cuidar.com.br': { slug: 'cuidar', commit: 'abc123', versao: 3, principal: 'cuidar.com.br' },
} };
const arquivos: Record<string, string> = {
  'cuidar/index.html': '<html><head><meta name="robots" content="noindex" data-pub-teste><title>h</title></head><body><h1>home</h1></body></html>',
  'cuidar/rio.html': '<html><head><meta name="robots" content="noindex"><title>em breve</title></head><body></body></html>',
  'cuidar/_pub/paginas.json': JSON.stringify({ em: '2026-10-13T10:00:00Z', paginas: [{ arquivo: 'index.html' }, { arquivo: 'cotia/index.html' }] }),
  'cuidar/cotia/index.html': '<h1>cotia</h1>',
  'cuidar/_media/a.webp': 'img',
};
const pedidos: string[] = [];
const buscar = (async (u: string) => {
  pedidos.push(u);
  if (u.includes('api.github.com')) return new Response(JSON.stringify(indice), { status: 200 });
  const m = u.match(/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/abc123\/(.+)$/);
  const p = m && decodeURIComponent(m[1]);
  return p && arquivos[p] != null ? new Response(arquivos[p]) : new Response('404', { status: 404 });
}) as unknown as typeof fetch;
const env = { GITHUB_REPO: 'RenanPrates/publicadorNorte' };
const get = (url: string) => servirProducao(new Request(url), env, buscar);

describe('sites em produção', () => {
  beforeEach(() => { esquecerIndice(); pedidos.length = 0; });

  it('o painel (workers.dev, localhost) segue para o Next', async () => {
    expect(await get('https://publicador-norte.infraestrutura-685.workers.dev/')).toBeNull();
    expect(await get('http://localhost:3000/eventos')).toBeNull();
    expect(pedidos).toEqual([]);
  });

  it('domínio principal serve a pasta do evento no commit da versão', async () => {
    const r = (await get('https://cuidar.com.br/'))!;
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/html');
    const h = await r.text();
    expect(h).toContain('<h1>home</h1>');
    const img = (await get('https://cuidar.com.br/_media/a.webp'))!;
    expect(img.headers.get('content-type')).toBe('image/webp');
  });

  it('www leva para o principal; pasta sem barra ganha a barra', async () => {
    const r = (await get('https://www.cuidar.com.br/cotia/?x=1'))!;
    expect(r.status).toBe(301);
    expect(r.headers.get('location')).toBe('https://cuidar.com.br/cotia/?x=1');
    const s = (await get('https://cuidar.com.br/cotia'))!;
    expect(s.status).toBe(301);
    expect(s.headers.get('location')).toBe('https://cuidar.com.br/cotia/');
    expect(await (await get('https://cuidar.com.br/cotia/'))!.text()).toContain('<h1>cotia</h1>');
  });

  it('domínio sem site, página inexistente e caminho com ..', async () => {
    expect((await get('https://outro.com.br/'))!.status).toBe(404);
    expect((await get('https://cuidar.com.br/nada.html'))!.status).toBe(404);
    expect((await get('https://cuidar.com.br/a%2F..%2F..%2Fsegredo'))!.status).toBe(400);
    const post = await servirProducao(new Request('https://cuidar.com.br/', { method: 'POST' }), env, buscar);
    expect(post!.status).toBe(405);
  });

  it('Google: na produção sai o noindex do teste e entra o canonical; em breve continua noindex; robots e sitemap automáticos', async () => {
    const h = await (await get('https://cuidar.com.br/'))!.text();
    expect(h).not.toContain('data-pub-teste');
    expect(h).toContain('<link rel="canonical" href="https://cuidar.com.br/">');
    const rio = await (await get('https://cuidar.com.br/rio.html'))!.text();
    expect(rio).toContain('content="noindex"');
    expect(rio).not.toContain('canonical');
    const robots = await (await get('https://cuidar.com.br/robots.txt'))!.text();
    expect(robots).toContain('Sitemap: https://cuidar.com.br/sitemap.xml');
    const sm = (await get('https://cuidar.com.br/sitemap.xml'))!;
    expect(sm.headers.get('content-type')).toContain('xml');
    const x = await sm.text();
    expect(x).toContain('<loc>https://cuidar.com.br/</loc>');
    expect(x).toContain('<loc>https://cuidar.com.br/cotia/</loc>');
    expect(x).toContain('<lastmod>2026-10-13</lastmod>');
  });

    it('normaliza o domínio digitado', () => {
    expect(normalizarDominio(' https://WWW.Cuidar.com.br/pagina ')).toBe('www.cuidar.com.br');
    expect(normalizarDominio('cuidar')).toBeNull();
    expect(normalizarDominio('x.workers.dev')).toBeNull();
    expect(normalizarDominio('renanprates.github.io')).toBeNull();
  });
});

describe('publicação: marca de teste', () => {
  it('a página publicada no teste leva noindex (uma vez só)', async () => {
    const { marcarTeste } = await import('../comum/indexacao');
    const h = marcarTeste(marcarTeste('<html><head><title>x</title></head></html>'));
    expect(h.match(/data-pub-teste/g)).toHaveLength(1);
    expect(h).toContain('<head><meta name="robots" content="noindex" data-pub-teste>');
  });
});
