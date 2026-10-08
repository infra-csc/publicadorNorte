import type { Cota } from '@norte/motor';
import { paginasComPatrocinio } from '@/lib/comum/montagem';
import type { BancoPatrocinios, Evento } from '@/lib/comum/tipos';
import { anotarPendencia } from '@/lib/servidor/pendencia';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

/** banco geral de patrocinadores, com os eventos que usam cada um */
export async function GET(req: Request) {
  return responder(req, async () => {
    const { armazenamento } = servicos();
    const [{ banco, versao }, { uso, eventos }] = await Promise.all([armazenamento.lerBanco(), armazenamento.panoramaPatrocinios()]);
    return Response.json({ banco, versao, uso, eventos });
  });
}

/** grava o banco inteiro; `versao` é a que foi lida (protege o trabalho de outra pessoa) */
export async function PUT(req: Request) {
  return responder(req, async () => {
    const { banco, versao } = (await req.json()) as { banco: BancoPatrocinios; versao: string };
    const nomeOk = (s: string) => typeof s === 'string' && s.trim().length > 0 && s.length <= 120;
    if (!Array.isArray(banco?.patrocinadores) || !Array.isArray(banco?.cotas)) return erro(400, 'Banco inválido.');
    if (banco.patrocinadores.some((p) => !nomeOk(p.nome) || !/^[0-9a-f]{40}$/.test(p.sha) || !/^[\w.-]+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(p.logo))) {
      return erro(400, 'Cada patrocinador precisa de nome e de um logo em imagem.');
    }
    const nomeCotaOk = (n: unknown) => n === undefined || (typeof n === 'string' && n.length <= 120);
    if (banco.cotas.some((c) => !nomeCotaOk(c.nome) || !nomeCotaOk(c.tituloBloco) || !/^[\w-]+$/.test(c.id) || !['GG', 'G', 'M', 'P'].includes(c.tamanho))) return erro(400, 'Cada cota precisa de um tamanho (GG, G, M ou P).');
    banco.cotas.forEach((c) => { c.nome ??= ''; });
    const { armazenamento } = servicos();
    const velho = (await armazenamento.lerBanco()).banco;
    const antes = new Map(velho.patrocinadores.map((p) => [p.id, p]));
    // o que muda no site: nome (texto alternativo), link, logo e ativo
    const mudou = banco.patrocinadores.filter((p) => {
      const a = antes.get(p.id);
      return a && (a.nome !== p.nome || a.url !== p.url || a.sha !== p.sha || a.ativo !== p.ativo);
    });
    // cotas: nome, nome do bloco, tamanho, "ao lado" e a ordem mudam a seção
    const chave = (c: Cota, i: number) => `${i}|${c.nome}|${c.tituloBloco || ''}|${c.tamanho}|${!!c.aoLado}`;
    const posVelha = new Map((velho.cotas || []).map((c, i) => [c.id, chave(c, i)]));
    const cotasMudadas = new Set((velho.cotas || []).filter((c) => !banco.cotas.some((n) => n.id === c.id)).map((c) => c.id));
    banco.cotas.forEach((c, i) => { if (posVelha.has(c.id) && posVelha.get(c.id) !== chave(c, i)) cotasMudadas.add(c.id); });
    const nomes = new Map(mudou.map((p) => [p.id, p.nome]));
    // eventos publicados que usam o que mudou ficam com "atualização pendente" (no mesmo commit, sem publicar)
    const marcar = (e: Evento) => {
      if (e.versaoAtiva == null) return false;
      const motivos = new Set<string>();
      for (const [pg, comp] of Object.entries(e.patrocinios?.porPagina || {})) {
        if (!paginasComPatrocinio(e).some((x) => x.id === pg)) continue;
        for (const b of comp.blocos) {
          if (b.itens.length && cotasMudadas.has(b.cota)) motivos.add('as cotas mudaram');
          for (const it of b.itens) if (nomes.has(it.patrocinador)) motivos.add(`${nomes.get(it.patrocinador)} mudou no cadastro`);
        }
      }
      if (!motivos.size) return false;
      const antes = JSON.stringify(e.pendencia);
      anotarPendencia(e, `Patrocínios: ${[...motivos].join('; ')}`);
      return JSON.stringify(e.pendencia) !== antes;
    };
    const nova = await armazenamento.salvarBanco(banco, versao, mudou.length || cotasMudadas.size ? marcar : undefined);
    return Response.json({ versao: nova });
  });
}
