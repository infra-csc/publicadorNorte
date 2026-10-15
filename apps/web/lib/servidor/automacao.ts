// Tarefas que o cron da Cloudflare roda a cada 5 minutos (worker.ts → scheduled → /api/automacao):
// 1. publicação agendada: na hora marcada, publica o que estiver salvo no teste (e na produção, se pedido);
// 2. Odoo (a cada 2, 6 ou 24 horas, escolhido no evento): preços, links, distâncias e status dos combos; se algo mudou,
//    grava e republica (a produção acompanha o teste). O aviso do Odoo (/api/odoo/aviso) faz o mesmo na hora;
// 3. modo automático: republica quando alguma cidade/etapa passou a "realizado" (a produção acompanha o teste).
import { realizadosAgora } from '@/lib/comum/montagem';
import type { Armazenamento } from './armazenamento';
import type { DestinoPublicacao } from './destino';
import { sincronizarOdoo, type ConfigOdoo } from './odoo';
import { NaoPublicavel, publicarEvento } from './publicar';

export interface FeitoAutomacao { slug: string; resultado: string }

/** horas entre as conferências do Odoo, quando o evento não escolheu */
export const HORAS_ODOO_PADRAO = 6;

/** a passada do cron (a cada 5 minutos) que cai no começo do intervalo, contado da meia-noite de Brasília */
export function horaDoOdoo(agora: Date, horas: number = HORAS_ODOO_PADRAO): boolean {
  const brasilia = agora.getTime() - 3 * 3600e3;
  return ((brasilia % (horas * 3600e3)) + horas * 3600e3) % (horas * 3600e3) < 5 * 60e3;
}

export async function rodarAutomacao(armazenamento: Armazenamento, destino: DestinoPublicacao, agora: Date, odoo?: { cfg: ConfigOdoo; fetch?: typeof fetch } | null): Promise<FeitoAutomacao[]> {
  const feitos: FeitoAutomacao[] = [];
  for (const r of await armazenamento.listar()) {
    if (r.agendado && Date.parse(r.agendado) <= agora.getTime()) {
      feitos.push({ slug: r.slug, resultado: await publicarAgendado(armazenamento, destino, r.slug, agora) });
      continue; // a publicação agendada já leva os "realizado" do momento
    }
    // na hora do intervalo do evento, ou já, se "Buscar agora" trouxe valores que ainda não foram para o site
    if (r.odoo && odoo && (horaDoOdoo(agora, r.odooHoras) || r.odooPendente)) {
      const f = await atualizarDoOdoo(armazenamento, destino, r.slug, agora, odoo);
      if (f) { feitos.push(f); if (f.resultado.includes('publicado')) continue; }
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

/** consulta o Odoo; se algum valor mudou e o evento já foi publicado, republica (a produção acompanha o teste) */
export async function atualizarDoOdoo(armazenamento: Armazenamento, destino: DestinoPublicacao, slug: string, agora: Date, odoo: { cfg: ConfigOdoo; fetch?: typeof fetch }): Promise<FeitoAutomacao | null> {
  try {
    const { resultado, evento } = await sincronizarOdoo(armazenamento, slug, odoo.cfg, agora, { fetch: odoo.fetch });
    // publica o que mudou agora e o que veio antes ("Buscar agora") e ainda não foi para o site
    if (!resultado.mudou && !evento.odoo?.pendente) return resultado.ok ? null : { slug, resultado: 'Odoo: ' + resultado.mensagem };
    if (evento.versaoAtiva == null) return { slug, resultado: 'Odoo: ' + resultado.mensagem + ' (ainda não publicado)' };
    try {
      const p = await publicarEvento(armazenamento, destino, slug, agora, { acompanharProducao: true });
      return { slug, resultado: `Odoo: ${resultado.mensagem} publicado v${p.publicacao.versao}` };
    } catch (x) {
      return { slug, resultado: `Odoo: ${resultado.mensagem} não publicou: ` + (x instanceof NaoPublicavel ? x.message : String(x)) };
    }
  } catch (x) {
    return { slug, resultado: 'Odoo: erro (' + String((x as Error)?.message || x).slice(0, 200) + ')' };
  }
}
