// Tipos compartilhados entre o navegador e o servidor.
import type { ComposicaoPatrocinio, Cota, EscolhaRodape, EscolhaSecoes, EstiloPatrocinio, Formato, Patrocinador, Linha, TipoItem, TipoPagina, Vars } from '@norte/motor';

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
  /** rodapé padrão do publicador */
  rodape?: EscolhaRodape;
  /** seção de patrocinadores: composição por página ("tapume" e o _id de cada cidade) */
  patrocinios?: { porPagina: Record<string, ComposicaoPatrocinio>; estilo?: EstiloPatrocinio; /** cotas do evento (sem isso, as padrão) */ cotas?: Cota[] };
  /** mudanças feitas fora do evento (ex.: na aba Patrocínios) que ainda não foram publicadas */
  pendencia?: { desde: string; motivos: string[] };
  /** modo automático: depois do último dia (+ horas) a cidade/etapa vira "realizado" e o site é republicado sozinho */
  automacao?: { ativo: boolean; horas: number; /** linhas que já saíram como "realizado" na última publicação */ realizados?: string[] };
  /** ordem dos blocos de mídia na tela do publicador, por página (não muda o site) */
  ordemMidia?: Partial<Record<TipoPagina, string[]>>;
  publicacoes: Publicacao[];
  /** versão no ar no endereço de teste (null = nenhuma) */
  versaoAtiva: number | null;
  /** fotos das galerias (`@repetir galeria` no HTML), cada uma com a cidade (_id) ou vazio = todas */
  galerias?: Record<string, { id: string; arquivo: string; cidade?: string; legenda?: string }[]>;
  /** SEO e compartilhamento (vazio = automático) */
  seo?: SeoEvento;
  /** produção: o site no domínio próprio do evento (uma versão já publicada no teste) */
  producao?: Producao;
  /** pós-evento: páginas em que o HTML de pós entra no lugar ("unica" ou _id da cidade/etapa) e se liga sozinho no "realizado" */
  pos?: { ativos: string[]; comRealizado?: boolean };
  /** publicação agendada: na hora marcada, o que estiver salvo vai para o teste (e para a produção, se pedido) */
  agendamento?: Agendamento;
  /** resultado do último agendamento (some quando outro é marcado) */
  ultimoAgendamento?: { em: string; ok: boolean; mensagem: string; versao?: number };
  criadoEm: string;
  atualizadoEm: string;
}

/** patrocinador no banco geral, com o arquivo do logo guardado */
export interface PatrocinadorBanco extends Patrocinador {
  sha: string;
  bytes: number;
  criadoEm: string;
}

/** banco geral de patrocinadores: alimenta todos os eventos */
export interface BancoPatrocinios {
  patrocinadores: PatrocinadorBanco[];
  cotas: Cota[];
  atualizadoEm: string;
}

/** onde cada patrocinador é usado: id → eventos */
export interface AplicacaoPatrocinador {
  /** "tapume" ou o _id da cidade */
  pagina: string;
  nomePagina: string;
  bloco: string;
  cota: string;
  cotaNome: string;
  /** tamanho próprio do logo ('' = o da cota) */
  tamanho: string;
  tamanhoCota: string;
}
/** evento visto pela aba Patrocínios: páginas e cotas para adicionar logos */
export interface EventoPatrocinavel { slug: string; nome: string; publicado: boolean; pendente: boolean; cotas: Cota[]; paginas: { id: string; nome: string }[] }
export type UsoPatrocinadores = Record<string, { slug: string; nome: string; publicado: boolean; pendente: boolean; aplicacoes: AplicacaoPatrocinador[]; cotas: Cota[] }[]>;

/** passo SEO: o que ficar vazio sai automático (do HTML, do nome do evento, do primeiro parágrafo, da primeira foto) */
export interface SeoEvento {
  /** ícone da aba (caminho na mídia) */
  favicon?: string;
  titulo?: string;
  descricao?: string;
  /** redes sociais (WhatsApp, Facebook, LinkedIn, X) */
  share?: { imagem?: string; titulo?: string; descricao?: string };
  /** cada cidade/etapa (pelo _id): o que ficar vazio herda da principal, com o nome na frente do título */
  porPagina?: Record<string, { favicon?: string; titulo?: string; descricao?: string; share?: { imagem?: string; titulo?: string; descricao?: string } }>;
}

export interface Producao {
  /** domínios do evento; o primeiro é o principal, os outros redirecionam para ele (ex.: www) */
  dominios: string[];
  /** versão em produção (null = fora do ar) */
  versao: number | null;
  /** commit do site (branch de publicação) com essa versão */
  commit: string | null;
  em?: string;
  historico: { versao: number | null; em: string }[];
}

/** índice lido pelo Worker que entrega os sites: domínio → evento e versão */
export interface IndiceProducao {
  sites: Record<string, { slug: string; commit: string; versao: number; principal: string }>;
}

export interface Agendamento {
  /** quando publicar (ISO, UTC) */
  em: string;
  /** levar também para a produção (precisa de domínio) */
  producao: boolean;
  criadoEm: string;
}

export interface ResumoEvento {
  slug: string;
  nome: string;
  formato: Formato;
  cidades: number;
  atualizadoEm: string;
  url: string | null;
  /** há mudança esperando publicação */
  pendente: boolean;
  /** domínio principal, se estiver em produção */
  producao?: string | null;
  /** publicação agendada (ISO) */
  agendado?: string | null;
  /** modo automático (realizado) ligado */
  automatico?: boolean;
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
