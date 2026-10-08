// Tipos compartilhados entre o navegador e o servidor.
import type { EscolhaSecoes, Formato, Linha, TipoItem, TipoPagina, Vars } from '@norte/motor';

export interface RegistroPagina {
  arquivo: string;
  bytes: number;
  enviadoEm: string;
  convertido?: boolean;
}

export interface Publicacao {
  versao: number;
  /** commit no branch do site */
  commit: string;
  em: string;
  paginas: number;
  avisos: number;
  url: string;
}

export interface Evento {
  id: string;
  slug: string;
  nome: string;
  formato: Formato;
  paginas: Partial<Record<TipoPagina, RegistroPagina>>;
  vars: Vars;
  gerais: Record<string, string>;
  cidades: Linha[];
  etapas: Linha[];
  ordem: Partial<Record<TipoItem, string[]>>;
  /** escolha das mídias de dono geral */
  imagens: Record<string, string>;
  baseUrl: string;
  /** seções escondidas (no evento todo e por cidade). Eventos antigos não têm. */
  secoes?: EscolhaSecoes;
  publicacoes: Publicacao[];
  /** versão no ar (null = nenhuma) */
  versaoAtiva: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ResumoEvento {
  slug: string;
  nome: string;
  formato: Formato;
  cidades: number;
  atualizadoEm: string;
  url: string | null;
}

export interface ArquivoMidia {
  /** caminho relativo, como o HTML usa (ex.: _media/praca/hero/fundo.webp) */
  caminho: string;
  /** sha do blob no git: identifica o conteúdo */
  sha: string;
  bytes: number;
}

export interface EventoCompleto {
  evento: Evento;
  /** versão do evento.json lida (para não sobrescrever o trabalho de outra pessoa) */
  versao: string;
  modelos: Partial<Record<TipoPagina, string>>;
  arquivos: ArquivoMidia[];
}
