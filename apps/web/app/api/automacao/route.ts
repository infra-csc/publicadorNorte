// Modo automático: republica os eventos publicados em que alguma cidade/etapa passou a "realizado"
// (e a produção também, se ela estava na mesma versão do teste).
// Chamada de hora em hora pelo cron da Cloudflare (worker.ts → scheduled) com Authorization: Bearer <chaveAutomacao>.
import { realizadosAgora } from '@/lib/comum/montagem';
import { chaveAutomacao } from '@/lib/servidor/automacaoChave';
import { servicos } from '@/lib/servidor/config';
import { NaoPublicavel, publicarEvento } from '@/lib/servidor/publicar';
import { erro, responder } from '@/lib/servidor/rotas';

export async function POST(req: Request) {
  return responder(req, async () => {
    const chave = await chaveAutomacao({ AUTOMACAO_TOKEN: process.env.AUTOMACAO_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN });
    if (!chave) return erro(503, 'Automação não configurada (falta GITHUB_TOKEN).');
    if (req.headers.get('authorization') !== `Bearer ${chave}`) return erro(401, 'Chave da automação inválida.');
    const { armazenamento, destino } = servicos();
    const agora = new Date();
    const feitos: { slug: string; resultado: string }[] = [];
    for (const r of await armazenamento.listar()) {
      const c = await armazenamento.ler(r.slug);
      const e = c?.evento;
      if (!e?.automacao?.ativo || e.versaoAtiva == null) continue;
      const agoraR = realizadosAgora(e, agora);
      const antes = e.automacao.realizados || [];
      if (agoraR.length === antes.length && agoraR.every((x, i) => x === antes[i])) continue;
      try {
        const p = await publicarEvento(armazenamento, destino, r.slug, agora, { acompanharProducao: true });
        feitos.push({ slug: r.slug, resultado: `publicado v${p.publicacao.versao} (${agoraR.length} realizado)` });
      } catch (x) {
        feitos.push({ slug: r.slug, resultado: 'não publicou: ' + (x instanceof NaoPublicavel ? x.message : String(x)) });
      }
    }
    return Response.json({ em: agora.toISOString(), feitos });
  }, { publico: true });
}
