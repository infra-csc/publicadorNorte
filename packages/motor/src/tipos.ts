export type Formato = 'unica' | 'tapume_praca' | 'tapume_etapa_praca';
export type TipoPagina = 'unica' | 'tapume' | 'praca' | 'etapa';
export type TipoItem = 'cidade' | 'etapa';
/** Em qual tabela o valor da variável é preenchido. */
export type Dono = 'geral' | 'cidade' | 'etapa' | 'auto';

export const FORMATOS: Record<Formato, { nome: string; paginas: TipoPagina[] }> = {
  unica: { nome: 'One page', paginas: ['unica'] },
  tapume_praca: { nome: 'Tapume + praça', paginas: ['tapume', 'praca'] },
  tapume_etapa_praca: { nome: 'Tapume + praça + etapa', paginas: ['tapume', 'praca', 'etapa'] },
};

export const NOME_PAGINA: Record<TipoPagina, string> = {
  unica: 'Página',
  tapume: 'Tapume',
  praca: 'Praça',
  etapa: 'Etapa',
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
