// Junta o motor com os dados guardados: gera as páginas e descobre quais arquivos cada página usa.
import { acharArquivo, COTAS_PADRAO, gerar, normRef, PASTA_LOGOS, refsDeArquivo, type Cota, type ResultadoGerar } from '@norte/motor';
import type { ArquivoMidia, BancoPatrocinios, Evento } from './tipos';

/** logos do banco de patrocinadores, como arquivos do site (_patrocinadores/…) */
export const arquivosDoBanco = (banco: BancoPatrocinios | null | undefined): ArquivoMidia[] =>
  (banco?.patrocinadores || []).map((p) => ({ caminho: PASTA_LOGOS + p.logo, sha: p.sha, bytes: p.bytes }));

/**
 * Cotas que valem no evento: as gerais (aba Patrocínios → Cotas; sem nenhuma, as padrão)
 * e, depois delas, cotas antigas criadas só no evento.
 */
export function cotasDoEvento(evento: Pick<Evento, 'patrocinios'>, banco: Pick<BancoPatrocinios, 'cotas'> | null | undefined): Cota[] {
  const gerais = banco?.cotas?.length ? banco.cotas : COTAS_PADRAO;
  return [...gerais, ...(evento.patrocinios?.cotas || []).filter((c) => !gerais.some((g) => g.id === c.id))];
}

/**
 * Páginas que têm seção de patrocinadores (só as internas): a página do One page ("unica"),
 * cada praça no tapume + praça e cada etapa no formato com etapas. O tapume nunca tem.
 */
export function paginasComPatrocinio(evento: Pick<Evento, 'formato' | 'cidades' | 'etapas'>): { id: string; nome: string }[] {
  const nomeCidade = (c: Evento['cidades'][number], i: number) => String(c.cidade || c.praca || c.nome || c.local || '').trim() || `Cidade ${i + 1}`;
  if (evento.formato === 'unica') return [{ id: 'unica', nome: 'Página' }];
  if (evento.formato === 'tapume_praca') return evento.cidades.map((c, i) => ({ id: c._id, nome: nomeCidade(c, i) }));
  return evento.etapas.flatMap((et, j) => {
    const i = evento.cidades.findIndex((c) => c._id === et._cidade);
    if (i < 0) return [];
    const nomeEtapa = String(et.etapa || et.nome || et.estacao || et.titulo || '').trim() || `Etapa ${j + 1}`;
    return [{ id: et._id, nome: `${nomeCidade(evento.cidades[i], i)} · ${nomeEtapa}` }];
  });
}

/** página gerada que corresponde a uma página com patrocínio (para a prévia) */
export const paginaDoPatrocinio = (paginas: ResultadoGerar['paginas'], id: string) =>
  paginas.find((p) => (id === 'unica' ? p.tipo === 'unica' : p.etapaId === id || (p.tipo === 'praca' && !p.etapaId && p.cidadeId === id)));

export function gerarEvento(evento: Evento, modelos: Partial<Record<string, string>>, arquivos: ArquivoMidia[], banco?: BancoPatrocinios | null): ResultadoGerar {
  return gerar({
    formato: evento.formato,
    modelos,
    vars: evento.vars,
    gerais: evento.gerais,
    cidades: evento.cidades,
    etapas: evento.etapas,
    ordem: evento.ordem,
    imagens: evento.imagens,
    secoes: evento.secoes,
    rodape: evento.rodape,
    patrocinios: banco ? { porPagina: evento.patrocinios?.porPagina || {}, estilo: evento.patrocinios?.estilo, patrocinadores: banco.patrocinadores, cotas: cotasDoEvento(evento, banco) } : undefined,
    arquivos: arquivos.map((a) => a.caminho),
  });
}

/**
 * Arquivos que as páginas usam, no caminho em que o HTML os procura (como o .zip do protótipo):
 * caminho no site → arquivo guardado.
 */
export function arquivosUsados(htmls: string[], arquivos: ArquivoMidia[]): Map<string, ArquivoMidia> {
  const porCaminho = new Map(arquivos.map((a) => [a.caminho, a]));
  const out = new Map<string, ArquivoMidia>();
  for (const html of htmls) {
    for (const ref of refsDeArquivo(html)) {
      const caminho = normRef(ref);
      if (out.has(caminho) || caminho.startsWith('/') || caminho.includes('..')) continue;
      const k = acharArquivo(ref, porCaminho.keys());
      if (k) out.set(caminho, porCaminho.get(k)!);
    }
  }
  return out;
}

/** Prévia: troca cada caminho que o HTML usa pelo endereço do arquivo guardado. */
export function comArquivosDaPrevia(html: string, arquivos: ArquivoMidia[], urlDe: (a: ArquivoMidia) => string): string {
  const porCaminho = new Map(arquivos.map((a) => [a.caminho, a]));
  for (const ref of refsDeArquivo(html)) {
    const k = acharArquivo(ref, porCaminho.keys());
    if (k) html = html.split(ref).join(urlDe(porCaminho.get(k)!));
  }
  return html;
}
