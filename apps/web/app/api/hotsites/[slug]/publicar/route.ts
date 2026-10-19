import { servicos } from '@/lib/servidor/config';
import { NaoPublicavel, publicarEvento } from '@/lib/servidor/publicar';
import { erro, responder } from '@/lib/servidor/rotas';

/**
 * gera as páginas com o que está salvo e publica como versão nova.
 * `{ renovarCache: true }` ("Forçar atualização"): todos os arquivos mudam de endereço, e a produção vai junto se estava na versão do teste.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return responder(req, async () => {
    const { slug } = await params;
    const { armazenamento, destino } = servicos();
    try {
      const corpo = (await req.json().catch(() => ({}))) as { renovarCache?: boolean };
      const renovar = corpo?.renovarCache === true;
      return Response.json(await publicarEvento(armazenamento, destino, slug, new Date(), renovar ? { renovarCache: true, acompanharProducao: true } : {}));
    } catch (e) {
      if (e instanceof NaoPublicavel) return e.avisos ? Response.json({ erro: e.message, avisos: e.avisos }, { status: 409 }) : erro(e.message === 'Evento não encontrado.' ? 404 : 400, e.message);
      throw e;
    }
  });
}
