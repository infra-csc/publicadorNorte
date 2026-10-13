export type Formato = 'unica' | 'tapume_praca' | 'tapume_etapa_praca';
export type TipoPagina = 'unica' | 'tapume' | 'praca' | 'etapa' | TipoPos;
/** pós-evento: outro HTML que, quando ativado, entra no lugar da página (mesmo endereço) */
export type TipoPos = 'pos_unica' | 'pos_praca' | 'pos_etapa';
export type TipoItem = 'cidade' | 'etapa';
/** Em qual tabela o valor da variável é preenchido. */
export type Dono = 'geral' | 'cidade' | 'etapa' | 'auto';

export const FORMATOS: Record<Formato, { nome: string; paginas: TipoPagina[]; /** HTMLs de pós-evento (opcionais) */ pos: TipoPos[] }> = {
  unica: { nome: 'One page', paginas: ['unica'], pos: ['pos_unica'] },
  tapume_praca: { nome: 'Tapume + praça', paginas: ['tapume', 'praca'], pos: ['pos_praca'] },
  tapume_etapa_praca: { nome: 'Tapume + praça + etapa', paginas: ['tapume', 'praca', 'etapa'], pos: ['pos_praca', 'pos_etapa'] },
};

/** página que o pós-evento substitui */
export const BASE_DO_POS: Record<TipoPos, 'unica' | 'praca' | 'etapa'> = { pos_unica: 'unica', pos_praca: 'praca', pos_etapa: 'etapa' };
export const ehPos = (k: TipoPagina): k is TipoPos => k in BASE_DO_POS;
/** a página normal de um tipo (o pós-evento vira a página que ele substitui) */
export const tipoBase = (k: TipoPagina): TipoPagina => (ehPos(k) ? BASE_DO_POS[k] : k);

export const NOME_PAGINA: Record<TipoPagina, string> = {
  unica: 'Página',
  tapume: 'Tapume',
  praca: 'Praça',
  etapa: 'Etapa',
  pos_unica: 'Pós-evento',
  pos_praca: 'Pós-evento da praça',
  pos_etapa: 'Pós-evento da etapa',
};

export interface EstadoVar {
  dono: Dono;
  /** alguém moveu à mão: a inferência não mexe mais no dono */
  manual?: boolean;
  /** não é variável: fica no HTML como está escrita */
  ignorar?: boolean;
  /** sai do cadastro e vira vazio na página */
  excluida?: boolean;
  /** coluna criada no cadastro com "+ Coluna" */
  extra?: boolean;
  formula?: string;
}
export type Vars = Record<string, EstadoVar>;

/** Uma linha do cadastro (cidade ou etapa). As colunas mudam por evento. */
export interface Linha {
  _id: string;
  _arquivo?: string;
  /** só em etapas: o _id da cidade */
  _cidade?: string;
  [coluna: string]: string | undefined;
}

export type Modelos = Partial<Record<TipoPagina, string>>;

export type Passo = 'evento' | 'paginas' | 'variaveis' | 'cadastro' | 'midia' | 'patrocinios' | 'secoes' | 'conferir' | 'publicar';

export interface Aviso {
  /** código estável para a interface e os testes */
  codigo:
    | 'falta-html'
    | 'sem-realizado'
    | 'sem-cidades'
    | 'linhas-vazias'
    | 'sem-etapas'
    | 'arquivo-duplicado'
    | 'bloco-mal-fechado'
    | 'etapas-sem-cidade'
    | 'valor-desconhecido'
    | 'cards-fixos'
    | 'midia-sem-arquivo'
    | 'campos-vazios'
    | 'gerais-vazios'
    | 'espacos-sobrando'
    | 'patrocinador-fora';
  nivel: 'bloqueia' | 'alerta';
  titulo: string;
  detalhe: string;
  /** passo onde se corrige */
  passo: Passo;
  /** título da página que gerou o aviso, quando é de uma página só */
  pagina?: string;
}
