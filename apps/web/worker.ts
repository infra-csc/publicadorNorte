// Entrada do Worker na Cloudflare: domínios dos sites em produção são servidos aqui (sem passar pelo
// painel); os arquivos da prévia (/api/arquivos) vão direto do GitHub; o resto (publicador) vai para o Next.js gerado pelo OpenNext.
// O cron (wrangler.jsonc → triggers) roda a automação a cada 5 minutos (agendamentos e status "realizado").
// @ts-ignore: .open-next/worker.js só existe depois do build (pnpm cf:build)
import { default as next } from './.open-next/worker.js';
import { chaveAutomacao } from './lib/servidor/automacaoChave';
import { servirArquivoRapido } from './lib/servidor/arquivoRapido';
import { servirProducao, type AmbienteSites } from './lib/servidor/sitesProducao';

type Ambiente = AmbienteSites & { AUTOMACAO_TOKEN?: string };
type Contexto = { waitUntil(p: Promise<unknown>): void };

export default {
  async fetch(req: Request, env: Ambiente, ctx: Contexto) {
    // imagens e vídeos da prévia vão direto do GitHub (quase sem CPU); sites em produção; o resto, o Next
    return (await servirProducao(req, env)) ?? (await servirArquivoRapido(req, env)) ?? next.fetch(req, env, ctx);
  },
  async scheduled(_evento: unknown, env: Ambiente, ctx: Contexto) {
    const chave = await chaveAutomacao(env);
    if (!chave) return console.error('Automação: falta GITHUB_TOKEN');
    const req = new Request('https://publicador-norte.workers.dev/api/automacao', { method: 'POST', headers: { Authorization: `Bearer ${chave}` } });
    ctx.waitUntil(
      Promise.resolve(next.fetch(req, env, ctx)).then(async (r: Response) => console.log('Automação:', r.status, await r.text())),
    );
  },
};

// @ts-ignore: classes que o OpenNext exporta (cache), quando usadas
export * from './.open-next/worker.js';
