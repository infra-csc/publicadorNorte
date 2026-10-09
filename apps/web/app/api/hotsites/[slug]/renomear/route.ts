import { servicos } from '@/lib/servidor/config';
import { erro, responder, slugValido } from '@/lib/servidor/rotas';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return responder(req, async () => {
    const { slug } = await params;
    const { novo } = (await req.json()) as { novo: string };
    if (!slugValido(novo)) return erro(400, 'Use só letras minúsculas, números e hífen (ex.: makai-2027).');
    if (novo === slug) return Response.json({ slug });
    await servicos().armazenamento.renomear(slug, novo);
    return Response.json({ slug: novo });
  });
}
