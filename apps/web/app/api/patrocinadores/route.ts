import type { BancoPatrocinios } from '@/lib/comum/tipos';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

/** banco geral de patrocinadores, com os eventos que usam cada um */
export async function GET(req: Request) {
  return responder(req, async () => {
    const { armazenamento } = servicos();
    const [{ banco, versao }, uso] = await Promise.all([armazenamento.lerBanco(), armazenamento.usoPatrocinadores()]);
    return Response.json({ banco, versao, uso });
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
    if (banco.cotas.some((c) => !nomeOk(c.nome) || !['GG', 'G', 'M', 'P'].includes(c.tamanho))) return erro(400, 'Cada cota precisa de nome e tamanho (GG, G, M ou P).');
    const nova = await servicos().armazenamento.salvarBanco(banco, versao);
    return Response.json({ versao: nova });
  });
}
