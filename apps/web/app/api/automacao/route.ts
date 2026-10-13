// Automação (lib/servidor/automacao.ts): publicações agendadas e modo automático ("realizado").
// Chamada a cada 5 minutos pelo cron da Cloudflare (worker.ts → scheduled) com Authorization: Bearer <chaveAutomacao>.
import { chaveAutomacao } from '@/lib/servidor/automacaoChave';
import { rodarAutomacao } from '@/lib/servidor/automacao';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

export async function POST(req: Request) {
  return responder(req, async () => {
    const chave = await chaveAutomacao({ AUTOMACAO_TOKEN: process.env.AUTOMACAO_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN });
    if (!chave) return erro(503, 'Automação não configurada (falta GITHUB_TOKEN).');
    if (req.headers.get('authorization') !== `Bearer ${chave}`) return erro(401, 'Chave da automação inválida.');
    const { armazenamento, destino } = servicos();
    const agora = new Date();
    return Response.json({ em: agora.toISOString(), feitos: await rodarAutomacao(armazenamento, destino, agora) });
  }, { publico: true });
}
