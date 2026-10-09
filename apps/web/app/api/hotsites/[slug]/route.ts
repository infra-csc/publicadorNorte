import type { Evento } from '@/lib/comum/tipos';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const r = await servicos().armazenamento.ler(slug);
    return r ? Response.json(r) : erro(404, 'Evento não encontrado.');
  });
}

/** salva o evento; `versao` é a que o navegador leu (protege o trabalho de outra pessoa) */
export async function PUT(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const { evento, versao } = (await req.json()) as { evento: Evento; versao: string };
    if (evento.slug !== slug) return erro(400, 'Endereço do evento não confere.');
    evento.atualizadoEm = new Date().toISOString();
    const nova = await servicos().armazenamento.salvar(evento, versao);
    return Response.json({ versao: nova, atualizadoEm: evento.atualizadoEm });
  });
}

/** exclui: vai para a lixeira do repositório (dá para recuperar) */
export async function DELETE(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    await servicos().armazenamento.excluir(slug);
    return new Response(null, { status: 204 });
  });
}
