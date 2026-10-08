// Junta o motor com os dados guardados: gera as páginas e descobre quais arquivos cada página usa.
import { acharArquivo, gerar, normRef, refsDeArquivo, type ResultadoGerar } from '@norte/motor';
import type { ArquivoMidia, Evento } from './tipos';

export function gerarEvento(evento: Evento, modelos: Partial<Record<string, string>>, arquivos: ArquivoMidia[]): ResultadoGerar {
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
