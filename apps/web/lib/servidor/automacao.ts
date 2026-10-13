// Tarefas que o cron da Cloudflare roda a cada 5 minutos (worker.ts → scheduled → /api/automacao):
// 1. publicação agendada: na hora marcada, publica o que estiver salvo no teste (e na produção, se pedido);
// 2. modo automático: republica quando alguma cidade/etapa passou a "realizado" (a produção acompanha o teste).
import { realizadosAgora } from '@/lib/comum/montagem';
import type { Armazenamento } from './armazenamento';
import type { DestinoPublicacao } from './destino';
import { NaoPublicavel, publicarEvento } from './publicar';

export interface FeitoAutomacao { slug: string; resultado: string }

export async function rodarAutomacao(armazenamento: Armazenamento, destino: DestinoPublicacao, agora: Date): Promise<FeitoAutomacao[]> {
  const feitos: FeitoAutomacao[] = [];
  for (const r of await armazenamento.listar()) {
    if (r.agendado && Date.parse(r.agendado) <= agora.getTime()) {
      feitos.push({ slug: r.slug, resultado: await publicarAgendado(armazenamento, destino, r.slug, agora) });
      continue; // a publicação agendada já leva os "realizado" do momento
    }
    if (!r.automatico) continue;
    const e = (await armazenamento.ler(r.slug))?.evento;
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
  return feitos;
}

/** publica o agendamento; se não der, tira o agendamento e guarda o motivo (não tenta de novo sozinho) */
async function publicarAgendado(armazenamento: Armazenamento, destino: DestinoPublicacao, slug: string, agora: Date): Promise<string> {
  const ag = (await armazenamento.ler(slug))?.evento.agendamento;
  if (!ag || Date.parse(ag.em) > agora.getTime()) return 'agendamento mudou; nada feito';
  try {
    const p = await publicarEvento(armazenamento, destino, slug, agora, { producao: ag.producao, acompanharProducao: true, agendamento: true });
    return 'agendado: ' + (p.evento.ultimoAgendamento?.mensagem || `publicado v${p.publicacao.versao}`);
  } catch (x) {
    const motivo = x instanceof NaoPublicavel ? x.message : 'erro inesperado (' + String(x).slice(0, 200) + ')';
    await armazenamento.atualizar(slug, (e) => {
      delete e.agendamento;
      e.ultimoAgendamento = { em: agora.toISOString(), ok: false, mensagem: 'Não publicou: ' + motivo };
    }, `Agendamento de ${slug} não publicou`);
    return 'agendado, não publicou: ' + motivo;
  }
}
