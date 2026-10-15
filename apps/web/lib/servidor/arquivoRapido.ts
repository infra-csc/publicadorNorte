// /api/arquivos/<sha> (imagens e vídeos da prévia) atendido direto na entrada do Worker, sem passar pelo Next:
// o arquivo vem do GitHub e é repassado sem ser lido. Cada pedido gasta quase nada de CPU (o plano gratuito da
// Cloudflare dá 10 ms por pedido, e a prévia pede dezenas de arquivos de uma vez).
// Pedido de um trecho específico de vídeo (o GitHub manda sempre o arquivo inteiro) e qualquer erro seguem para a rota do Next.
import type { AmbienteSites } from './sitesProducao';

const TIPOS: Record<string, string> = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', pdf: 'application/pdf',
};

export async function servirArquivoRapido(req: Request, env: AmbienteSites, buscar: typeof fetch = fetch): Promise<Response | null> {
  const url = new URL(req.url);
  const m = /^\/api\/arquivos\/([0-9a-f]{40})$/.exec(url.pathname);
  if (!m || (req.method !== 'GET' && req.method !== 'HEAD') || !env.GITHUB_TOKEN) return null;
  const repo = env.GITHUB_REPO || 'RenanPrates/publicadorNorte';
  const range = req.headers.get('range');
  const h: Record<string, string> = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.raw+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'publicador-norte',
  };
  if (range) h.Range = range;
  let r: Response;
  try { r = await buscar(`https://api.github.com/repos/${repo}/git/blobs/${m[1]}`, { headers: h }); } catch { return null; }
  // o GitHub ignora o trecho e manda tudo: vale para "do começo até o fim" (bytes=0-, o primeiro pedido de vídeo do Chrome);
  // trecho específico (Safari) segue para a rota do Next, que corta
  if (!r.ok || (range && r.status !== 206 && !/^bytes=0-$/.test(range.trim()))) return null;
  const nome = url.searchParams.get('n') || '';
  const cab = new Headers({
    'Content-Type': TIPOS[nome.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream',
    'Cache-Control': 'private, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  for (const k of ['Content-Length', 'Content-Range']) { const v = r.headers.get(k); if (v) cab.set(k, v); }
  return new Response(req.method === 'HEAD' ? null : r.body, { status: r.status, headers: cab });
}
