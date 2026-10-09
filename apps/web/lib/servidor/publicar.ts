// Publicar um evento: gera as páginas com o que está salvo e manda como versão nova.
// Usado pelo botão Publicar e pela automação (status "realizado" no modo automático).
import type { Evento, Publicacao } from '../comum/tipos';
import { arquivosDoBanco, arquivosUsados, gerarEvento, realizadosAgora } from '../comum/montagem';
import type { Armazenamento } from './armazenamento';
import type { ArquivoPublicado, DestinoPublicacao } from './destino';

export class NaoPublicavel extends Error {
  constructor(mensagem: string, readonly avisos?: unknown) { super(mensagem); }
}

/**
 * `acompanharProducao` (automação): se a produção estava na mesma versão do teste, ela vai junto para a nova
 * (o "realizado" automático chega ao domínio próprio). Publicar pelo botão só muda o teste.
 */
export async function publicarEvento(armazenamento: Armazenamento, destino: DestinoPublicacao, slug: string, agora = new Date(), opcoes: { acompanharProducao?: boolean } = {}) {
  const c = await armazenamento.ler(slug);
  if (!c) throw new NaoPublicavel('Evento não encontrado.');
  const { banco } = await armazenamento.lerBanco();
  const r = gerarEvento(c.evento, c.modelos, c.arquivos, banco, { agora });
  if (r.bloqueado) throw new NaoPublicavel('Há itens que impedem a publicação. Resolva no passo Conferir.', r.avisos);
  if (!r.paginas.length) throw new NaoPublicavel('Nenhuma página para publicar.');
  const usados = arquivosUsados(r.paginas.map((p) => p.html), [...c.arquivos, ...arquivosDoBanco(banco)]);
  const arquivos: ArquivoPublicado[] = [
    ...r.paginas.map((p) => ({ caminho: p.arquivo, texto: p.html })),
    ...[...usados].map(([caminho, a]) => ({ caminho, sha: a.sha })),
  ];
  const versao = Math.max(0, ...c.evento.publicacoes.map((p) => p.versao)) + 1;
  const { commit } = await destino.publicar(slug, versao, arquivos);
  const pub: Publicacao = { versao, commit, em: agora.toISOString(), paginas: r.paginas.length, avisos: r.avisos.length, url: await destino.url(slug) };
  const realizados = realizadosAgora(c.evento, agora);
  const registrar = (e: Evento) => {
    e.publicacoes.push(pub);
    e.versaoAtiva = versao;
    delete e.pendencia;
    if (e.automacao) e.automacao.realizados = realizados;
  };
  const p = c.evento.producao;
  const junto = opcoes.acompanharProducao && p?.versao != null && p.versao === c.evento.versaoAtiva && p.dominios.length > 0;
  const salvo = junto
    ? await armazenamento.atualizarProducao(slug, (e) => { registrar(e); levarParaProducao(e, versao, agora); }, `Registra a publicação v${versao} de ${slug} (teste e produção)`)
    : await armazenamento.atualizar(slug, registrar, `Registra a publicação v${versao} de ${slug}`);
  return { publicacao: pub, arquivos: usados.size, ...salvo };
}

/** põe a versão (já publicada no teste) em produção; null tira do ar */
export function levarParaProducao(e: Evento, versao: number | null, agora = new Date()) {
  const pub = versao == null ? null : e.publicacoes.find((x) => x.versao === versao);
  if (versao != null && !pub) throw new NaoPublicavel(`A versão ${versao} não existe.`);
  const p = (e.producao ||= { dominios: [], versao: null, commit: null, historico: [] });
  p.versao = pub ? pub.versao : null;
  p.commit = pub ? pub.commit : null;
  p.em = agora.toISOString();
  p.historico = [...(p.historico || []), { versao: p.versao, em: p.em }].slice(-50);
}
