// Odoo: liga/desliga os preços vindos do Odoo e consulta na hora (a automação confere sozinha a cada 30 minutos).
import { servicos } from '@/lib/servidor/config';
import { configOdoo, sincronizarOdoo } from '@/lib/servidor/odoo';
import { erro, responder } from '@/lib/servidor/rotas';

type Ctx = { params: Promise<{ slug: string }> };

/** a chave do Odoo está configurada? (nunca devolve a chave) */
export async function GET(req: Request) {
  return responder(req, async () => {
    const cfg = configOdoo();
    return Response.json({ configurado: !!cfg, url: cfg?.url || null });
  });
}

/** { ativo: false } desliga; senão liga e consulta agora, gravando o que mudou no cadastro */
export async function POST(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const { ativo } = (await req.json().catch(() => ({}))) as { ativo?: boolean };
    const { armazenamento } = servicos();
    if (ativo === false) {
      return Response.json(await armazenamento.atualizar(slug, (e) => { e.odoo = { ...e.odoo, ativo: false }; }, `Desliga o Odoo em ${slug}`));
    }
    const cfg = configOdoo();
    if (!cfg) return erro(503, 'O Odoo não está configurado no publicador (faltam ODOO_URL e ODOO_API_KEY).');
    const r = await sincronizarOdoo(armazenamento, slug, cfg, new Date(), { sempre: true, ligar: true });
    return Response.json({ evento: r.evento, versao: r.versao, resultado: r.resultado });
  });
}
