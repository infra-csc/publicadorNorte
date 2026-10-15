// Odoo: liga/desliga os preços vindos do Odoo e consulta na hora (a automação confere no intervalo do evento).
import { chaveAvisoOdoo } from '@/lib/servidor/automacaoChave';
import { servicos } from '@/lib/servidor/config';
import { configOdoo, sincronizarOdoo } from '@/lib/servidor/odoo';
import { erro, responder } from '@/lib/servidor/rotas';

type Ctx = { params: Promise<{ slug: string }> };

/** a chave do Odoo está configurada? (nunca devolve a chave) */
export async function GET(req: Request) {
  return responder(req, async () => {
    const cfg = configOdoo();
    const faltam = ['ODOO_URL', 'ODOO_API_KEY'].filter((k) => !process.env[k]);
    // endereço do aviso, para o pessoal de desenvolvimento do Odoo (só quem entrou com a senha da equipe vê)
    const chave = await chaveAvisoOdoo({ ODOO_AVISO_TOKEN: process.env.ODOO_AVISO_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN });
    const aviso = chave ? `${new URL(req.url).origin}/api/odoo/aviso?chave=${chave}` : null;
    return Response.json({ configurado: !!cfg, url: cfg?.url || null, faltam, aviso });
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
