// Aviso do Odoo: o pessoal de desenvolvimento chama esta rota (botão ou ação automática no Odoo) quando muda um combo.
// O publicador consulta na hora os eventos com "Preços do Odoo" ligado e republica o que mudou.
// Chave: ?chave=… ou Authorization: Bearer … (ODOO_AVISO_TOKEN, ou derivada do GITHUB_TOKEN; a tela do evento mostra o endereço).
// Combos: ?combo=346,407 ou corpo JSON { "combo": 346 } / { "combo": [346, 407] }; sem combo, confere todos os eventos ligados.
import { idDoCombo } from '@/lib/comum/odoo';
import { atualizarDoOdoo } from '@/lib/servidor/automacao';
import { chaveAvisoOdoo } from '@/lib/servidor/automacaoChave';
import { servicos } from '@/lib/servidor/config';
import { configOdoo } from '@/lib/servidor/odoo';
import { erro, responder } from '@/lib/servidor/rotas';

export const GET = (req: Request) => responder(req, () => avisar(req), { publico: true });
export const POST = (req: Request) => responder(req, () => avisar(req), { publico: true });

async function avisar(req: Request): Promise<Response> {
  const chave = await chaveAvisoOdoo({ ODOO_AVISO_TOKEN: process.env.ODOO_AVISO_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN });
  if (!chave) return erro(503, 'Aviso do Odoo não configurado (falta GITHUB_TOKEN).');
  const url = new URL(req.url);
  const dada = url.searchParams.get('chave') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (dada !== chave) return erro(401, 'Chave do aviso inválida.');
  const cfg = configOdoo();
  if (!cfg) return erro(503, 'O Odoo não está configurado no publicador (faltam ODOO_URL e ODOO_API_KEY).');
  const combos = (url.searchParams.get('combo') || '').split(/[,;\s]+/).map(Number).filter((n) => n > 0);
  if (req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as { combo?: unknown; combos?: unknown; id?: unknown };
    for (const x of ([] as unknown[]).concat(b?.combo ?? b?.combos ?? b?.id ?? [])) if (Number(x) > 0) combos.push(Number(x));
  }
  const { armazenamento, destino } = servicos();
  const agora = new Date();
  const feitos: { slug: string; resultado: string }[] = [];
  for (const r of await armazenamento.listar()) {
    if (!r.odoo) continue;
    if (combos.length) {
      const e = (await armazenamento.ler(r.slug))?.evento;
      if (!e?.cidades.some((l) => combos.includes(idDoCombo(l.link_inscricao) ?? -1))) continue;
    }
    feitos.push((await atualizarDoOdoo(armazenamento, destino, r.slug, agora, { cfg })) ?? { slug: r.slug, resultado: 'Odoo: nada mudou' });
  }
  return Response.json({ em: agora.toISOString(), combos, feitos });
}
