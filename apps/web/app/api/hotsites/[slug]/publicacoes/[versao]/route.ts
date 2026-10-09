import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

/** "voltar para esta versão": o site passa a mostrar a versão escolhida */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; versao: string }> }) {
  return responder(req, async () => {
    const { slug, versao } = await params;
    const { armazenamento, destino } = servicos();
    const c = await armazenamento.ler(slug);
    if (!c) return erro(404, 'Evento não encontrado.');
    const pub = c.evento.publicacoes.find((p) => p.versao === Number(versao));
    if (!pub) return erro(404, 'Versão não encontrada.');
    await destino.restaurar(slug, pub.versao, pub.commit);
    const salvo = await armazenamento.atualizar(slug, (e) => { e.versaoAtiva = pub.versao; }, `Volta ${slug} para a v${pub.versao}`);
    return Response.json(salvo);
  });
}
