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
    if (banco.cotas.some((c) => !nomeOk(c.nome) || !/^[\w-]+$/.test(c.id) || !['GG', 'G', 'M', 'P'].includes(c.tamanho))) return erro(400, 'Cada cota precisa de nome e tamanho (GG, G, M ou P).');
    const { armazenamento } = servicos();
    const velho = (await armazenamento.lerBanco()).banco;
    const antes = new Map(velho.patrocinadores.map((p) => [p.id, p]));
    const nova = await armazenamento.salvarBanco(banco, versao);
    // o que muda no site: nome (texto alternativo), link, logo e ativo
    const mudou = banco.patrocinadores.filter((p) => {
      const a = antes.get(p.id);
      return a && (a.nome !== p.nome || a.url !== p.url || a.sha !== p.sha || a.ativo !== p.ativo);
    });
    // cotas: nome (título), tamanho, "ao lado" e a ordem mudam a seção
    const chave = (c: { id: string; nome: string; tamanho: string; aoLado?: boolean }, i: number) => `${i}|${c.nome}|${c.tamanho}|${!!c.aoLado}`;
    const posVelha = new Map((velho.cotas || []).map((c, i) => [c.id, chave(c, i)]));
    const cotasMudadas = new Set((velho.cotas || []).filter((c) => !banco.cotas.some((n) => n.id === c.id)).map((c) => c.id));
    banco.cotas.forEach((c, i) => { if (posVelha.has(c.id) && posVelha.get(c.id) !== chave(c, i)) cotasMudadas.add(c.id); });
    if (mudou.length || cotasMudadas.size) {
      const uso = await armazenamento.usoPatrocinadores();
      const porEvento = new Map<string, string[]>();
      const anotar = (slug: string, m: string) => { const l = porEvento.get(slug) || []; if (!l.includes(m)) porEvento.set(slug, [...l, m]); };
      for (const p of mudou) for (const u of uso[p.id] || []) if (u.publicado) anotar(u.slug, `${p.nome} mudou no cadastro`);
      for (const us of Object.values(uso)) for (const u of us) if (u.publicado && u.aplicacoes.some((a) => cotasMudadas.has(a.cota))) anotar(u.slug, 'as cotas mudaram');
      for (const [slug, motivos] of porEvento) await marcarPendencia(armazenamento, slug, `Patrocínios: ${motivos.join('; ')}`);
    }
    return Response.json({ versao: nova });
  });
}
