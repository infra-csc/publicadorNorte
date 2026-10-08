import { zipSync } from 'fflate';
import { arquivosDoBanco, arquivosUsados, gerarEvento } from '@/lib/comum/montagem';
import { servicos } from '@/lib/servidor/config';
import { erro, responder } from '@/lib/servidor/rotas';

/** .zip com as páginas e só os arquivos que elas usam, nos caminhos que o HTML espera */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return responder(req, async () => {
    const { slug } = await params;
    const { armazenamento } = servicos();
    const c = await armazenamento.ler(slug);
    if (!c) return erro(404, 'Evento não encontrado.');
    const { banco } = await armazenamento.lerBanco();
    const r = gerarEvento(c.evento, c.modelos, c.arquivos, banco);
    if (r.bloqueado) return erro(409, 'Há itens que impedem a geração. Resolva no passo Conferir.');
    const pasta: Record<string, Uint8Array> = {};
    const enc = new TextEncoder();
    for (const p of r.paginas) pasta[p.arquivo] = enc.encode(p.html);
    const usados = [...arquivosUsados(r.paginas.map((p) => p.html), [...c.arquivos, ...arquivosDoBanco(banco)])];
    await Promise.all(usados.map(async ([caminho, a]) => { pasta[caminho] = await armazenamento.lerArquivo(a.sha); }));
    const zip = zipSync(pasta, { level: 6 });
    const nome = `${slug}-${new Date().toISOString().slice(0, 10)}.zip`;
    return new Response(zip as unknown as BodyInit, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${nome}"` } });
  });
}
