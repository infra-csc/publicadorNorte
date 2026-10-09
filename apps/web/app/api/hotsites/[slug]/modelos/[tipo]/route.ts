import { NOME_PAGINA, type TipoPagina } from '@norte/motor';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string; tipo: string }> }) {
  return responder(req, async () => {
    const { slug, tipo } = await params;
    if (!(tipo in NOME_PAGINA)) return erro(400, 'Tipo de página desconhecido.');
    await servicos().armazenamento.salvarModelo(slug, tipo as TipoPagina, await req.text());
    return new Response(null, { status: 204 });
  });
}
