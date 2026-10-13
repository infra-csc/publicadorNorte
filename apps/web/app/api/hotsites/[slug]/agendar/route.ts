import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

type Ctx = { params: Promise<{ slug: string }> };

/** marca a publicação agendada: { em: ISO, producao: boolean } (a automação publica até 5 minutos depois) */
export async function POST(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const { em, producao } = (await req.json()) as { em?: string; producao?: boolean };
    const t = Date.parse(em || '');
    if (!Number.isFinite(t)) return erro(400, 'Escolha a data e a hora.');
    if (t < Date.now() + 60_000) return erro(400, 'Escolha um horário daqui a pelo menos 1 minuto.');
    if (t > Date.now() + 366 * 864e5) return erro(400, 'Escolha um horário dentro dos próximos 12 meses.');
    const agora = new Date().toISOString();
    return Response.json(await servicos().armazenamento.atualizar(slug, (e) => {
      e.agendamento = { em: new Date(t).toISOString(), producao: !!producao, criadoEm: agora };
      delete e.ultimoAgendamento;
    }, `Agenda a publicação de ${slug}`));
  });
}

/** cancela a publicação agendada */
export async function DELETE(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    return Response.json(await servicos().armazenamento.atualizar(slug, (e) => { delete e.agendamento; }, `Cancela o agendamento de ${slug}`));
  });
}
