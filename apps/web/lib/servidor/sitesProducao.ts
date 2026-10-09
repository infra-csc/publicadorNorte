// Entrega os sites em produção: cada domínio próprio aponta para o Worker do publicador,
// que acha o evento pelo domínio (índice producao/sites.json no branch de dados) e serve
// a pasta do evento no commit da versão escolhida (o mesmo conteúdo já publicado no teste).
// Roda antes do Next (worker.ts): um domínio de site nunca abre o painel.
import { hostDoPublicador } from '../comum/dominios';
import type { IndiceProducao } from '../comum/tipos';

export interface AmbienteSites {
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH_DADOS?: string;
  /** outros endereços do painel além de *.workers.dev e localhost (separados por vírgula) */
  PUBLICADOR_HOSTS?: string;
}

export const ARQ_INDICE = 'producao/sites.json';
const VALIDADE_INDICE = 30_000;

const TIPOS: Record<string, string> = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8', json: 'application/json', txt: 'text/plain; charset=utf-8', xml: 'application/xml', svg: 'image/svg+xml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', pdf: 'application/pdf',
};
const extensao = (p: string) => (p.split('/').pop() || '').match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() || '';

let indiceGuardado: { em: number; valor: IndiceProducao } | null = null;

/** índice domínio → evento (guardado por 30 s em cada instância do Worker) */
export async function lerIndice(env: AmbienteSites, agora = Date.now(), buscar: typeof fetch = fetch): Promise<IndiceProducao> {
  if (indiceGuardado && agora - indiceGuardado.em < VALIDADE_INDICE) return indiceGuardado.valor;
  const repo = env.GITHUB_REPO || 'RenanPrates/publicadorNorte';
  const r = await buscar(`https://api.github.com/repos/${repo}/contents/${ARQ_INDICE}?ref=${encodeURIComponent(env.GITHUB_BRANCH_DADOS || 'dados')}`, {
    headers: { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'publicador-norte', ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) },
  });
  if (r.status === 404) return guardar({ sites: {} }, agora);
  // falhou: usa o último índice conhecido, se houver
  if (!r.ok) { if (indiceGuardado) return indiceGuardado.valor; throw new Error('índice indisponível: ' + r.status); }
  return guardar((await r.json()) as IndiceProducao, agora);
}
function guardar(valor: IndiceProducao, em: number) { indiceGuardado = { em, valor }; return valor; }
export const esquecerIndice = () => { indiceGuardado = null; };

const pagina = (status: number, titulo: string, texto: string) =>
  new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#222"><div style="text-align:center"><h1 style="font-size:22px">${titulo}</h1><p style="color:#666">${texto}</p></div></body></html>`, {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/**
 * Responde se o pedido for para um domínio de site em produção; devolve null quando é o painel
 * (o Next responde). Só GET/HEAD.
 */
export async function servirProducao(req: Request, env: AmbienteSites, buscar: typeof fetch = fetch): Promise<Response | null> {
  const url = new URL(req.url);
  const host = url.hostname.toLowerCase();
  if (hostDoPublicador(host, env.PUBLICADOR_HOSTS)) return null;
  let indice: IndiceProducao;
  try { indice = await lerIndice(env, Date.now(), buscar); } catch { return pagina(503, 'Site temporariamente indisponível', 'Tente de novo em alguns instantes.'); }
  const site = indice.sites[host];
  if (!site) return pagina(404, 'Site não encontrado', 'Este endereço ainda não tem um site publicado.');
  if (host !== site.principal) return Response.redirect(`https://${site.principal}${url.pathname}${url.search}`, 301);
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Método não permitido', { status: 405, headers: { Allow: 'GET, HEAD' } });

  let caminho: string;
  try { caminho = decodeURIComponent(url.pathname).replace(/^\/+/, ''); } catch { return pagina(400, 'Endereço inválido', ''); }
  if (caminho.split('/').some((p) => p === '..' || p === '.')) return pagina(400, 'Endereço inválido', '');
  if (!caminho || caminho.endsWith('/')) caminho += 'index.html';

  const repo = env.GITHUB_REPO || 'RenanPrates/publicadorNorte';
  const pegar = (p: string) => {
    const h: Record<string, string> = { 'User-Agent': 'publicador-norte' };
    if (env.GITHUB_TOKEN) h.Authorization = `token ${env.GITHUB_TOKEN}`;
    const range = req.headers.get('range');
    if (range) h.Range = range;
    const alvo = `https://raw.githubusercontent.com/${repo}/${site.commit}/${[site.slug, ...p.split('/')].map(encodeURIComponent).join('/')}`;
    // o commit não muda: o conteúdo pode ficar no cache da Cloudflare
    return buscar(alvo, { headers: h, cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit);
  };

  let r = await pegar(caminho);
  if (r.status === 404 && !extensao(caminho)) {
    // /cotia → /cotia/ (como o GitHub Pages)
    const dir = await pegar(caminho + '/index.html');
    if (dir.ok) return Response.redirect(`https://${host}/${caminho}/${url.search}`, 301);
    r = await pegar(caminho + '.html');
  }
  if (r.status === 404) return pagina(404, 'Página não encontrada', 'Confira o endereço.');
  if (!r.ok && r.status !== 206) return pagina(502, 'Site temporariamente indisponível', 'Tente de novo em alguns instantes.');

  const ext = extensao(caminho) || 'html';
  const cab = new Headers({
    'Content-Type': TIPOS[ext] || 'application/octet-stream',
    'Cache-Control': ext === 'html' || ext === 'htm' ? 'public, max-age=60' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  });
  // sem content-length: a resposta pode vir comprimida e o fetch já entrega descomprimida
  for (const k of ['content-range', 'etag']) { const v = r.headers.get(k); if (v) cab.set(k, v); }
  return new Response(req.method === 'HEAD' ? null : r.body, { status: r.status, headers: cab });
}
