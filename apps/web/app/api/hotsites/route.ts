import { FORMATOS, slug as fazerSlug, type Formato } from '@norte/motor';
import type { Evento } from '@/lib/comum/tipos';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

export async function GET(req: Request) {
  return responder(req, async () => Response.json(await servicos().armazenamento.listar()));
}

export async function POST(req: Request) {
  return responder(req, async () => {
    const { nome, formato } = (await req.json()) as { nome?: string; formato?: Formato };
    if (!nome?.trim()) return erro(400, 'Dê um nome ao evento.');
    if (!formato || !(formato in FORMATOS)) return erro(400, 'Escolha o formato.');
    const { armazenamento } = servicos();
    const existentes = new Set((await armazenamento.listar()).map((e) => e.slug));
    const base = fazerSlug(nome) || 'evento';
    let s = base;
    for (let i = 2; existentes.has(s); i++) s = `${base}-${i}`;
    const agora = new Date().toISOString();
    const evento: Evento = {
      id: crypto.randomUUID(), slug: s, nome: nome.trim(), formato, paginas: {}, vars: {}, gerais: {}, cidades: [], etapas: [],
      ordem: {}, imagens: {}, baseUrl: '', publicacoes: [], versaoAtiva: null, criadoEm: agora, atualizadoEm: agora,
    };
    await armazenamento.criar(evento);
    return Response.json(evento, { status: 201 });
  });
}
