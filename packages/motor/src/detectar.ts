import { lerBlocos, type No, type ErroBloco } from './blocos';
import { ehPeriodo, formatoDeData } from './datas';
import { slug } from './texto';
import { FORMATOS, type Dono, type EstadoVar, type Formato, type Modelos, type TipoItem, type TipoPagina, type Vars } from './tipos';
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
    else if (n.t === 'repetir') andar(n.filhos, n.alvo, fn, extra);
    else if (n.t === 'agrupar') { extra?.(n, laco); andar(n.filhos, laco || 'cidade', fn, extra); }
    else if (n.t === 'se') { extra?.(n, laco); andar(n.filhos, laco, fn, extra); andar(n.senao, laco, fn, extra); }
  }
}

export function acharVars(html: string): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  andar(
    lerBlocos(html).raiz,
    null,
    (s, laco) => { for (const a of varsDoTexto(s)) out.push({ tok: a.tok, base: a.base, num: a.num, laco }); },
    (n, laco) => {
      if ((n.t === 'se' || n.t === 'agrupar') && n.col) {
        out.push({ tok: '@' + n.col, base: n.col, num: null, laco, sint: true, opc: n.t === 'se' && n.op ? n.val : null });
      }
    },
  );
  return out;
}

/** status reconhecidos em @total_<status> */
export const STATUS_CONHECIDOS = ['breve', 'em_breve', 'aberta', 'aberto', 'abertas', 'encerrada', 'encerrado', 'esgotada', 'esgotado', 'adiada', 'cancelada'];

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

/** detecção consolidada de todas as páginas do evento */
export function detectar(modelos: Modelos, formato: Formato): Deteccao {
  const mapa = new Map<string, VarDetectada>();
  const opc: Record<string, Set<string>> = {};
  const erros: Deteccao['erros'] = {};
  const paginas = FORMATOS[formato].paginas;
  // a página do One page funciona como uma praça (com a linha única do cadastro)
  for (const k of ['praca', 'unica', 'etapa', 'tapume'] as TipoPagina[]) {
    const html = modelos[k];
    if (!paginas.includes(k) || html == null) continue;
    erros[k] = lerBlocos(html).erros;
    for (const o of acharVars(html)) {
      let d = mapa.get(o.base);
      if (!d) { d = { base: o.base, por: {}, numerada: false, laco: null, nums: [] }; mapa.set(o.base, d); }
      d.por[k] = (d.por[k] || 0) + (o.sint ? 0 : 1);
      // coluna de bloco fora de laço é da linha da página (como @x_1)
      if (o.num != null || (o.sint && !o.laco)) d.numerada = true;
      if (o.num != null && !d.nums.includes(o.num)) d.nums.push(o.num);
      if (o.laco) d.laco = d.laco || o.laco;
      if (o.opc) (opc[o.base] = opc[o.base] || new Set()).add(o.opc);
    }
  }
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
    opc.status = new Set(['em breve', ...(outras.length ? outras : ['aberta'])]);
  }
  const opcoes: Record<string, string[]> = {};
  for (const [k, s] of Object.entries(opc)) opcoes[k] = [...s];
  return { formato, variaveis: mapa, opcoes, erros };
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
  // home → cidade → etapa: o que só aparece na página da etapa é da etapa
  if (etapas) return 'etapa' in d.por && !('praca' in d.por) && !('tapume' in d.por) ? 'etapa' : 'cidade';
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
