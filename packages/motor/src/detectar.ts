import { lerBlocos, type No, type ErroBloco } from './blocos';
import { ehPeriodo, formatoDeData } from './datas';
import { slug } from './texto';
import { FORMATOS, tipoBase, type Dono, type EstadoVar, type Formato, type Modelos, type TipoItem, type TipoPagina, type Vars } from './tipos';
import { ehMidia, varsDoTexto } from './variaveis';

export interface Ocorrencia {
  tok: string;
  base: string;
  num: number | null;
  /** dentro de qual @repetir está (agrupar conta como cidade) */
  laco: TipoItem | null;
  /** só aparece como coluna de bloco (@se gratuito = sim, @agrupar por regiao) */
  sint?: boolean;
  /** valor testado em @se coluna = valor */
  opc?: string | null;
}

export interface VarDetectada {
  base: string;
  /** em quais páginas aparece, e quantas vezes no texto */
  por: Partial<Record<TipoPagina, number>>;
  numerada: boolean;
  laco: TipoItem | null;
  nums: number[];
}

export interface Deteccao {
  formato: Formato;
  /** na ordem em que aparecem (praça, etapa, tapume) */
  variaveis: Map<string, VarDetectada>;
  /** valores usados em @se coluna = valor. status sempre tem ["em breve", …] */
  opcoes: Record<string, string[]>;
  erros: Partial<Record<TipoPagina, ErroBloco[]>>;
}

/** percorre os textos dizendo se estão dentro de um bloco que repete (e de quê) */
function andar(nos: No[], laco: TipoItem | null, fn: (s: string, laco: TipoItem | null) => void, extra?: (n: No, laco: TipoItem | null) => void): void {
  for (const n of nos) {
    if (n.t === 'txt') fn(n.s, laco);
    else if (n.t === 'repetir') andar(n.filhos, n.alvo === 'galeria' ? laco : n.alvo, fn, extra);
    else if (n.t === 'agrupar') { extra?.(n, laco); andar(n.filhos, laco || 'cidade', fn, extra); }
    else if (n.t === 'se') { extra?.(n, laco); andar(n.filhos, laco, fn, extra); andar(n.senao, laco, fn, extra); }
  }
}

/** variáveis de cada foto dentro de @repetir galeria: o publicador preenche (não viram coluna nem campo) */
export const VARS_GALERIA = new Set(['galeria_foto', 'galeria_legenda', 'galeria_cidade', 'galeria_numero']);

/** nomes das galerias usadas nos HTMLs (`@repetir galeria`, `@repetir galeria_bastidores`) */
export function galeriasDe(modelos: Partial<Record<string, string | null | undefined>>): string[] {
  const out = new Set<string>();
  for (const h of Object.values(modelos)) for (const m of String(h || '').matchAll(/<!--\s*@repetir\s+(galeria\w*)/gi)) out.add(m[1].toLowerCase());
  return [...out];
}

export function acharVars(html: string): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  andar(
    lerBlocos(html).raiz,
    null,
    (s, laco) => { for (const a of varsDoTexto(s)) if (!VARS_GALERIA.has(a.base)) out.push({ tok: a.tok, base: a.base, num: a.num, laco }); },
    (n, laco) => {
      if ((n.t === 'se' || n.t === 'agrupar') && n.col && !VARS_GALERIA.has(n.col)) {
        out.push({ tok: '@' + n.col, base: n.col, num: null, laco, sint: true, opc: n.t === 'se' && n.op ? n.val : null });
      }
    },
  );
  return out;
}

/** status reconhecidos em @total_<status> */
export const STATUS_CONHECIDOS = ['breve', 'em_breve', 'realizado', 'realizada', 'aberta', 'aberto', 'abertas', 'encerrada', 'encerrado', 'esgotada', 'esgotado', 'adiada', 'cancelada'];

/** @total_cidades/pracas/etapas e @total_<status> são contagens; outros @total_… (ex.: @total_categorias) são variáveis comuns */
export function ehContagem(base: string, opcoes: Record<string, string[]>): boolean {
  const m = /^total_(\w+)$/.exec(base);
  if (!m) return false;
  const q = m[1];
  return ['cidades', 'pracas', 'etapas'].includes(q) || STATUS_CONHECIDOS.includes(q) || (opcoes.status || []).some((o) => slug(o).replace(/-/g, '_') === q);
}

/** raiz de @x_abrev, se @x existe */
export function raizAbrev(base: string, existe: (b: string) => boolean): string | null {
  if (!/_abrev$/.test(base)) return null;
  const r = base.slice(0, -6);
  return existe(r) ? r : null;
}

/** nomes fixos da base: dados de cada cidade (num @se, sempre da cidade) */
export const NOMES_BASE = new Set([
  'cidade', 'uf', 'regiao', 'status', 'local', 'data_inicio', 'data_fim', 'gratuito', 'preco_vista', 'parcelamento', 'valor_parcelado',
  'porcentagem_desconto', 'preco_comum', 'desconto_em_reais', 'link_inscricao', 'preco_prime', 'preco_prime_parcelado',
  'valor_adicional_prime', 'link_inscricao_prime',
]);

/** detecção consolidada de todas as páginas do evento */
export function detectar(modelos: Modelos, formato: Formato): Deteccao {
  const mapa = new Map<string, VarDetectada>();
  const opc: Record<string, Set<string>> = {};
  const erros: Deteccao['erros'] = {};
  // @se x fora de laço sem @x_1 em lugar nenhum: segue o texto. Se @x aparece solto (sem _1), é igual em todas as páginas
  const soNoSe = new Set<string>();
  const solta = new Set<string>();
  const paginas = [...FORMATOS[formato].paginas, ...FORMATOS[formato].pos];
  // a página do One page funciona como uma praça (com a linha única do cadastro); o pós-evento vem depois
  for (const k of ['praca', 'unica', 'etapa', 'tapume', 'pos_praca', 'pos_unica', 'pos_etapa'] as TipoPagina[]) {
    const html = modelos[k];
    if (!paginas.includes(k) || html == null) continue;
    erros[k] = lerBlocos(html).erros;
    for (const o of acharVars(html)) {
      let d = mapa.get(o.base);
      if (!d) { d = { base: o.base, por: {}, numerada: false, laco: null, nums: [] }; mapa.set(o.base, d); }
      d.por[k] = (d.por[k] || 0) + (o.sint ? 0 : 1);
      // coluna de bloco fora de laço é da linha da página (como @x_1), a não ser que o texto dela seja @x (sem _1)
      if (o.num != null) d.numerada = true;
      else if (o.sint && !o.laco) soNoSe.add(o.base);
      else if (!o.laco) solta.add(o.base);
      if (o.num != null && !d.nums.includes(o.num)) d.nums.push(o.num);
      if (o.laco) d.laco = d.laco || o.laco;
      if (o.opc) (opc[o.base] = opc[o.base] || new Set()).add(o.opc);
    }
  }
  for (const b of soNoSe) if (!solta.has(b) || NOMES_BASE.has(b)) mapa.get(b)!.numerada = true;
  // variações de data (@data_inicio_dia, @periodo…) precisam da data guardada: a coluna vem sozinha
  for (const d of [...mapa.values()]) {
    const fd = formatoDeData(d.base);
    const raizes = fd ? [fd.raiz] : ehPeriodo(d.base) ? ['data_inicio', 'data_fim'] : [];
    for (const r of raizes) {
      const x = mapa.get(r);
      if (!x) mapa.set(r, { base: r, por: { ...d.por }, numerada: d.numerada, laco: d.laco, nums: [...d.nums] });
      else {
        x.numerada = x.numerada || d.numerada;
        x.laco = x.laco || d.laco;
        for (const k of Object.keys(d.por) as TipoPagina[]) x.por[k] = x.por[k] ?? 0;
      }
    }
  }
  if (opc.status) {
    // @total_aberta também diz que "aberta" é um status válido
    for (const b of mapa.keys()) {
      const m = b.match(/^total_(\w+)$/);
      if (m && STATUS_CONHECIDOS.includes(m[1])) opc.status.add(m[1] === 'em_breve' ? 'breve' : m[1].replace(/_/g, ' '));
    }
    // "em breve" é o padrão e sempre existe; "aberta" é a outra opção
    const outras = [...opc.status].filter((o) => !['breve', 'em-breve'].includes(slug(o)));
    // "realizado" sempre existe (o modo automático usa; no manual dá para escolher)
    opc.status = new Set(['em breve', ...(outras.length ? outras : ['aberta']), ...(outras.some((o) => /^realizad/.test(slug(o))) ? [] : ['realizado'])]);
  }
  const opcoes: Record<string, string[]> = {};
  for (const [k, s] of Object.entries(opc)) opcoes[k] = [...s];
  return { formato, variaveis: mapa, opcoes, erros };
}

/** variável que só aparece nos HTMLs de pós-evento (preenchida no passo Pós-evento, não no Cadastro) */
export function soNoPos(d: VarDetectada | undefined): boolean {
  const k = d ? Object.keys(d.por) : [];
  return k.length > 0 && k.every((x) => x.startsWith('pos_'));
}

/** textos gerais com valor padrão (editáveis no cadastro e na prévia): valem para o site todo, mesmo dentro de @repetir */
export const TEXTOS_PADRAO: Record<string, string> = { a_confirmar: 'A confirmar' };

export function inferirDono(d: VarDetectada, det: Deteccao): Dono {
  if (d.base === 'url' || ehContagem(d.base, det.opcoes) || raizAbrev(d.base, (b) => det.variaveis.has(b))) return 'auto';
  if (d.base in TEXTOS_PADRAO) return 'geral';
  if (formatoDeData(d.base) || ehPeriodo(d.base)) return 'auto';
  // One page: tudo é geral; só o que está dentro de @repetir cidades é coluna da lista de cidades
  if (det.formato === 'unica') return d.laco ? 'cidade' : 'geral';
  const etapas = det.formato === 'tapume_etapa_praca';
  if (d.laco) return d.laco === 'etapa' && etapas ? 'etapa' : 'cidade';
  if (!d.numerada) return 'geral';
  // home → cidade → etapa: o que só aparece na página da etapa (ou no pós-evento dela) é da etapa
  if (etapas) {
    const tipos = new Set((Object.keys(d.por) as TipoPagina[]).map(tipoBase));
    return tipos.has('etapa') && !tipos.has('praca') && !tipos.has('tapume') ? 'etapa' : 'cidade';
  }
  return 'cidade';
}

/** Dono padrão de cada variável detectada. */
export function inferirDonos(det: Deteccao): Record<string, Dono> {
  const out: Record<string, Dono> = {};
  for (const d of det.variaveis.values()) out[d.base] = inferirDono(d, det);
  return out;
}

/** Fórmulas sugeridas: aplicadas quando a variável aparece pela primeira vez; editáveis. */
export const FORMULAS_PADRAO: Record<string, string> = {
  preco_vista: 'parcelamento * valor_parcelado',
  valor_parcelado: 'preco_vista / parcelamento',
  preco_comum: 'preco_vista / (1 - porcentagem_desconto / 100)',
  desconto_em_reais: 'preco_comum - preco_vista',
  preco_prime_parcelado: 'preco_prime / parcelamento',
  valor_adicional_prime: 'preco_prime - preco_vista',
};

/**
 * Estado das variáveis depois de um envio de HTML: as novas ganham dono inferido e fórmula padrão;
 * as que já existiam têm o dono deduzido de novo, a não ser que alguém tenha movido à mão.
 * Não altera `vars`: devolve uma cópia.
 */
export function sincronizarVars(det: Deteccao, vars: Vars = {}): Vars {
  const out: Vars = {};
  for (const [k, v] of Object.entries(vars)) out[k] = { ...v };
  for (const d of det.variaveis.values()) {
    let v: EstadoVar | undefined = out[d.base];
    if (!v) v = out[d.base] = { dono: inferirDono(d, det), ignorar: false };
    else if (!v.manual) v.dono = inferirDono(d, det);
    if (v.formula === undefined && FORMULAS_PADRAO[d.base]) v.formula = FORMULAS_PADRAO[d.base];
  }
  return out;
}

export const ORDEM_PADRAO = [
  'cidade', 'uf', 'regiao', 'status', 'local', 'data_inicio', 'data_fim', 'gratuito', 'mes_outono', 'mes_inverno', 'mes_primavera', 'mes_verao',
  'parcelamento', 'valor_parcelado', 'preco_vista', 'porcentagem_desconto', 'preco_comum', 'desconto_em_reais', 'preco_prime',
  'preco_prime_parcelado', 'valor_adicional_prime', 'link_inscricao', 'link_inscricao_prime',
];

/** Colunas de uma tabela: variáveis daquele dono, menos url, mídia, excluídas e ignoradas, mais as extras. */
export function colunas(dono: Dono, det: Deteccao, vars: Vars, ordem?: Partial<Record<string, string[]>>): string[] {
  const extras = Object.keys(vars).filter((b) => vars[b].extra && !det.variaveis.has(b));
  const lista = [...det.variaveis.keys(), ...extras].filter(
    (b) => b !== 'url' && !ehMidia(b) && vars[b] && !vars[b].excluida && !vars[b].ignorar && vars[b].dono === dono,
  );
  const ord = ordem?.[dono] || [];
  const peso = (b: string) => {
    const i = ord.indexOf(b);
    if (i >= 0) return i;
    const j = ORDEM_PADRAO.indexOf(b);
    return 1000 + (j >= 0 ? j : 500);
  };
  return lista.map((b, i) => [b, i] as const).sort((a, b) => peso(a[0]) - peso(b[0]) || a[1] - b[1]).map((x) => x[0]);
}
