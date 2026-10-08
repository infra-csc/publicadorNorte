// Edição rápida pela aba Patrocínios: trocar a cota ou o tamanho de um logo numa página, ou tirar o logo dali.
// Não publica: o evento fica com "atualização pendente".
import { COTAS_PADRAO, type Tamanho } from '@norte/motor';
import { servicos } from '@/lib/servidor/config';
import { anotarPendencia } from '@/lib/servidor/pendencia';
import { erro, responder } from '@/lib/servidor/rotas';

type Pedido = { pagina: string; patrocinador: string; nome: string; acao: 'cota' | 'tamanho' | 'remover'; cota?: string; tamanho?: Tamanho | '' };

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return responder(req, async () => {
    const { slug } = await params;
    const p = (await req.json()) as Pedido;
    if (!p.pagina || !p.patrocinador || !['cota', 'tamanho', 'remover'].includes(p.acao)) return erro(400, 'Pedido inválido.');
    const r = await servicos().armazenamento.atualizar(slug, (e) => {
      const comp = e.patrocinios?.porPagina[p.pagina];
      if (!comp) return;
      const bloco = comp.blocos.find((b) => b.itens.some((i) => i.patrocinador === p.patrocinador));
      if (!bloco) return;
      const item = bloco.itens.find((i) => i.patrocinador === p.patrocinador)!;
      const cotas = e.patrocinios!.cotas || COTAS_PADRAO;
      let motivo = '';
      if (p.acao === 'remover') {
        bloco.itens = bloco.itens.filter((i) => i !== item);
        motivo = `${p.nome} saiu`;
      } else if (p.acao === 'tamanho') {
        item.tamanho = p.tamanho || undefined;
        motivo = `${p.nome} mudou de tamanho`;
      } else if (p.cota && p.cota !== bloco.cota) {
        const cota = cotas.find((c) => c.id === p.cota);
        if (!cota) return;
        bloco.itens = bloco.itens.filter((i) => i !== item);
        let destino = comp.blocos.find((b) => b.cota === p.cota);
        if (!destino) {
          destino = { id: crypto.randomUUID().slice(0, 8), cota: p.cota, ordem: 'alfabetica', itens: [] };
          // entra na posição da cota (ordem das cotas do evento)
          const pos = cotas.findIndex((c) => c.id === p.cota);
          const depois = comp.blocos.findIndex((b) => cotas.findIndex((c) => c.id === b.cota) > pos);
          if (depois < 0) comp.blocos.push(destino); else comp.blocos.splice(depois, 0, destino);
        }
        destino.itens.push({ patrocinador: p.patrocinador, tamanho: item.tamanho });
        motivo = `${p.nome} foi para ${cota.nome}`;
      }
      comp.blocos = comp.blocos.filter((b) => b.itens.length);
      if (motivo) anotarPendencia(e, `Patrocínios: ${motivo}`);
    }, `Edita patrocínios de ${slug}`);
    return Response.json(r);
  });
}
