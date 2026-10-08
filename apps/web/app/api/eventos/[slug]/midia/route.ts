import type { ArquivoMidia } from '@/lib/comum/tipos';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

type Ctx = { params: Promise<{ slug: string }> };

/** registra no evento arquivos já enviados por /api/arquivos (um commit para a pasta toda) */
export async function POST(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const { arquivos } = (await req.json()) as { arquivos: ArquivoMidia[] };
    if (!Array.isArray(arquivos) || arquivos.some((a) => !a.caminho || !/^[0-9a-f]{40}$/.test(a.sha) || a.caminho.includes('..'))) {
      return erro(400, 'Lista de arquivos inválida.');
    }
    await servicos().armazenamento.adicionarMidia(slug, arquivos);
    return new Response(null, { status: 204 });
  });
}

/** exclui os arquivos indicados em { caminhos }, ou toda a mídia (a interface pede confirmação antes) */
export async function DELETE(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const corpo = (await req.json().catch(() => ({}))) as { caminhos?: string[] };
    if (corpo.caminhos && (!Array.isArray(corpo.caminhos) || corpo.caminhos.some((c) => typeof c !== 'string' || c.includes('..')))) return erro(400, 'Lista de arquivos inválida.');
    await servicos().armazenamento.removerMidia(slug, corpo.caminhos);
    return new Response(null, { status: 204 });
  });
}
