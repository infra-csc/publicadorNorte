import type { Publicacao } from '@/lib/comum/tipos';
import { arquivosDoBanco, arquivosUsados, gerarEvento } from '@/lib/comum/montagem';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';
import type { ArquivoPublicado } from '@/lib/servidor/destino';

/** gera as páginas com o que está salvo e publica como versão nova */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return responder(req, async () => {
    const { slug } = await params;
    const { armazenamento, destino } = servicos();
    const c = await armazenamento.ler(slug);
    if (!c) return erro(404, 'Evento não encontrado.');
    const { banco } = await armazenamento.lerBanco();
    const r = gerarEvento(c.evento, c.modelos, c.arquivos, banco);
    if (r.bloqueado) return Response.json({ erro: 'Há itens que impedem a publicação. Resolva no passo Conferir.', avisos: r.avisos }, { status: 409 });
    if (!r.paginas.length) return erro(400, 'Nenhuma página para publicar.');
    const usados = arquivosUsados(r.paginas.map((p) => p.html), [...c.arquivos, ...arquivosDoBanco(banco)]);
    const arquivos: ArquivoPublicado[] = [
      ...r.paginas.map((p) => ({ caminho: p.arquivo, texto: p.html })),
      ...[...usados].map(([caminho, a]) => ({ caminho, sha: a.sha })),
    ];
    const versao = Math.max(0, ...c.evento.publicacoes.map((p) => p.versao)) + 1;
    const { commit } = await destino.publicar(slug, versao, arquivos);
    const pub: Publicacao = { versao, commit, em: new Date().toISOString(), paginas: r.paginas.length, avisos: r.avisos.length, url: await destino.url(slug) };
    const salvo = await armazenamento.atualizar(slug, (e) => { e.publicacoes.push(pub); e.versaoAtiva = versao; delete e.pendencia; }, `Registra a publicação v${versao} de ${slug}`);
    return Response.json({ publicacao: pub, arquivos: usados.size, ...salvo });
  });
}
