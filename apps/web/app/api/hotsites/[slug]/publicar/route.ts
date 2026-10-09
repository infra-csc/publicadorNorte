import { servicos } from '@/lib/servidor/config';
import { NaoPublicavel, publicarEvento } from '@/lib/servidor/publicar';
import { erro, responder } from '@/lib/servidor/rotas';

/** gera as páginas com o que está salvo e publica como versão nova */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return responder(req, async () => {
    const { slug } = await params;
    const { armazenamento, destino } = servicos();
    try {
      return Response.json(await publicarEvento(armazenamento, destino, slug));
    } catch (e) {
      if (e instanceof NaoPublicavel) return e.avisos ? Response.json({ erro: e.message, avisos: e.avisos }, { status: 409 }) : erro(e.message === 'Evento não encontrado.' ? 404 : 400, e.message);
      throw e;
    }
  });
}
