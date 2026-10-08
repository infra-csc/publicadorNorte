import type { BancoPatrocinios } from '@/lib/comum/tipos';
import { marcarPendencia } from '@/lib/servidor/pendencia';
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
    const { armazenamento } = servicos();
    const antes = new Map((await armazenamento.lerBanco()).banco.patrocinadores.map((p) => [p.id, p]));
    const nova = await armazenamento.salvarBanco(banco, versao);
    // o que muda no site: nome (texto alternativo), link, logo e ativo
    const mudou = banco.patrocinadores.filter((p) => {
      const a = antes.get(p.id);
      return a && (a.nome !== p.nome || a.url !== p.url || a.sha !== p.sha || a.ativo !== p.ativo);
    });
    if (mudou.length) {
      const uso = await armazenamento.usoPatrocinadores();
      const porEvento = new Map<string, string[]>();
      for (const p of mudou) for (const u of uso[p.id] || []) if (u.publicado) porEvento.set(u.slug, [...(porEvento.get(u.slug) || []), p.nome]);
      for (const [slug, nomes] of porEvento) await marcarPendencia(armazenamento, slug, `Patrocínios: ${nomes.join(', ')} mudou no cadastro`);
    }
    return Response.json({ versao: nova });
  });
}
