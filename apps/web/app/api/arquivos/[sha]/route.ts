import { tipoArquivo } from '@norte/motor';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

/**
 * Conteúdo de um arquivo guardado, para a prévia. O sha identifica o conteúdo, então pode ficar em cache.
 * Rota pública: a prévia roda isolada e não envia o cookie; o sha (40 caracteres) não dá para adivinhar.
 * Aceita pedidos por partes (Range), que os navegadores usam para tocar vídeo.
 */
export async function GET(req: Request, { params }: { params: Promise<{ sha: string }> }) {
  return responder(req, async () => {
    const { sha } = await params;
    if (!/^[0-9a-f]{40}$/.test(sha)) return erro(400, 'Arquivo inválido.');
    const nome = new URL(req.url).searchParams.get('n') || '';
    const bytes = await servicos().armazenamento.lerArquivo(sha);
    const cab: Record<string, string> = {
      'Content-Type': tipoArquivo(nome) || 'application/octet-stream',
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
    };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
    if (m && (m[1] || m[2])) {
      const total = bytes.length;
      let ini = m[1] ? Number(m[1]) : total - Number(m[2]);
      let fim = m[1] && m[2] ? Number(m[2]) : total - 1;
      ini = Math.max(0, ini);
      fim = Math.min(fim, total - 1);
      if (ini > fim) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
      return new Response(bytes.slice(ini, fim + 1) as unknown as BodyInit, {
        status: 206,
        headers: { ...cab, 'Content-Range': `bytes ${ini}-${fim}/${total}`, 'Content-Length': String(fim - ini + 1) },
      });
    }
    return new Response(bytes as unknown as BodyInit, { headers: { ...cab, 'Content-Length': String(bytes.length) } });
  }, { publico: true });
}
