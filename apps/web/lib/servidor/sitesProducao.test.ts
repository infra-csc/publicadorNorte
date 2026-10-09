import { beforeEach, describe, expect, it } from 'vitest';
import { normalizarDominio } from '../comum/dominios';
import { esquecerIndice, servirProducao } from './sitesProducao';

const indice = { sites: {
  'cuidar.com.br': { slug: 'cuidar', commit: 'abc123', versao: 3, principal: 'cuidar.com.br' },
  'www.cuidar.com.br': { slug: 'cuidar', commit: 'abc123', versao: 3, principal: 'cuidar.com.br' },
} };
const arquivos: Record<string, string> = {
  'cuidar/index.html': '<h1>home</h1>',
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
    expect(await r.text()).toBe('<h1>home</h1>');
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
    expect(await (await get('https://cuidar.com.br/cotia/'))!.text()).toBe('<h1>cotia</h1>');
  });

  it('domínio sem site, página inexistente e caminho com ..', async () => {
    expect((await get('https://outro.com.br/'))!.status).toBe(404);
    expect((await get('https://cuidar.com.br/nada.html'))!.status).toBe(404);
    expect((await get('https://cuidar.com.br/a%2F..%2F..%2Fsegredo'))!.status).toBe(400);
    const post = await servirProducao(new Request('https://cuidar.com.br/', { method: 'POST' }), env, buscar);
    expect(post!.status).toBe(405);
  });

  it('normaliza o domínio digitado', () => {
    expect(normalizarDominio(' https://WWW.Cuidar.com.br/pagina ')).toBe('www.cuidar.com.br');
    expect(normalizarDominio('cuidar')).toBeNull();
    expect(normalizarDominio('x.workers.dev')).toBeNull();
    expect(normalizarDominio('renanprates.github.io')).toBeNull();
  });
});
