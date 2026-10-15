// /api/arquivos/<sha> direto na entrada do Worker (GitHub simulado)
import { describe, expect, it } from 'vitest';
import { servirArquivoRapido } from './arquivoRapido';

const SHA = 'a'.repeat(40);
const env = { GITHUB_TOKEN: 't', GITHUB_REPO: 'dono/repo' };
const github = (status = 200, extra: Record<string, string> = {}) => {
  const pedidos: { url: string; range: string | null }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, range: (init.headers as Record<string, string>).Range ?? null });
    return new Response(status === 404 ? 'x' : 'BYTES', { status, headers: { 'Content-Length': '5', ...extra } });
  }) as unknown as typeof fetch;
  return { f, pedidos };
};

describe('arquivo rápido', () => {
  it('repassa o arquivo do GitHub com o tipo pelo nome e CORS aberto, sem passar pelo Next', async () => {
    const g = github();
    const r = await servirArquivoRapido(new Request(`https://p.workers.dev/api/arquivos/${SHA}?n=foto.webp`), env, g.f);
    expect(r!.status).toBe(200);
    expect(await r!.text()).toBe('BYTES');
    expect(r!.headers.get('Content-Type')).toBe('image/webp');
    expect(r!.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(g.pedidos[0].url).toBe(`https://api.github.com/repos/dono/repo/git/blobs/${SHA}`);
  });

  it('trecho (vídeo): repassa o 206 do GitHub; sem 206, segue para a rota do Next', async () => {
    const pedido = () => new Request(`https://p.workers.dev/api/arquivos/${SHA}?n=v.mp4`, { headers: { Range: 'bytes=0-1' } });
    const ok = github(206, { 'Content-Range': 'bytes 0-1/10' });
    const r = await servirArquivoRapido(pedido(), env, ok.f);
    expect([r!.status, r!.headers.get('Content-Range'), ok.pedidos[0].range]).toEqual([206, 'bytes 0-1/10', 'bytes=0-1']);
    expect(await servirArquivoRapido(pedido(), env, github(200).f)).toBeNull();
    const tudo = await servirArquivoRapido(new Request(`https://p.workers.dev/api/arquivos/${SHA}?n=v.mp4`, { headers: { Range: 'bytes=0-' } }), env, github(200).f);
    expect(tudo!.status).toBe(200);
  });

  it('outros caminhos, erro do GitHub ou sem chave: segue para o Next', async () => {
    expect(await servirArquivoRapido(new Request('https://p.workers.dev/api/hotsites'), env, github().f)).toBeNull();
    expect(await servirArquivoRapido(new Request(`https://p.workers.dev/api/arquivos/${SHA}`), env, github(404).f)).toBeNull();
    expect(await servirArquivoRapido(new Request(`https://p.workers.dev/api/arquivos/${SHA}`), {}, github().f)).toBeNull();
  });
});
