// Edição rápida pela aba Patrocínios: pôr um logo em páginas do evento, trocar a cota ou o tamanho dele
// numa página, ou tirar o logo dali. Não publica: o evento fica com "atualização pendente".
import type { BlocoPatrocinio, ComposicaoPatrocinio, Cota, Tamanho } from '@norte/motor';
import { cotasDoEvento, paginasComPatrocinio } from '@/lib/comum/montagem';
import { servicos } from '@/lib/servidor/config';
import { anotarPendencia } from '@/lib/servidor/pendencia';
import { erro, responder } from '@/lib/servidor/rotas';

type Pedido = {
  patrocinador: string;
  nome: string;
  acao: 'adicionar' | 'cota' | 'tamanho' | 'remover';
  /** para cota/tamanho/remover */
  pagina?: string;
  /** para adicionar: "tapume" e/ou _id das cidades */
  paginas?: string[];
  cota?: string;
  tamanho?: Tamanho | '';
};

/** bloco da cota na página; sem ele, cria na posição da cota (ordem das cotas do evento) */
function blocoDaCota(comp: ComposicaoPatrocinio, cotas: Cota[], cota: string): BlocoPatrocinio {
  let destino = comp.blocos.find((b) => b.cota === cota);
  if (!destino) {
    destino = { id: crypto.randomUUID().slice(0, 8), cota, ordem: 'alfabetica', itens: [] };
    const pos = cotas.findIndex((c) => c.id === cota);
    const depois = comp.blocos.findIndex((b) => cotas.findIndex((c) => c.id === b.cota) > pos);
    if (depois < 0) comp.blocos.push(destino); else comp.blocos.splice(depois, 0, destino);
  }
  return destino;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return responder(req, async () => {
    const { slug } = await params;
    const p = (await req.json()) as Pedido;
    if (!p.patrocinador || !['adicionar', 'cota', 'tamanho', 'remover'].includes(p.acao)) return erro(400, 'Pedido inválido.');
    if (p.acao === 'adicionar' ? !p.paginas?.length || !p.cota : !p.pagina) return erro(400, 'Pedido inválido.');
    const { armazenamento } = servicos();
    const { banco } = await armazenamento.lerBanco();
    const r = await armazenamento.atualizar(slug, (e) => {
      e.patrocinios ??= { porPagina: {} };
      const cotas = cotasDoEvento(e, banco);
      const internas = paginasComPatrocinio(e);
      const nomeDe = (pg: string) => internas.find((x) => x.id === pg)?.nome || pg;

      if (p.acao === 'adicionar') {
        const cota = cotas.find((c) => c.id === p.cota);
        if (!cota) return;
        const entrou: string[] = [];
        for (const pg of p.paginas!) {
          if (!internas.some((x) => x.id === pg)) continue;
          const comp = (e.patrocinios.porPagina[pg] ??= { blocos: [] });
          if (comp.blocos.some((b) => b.itens.some((i) => i.patrocinador === p.patrocinador))) continue;
          blocoDaCota(comp, cotas, cota.id).itens.push({ patrocinador: p.patrocinador });
          entrou.push(nomeDe(pg));
        }
        if (entrou.length) anotarPendencia(e, `Patrocínios: ${p.nome} entrou em ${entrou.join(', ')} (${cota.nome})`);
        return;
      }

      const comp = e.patrocinios.porPagina[p.pagina!];
      if (!comp) return;
      const bloco = comp.blocos.find((b) => b.itens.some((i) => i.patrocinador === p.patrocinador));
      if (!bloco) return;
      const item = bloco.itens.find((i) => i.patrocinador === p.patrocinador)!;
      let motivo = '';
      if (p.acao === 'remover') {
        bloco.itens = bloco.itens.filter((i) => i !== item);
        motivo = `${p.nome} saiu de ${nomeDe(p.pagina!)}`;
      } else if (p.acao === 'tamanho') {
        item.tamanho = p.tamanho || undefined;
        motivo = `${p.nome} mudou de tamanho em ${nomeDe(p.pagina!)}`;
      } else if (p.cota && p.cota !== bloco.cota) {
        const cota = cotas.find((c) => c.id === p.cota);
        if (!cota) return;
        bloco.itens = bloco.itens.filter((i) => i !== item);
        blocoDaCota(comp, cotas, cota.id).itens.push({ patrocinador: p.patrocinador, tamanho: item.tamanho });
        motivo = `${p.nome} foi para ${cota.nome} em ${nomeDe(p.pagina!)}`;
      }
      comp.blocos = comp.blocos.filter((b) => b.itens.length);
      if (motivo) anotarPendencia(e, `Patrocínios: ${motivo}`);
    }, `Edita patrocínios de ${slug}`);
    return Response.json(r);
  });
}
