// Produção: domínios próprios do evento e qual versão (já publicada no teste) está no ar neles.
import { normalizarDominio } from '@/lib/comum/dominios';
import type { Evento } from '@/lib/comum/tipos';
import { Cloudflare, type EstadoDominio } from '@/lib/servidor/cloudflare';
import { servicos } from '@/lib/servidor/config';
import { levarParaProducao, NaoPublicavel } from '@/lib/servidor/publicar';
import { erro, responder } from '@/lib/servidor/rotas';

type Ctx = { params: Promise<{ slug: string }> };
type Pedido = { acao: 'dominios'; dominios: string[] } | { acao: 'levar'; versao: number } | { acao: 'tirar' };

async function estados(dominios: string[]): Promise<{ dominio: string; estado: EstadoDominio; erro?: string }[]> {
  const cf = Cloudflare.doAmbiente();
  return Promise.all(dominios.map(async (d) => {
    if (!cf) return { dominio: d, estado: 'desconhecido' as const };
    try { return { dominio: d, estado: await cf.estado(d) }; } catch (e) { return { dominio: d, estado: 'desconhecido' as const, erro: (e as Error).message }; }
  }));
}

export async function GET(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const c = await servicos().armazenamento.ler(slug);
    if (!c) return erro(404, 'Evento não encontrado.');
    return Response.json({ cloudflare: !!Cloudflare.doAmbiente(), dominios: await estados(c.evento.producao?.dominios || []) });
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return responder(req, async () => {
    const { slug } = await params;
    const pedido = (await req.json()) as Pedido;
    const { armazenamento } = servicos();
    const c = await armazenamento.ler(slug);
    if (!c) return erro(404, 'Evento não encontrado.');
    const cf = Cloudflare.doAmbiente();
    const avisos: string[] = [];
    let mudar: (e: Evento) => void;
    let mensagem: string;

    if (pedido.acao === 'dominios') {
      const lista: string[] = [];
      for (const t of pedido.dominios || []) {
        if (!String(t).trim()) continue;
        const d = normalizarDominio(String(t));
        if (!d) return erro(400, `"${t}" não é um domínio válido (ex.: cuidar.com.br).`);
        if (!lista.includes(d)) lista.push(d);
      }
      const usados = await armazenamento.dominiosEmUso();
      const outro = lista.find((d) => usados[d] && usados[d] !== slug);
      if (outro) return erro(409, `O domínio ${outro} já é do evento "${usados[outro]}".`);
      const antes = c.evento.producao?.dominios || [];
      if (cf) {
        for (const d of antes.filter((x) => !lista.includes(x))) await cf.desconectar(d).catch((e) => avisos.push(`Não deu para desligar ${d} na Cloudflare: ${e.message}`));
        for (const d of lista.filter((x) => !antes.includes(x))) {
          const r = await cf.conectar(d).catch((e) => { avisos.push(`Não deu para ligar ${d} na Cloudflare: ${e.message}`); return null; });
          if (r === 'sem-zona') avisos.push(`${d} não está na conta da Cloudflare da Norte. Adicione o domínio lá primeiro.`);
        }
      }
      mudar = (e) => { (e.producao ||= { dominios: [], versao: null, commit: null, historico: [] }).dominios = lista; };
      mensagem = `Domínios de produção de ${slug}: ${lista.join(', ') || 'nenhum'}`;
    } else if (pedido.acao === 'levar') {
      const v = Number(pedido.versao);
      mudar = (e) => {
        // conferido no evento recém-lido da gravação (a leitura de cima pode estar alguns segundos atrasada)
        if (!e.producao?.dominios.length) throw new NaoPublicavel('Coloque o domínio do evento antes.');
        levarParaProducao(e, v);
      };
      mensagem = `Leva ${slug} v${v} para produção`;
    } else if (pedido.acao === 'tirar') {
      mudar = (e) => levarParaProducao(e, null);
      mensagem = `Tira ${slug} de produção`;
    } else return erro(400, 'Ação desconhecida.');

    try {
      const salvo = await armazenamento.atualizarProducao(slug, mudar, mensagem);
      return Response.json({ ...salvo, avisos, dominios: await estados(salvo.evento.producao?.dominios || []) });
    } catch (e) {
      if (e instanceof NaoPublicavel) return erro(400, e.message);
      throw e;
    }
  });
}
