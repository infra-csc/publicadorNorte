// Datas: o cadastro guarda dd/mm/aaaa; o HTML escolhe como mostrar, por variações do nome da variável.
//   @data_inicio            13/10/2026 (como foi digitada)
//   @data_inicio_dia        13            @data_inicio_mes        10
//   @data_inicio_mes_nome   outubro       @data_inicio_mes_abrev  out
//   @data_inicio_ano        2026          @data_inicio_curta      13/10
//   @data_inicio_semana     terça-feira   @data_inicio_semana_abrev ter
//   @data_inicio_extenso    13 de outubro de 2026
//   @periodo                13 a 23 out 2026 (de data_inicio a data_fim)
//   @periodo_extenso        13 a 23 de outubro de 2026
// Variável de data é a que se chama "data" ou começa com "data_". Puro: sem relógio, só calendário.

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const SEMANA_ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** formatos, do mais longo para o mais curto (para casar o fim do nome) */
export const FORMATOS_DATA = ['semana_abrev', 'mes_abrev', 'mes_nome', 'extenso', 'semana', 'curta', 'dia', 'mes', 'ano'] as const;
export type FormatoData = (typeof FORMATOS_DATA)[number];

/** variável que guarda data: "data" ou "data_…" (sem ser uma variação de formato de outra) */
export const ehData = (base: string) => base === 'data' || base.startsWith('data_');

/** "data_inicio_mes_nome" → { raiz: "data_inicio", formato: "mes_nome" } */
export function formatoDeData(base: string): { raiz: string; formato: FormatoData } | null {
  for (const f of FORMATOS_DATA) {
    if (!base.endsWith('_' + f)) continue;
    const raiz = base.slice(0, -(f.length + 1));
    if (ehData(raiz)) return { raiz, formato: f };
  }
  return null;
}

export const ehPeriodo = (base: string) => base === 'periodo' || base === 'periodo_extenso';

export interface Data { d: number; m: number; a: number | null }

/** lê dd/mm/aaaa, dd/mm/aa, dd/mm ou aaaa-mm-dd; null se não for data */
export function lerData(v: unknown): Data | null {
  const t = String(v ?? '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return valida(+m[3], +m[2], +m[1]);
  m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/.exec(t);
  if (!m) return null;
  const a = m[3] == null ? null : m[3].length === 2 ? 2000 + +m[3] : +m[3];
  return valida(+m[1], +m[2], a);
}
function valida(d: number, m: number, a: number | null): Data | null {
  if (m < 1 || m > 12 || d < 1) return null;
  const max = [31, a != null && ((a % 4 === 0 && a % 100 !== 0) || a % 400 === 0) ? 29 : a == null ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d > max ? null : { d, m, a };
}

const dois = (n: number) => String(n).padStart(2, '0');
/** como o cadastro guarda: dd/mm/aaaa (ou dd/mm sem ano) */
export const textoData = (x: Data) => `${dois(x.d)}/${dois(x.m)}${x.a != null ? '/' + x.a : ''}`;
/** para o campo de data do navegador (aaaa-mm-dd); '' se não der */
export const paraISO = (v: unknown) => { const x = lerData(v); return x && x.a != null ? `${x.a}-${dois(x.m)}-${dois(x.d)}` : ''; };
/** do campo de data do navegador para o cadastro */
export const deISO = (iso: string) => { const x = lerData(iso); return x ? textoData(x) : ''; };

function diaDaSemana(x: Data): number | null {
  if (x.a == null) return null;
  return new Date(Date.UTC(x.a, x.m - 1, x.d)).getUTCDay();
}

/** uma data no formato pedido; o que não for data sai como foi digitado */
export function formatarData(v: unknown, formato: FormatoData): string {
  const x = lerData(v);
  if (!x) return String(v ?? '').trim();
  const sem = diaDaSemana(x);
  switch (formato) {
    case 'dia': return String(x.d);
    case 'mes': return dois(x.m);
    case 'mes_nome': return MESES[x.m - 1];
    case 'mes_abrev': return MESES_ABREV[x.m - 1];
    case 'ano': return x.a != null ? String(x.a) : '';
    case 'curta': return `${dois(x.d)}/${dois(x.m)}`;
    case 'semana': return sem == null ? '' : SEMANA[sem];
    case 'semana_abrev': return sem == null ? '' : SEMANA_ABREV[sem];
    case 'extenso': return `${x.d} de ${MESES[x.m - 1]}${x.a != null ? ' de ' + x.a : ''}`;
  }
}

/** "13 a 23 out 2026", "28 set a 3 out 2026", "30 dez 2026 a 2 jan 2027" (extenso: "13 a 23 de outubro de 2026") */
export function periodo(inicio: unknown, fim: unknown, extenso = false): string {
  const a = lerData(inicio);
  const b = lerData(fim);
  if (!a) return String(inicio ?? '').trim();
  const mes = (x: Data) => (extenso ? 'de ' + MESES[x.m - 1] : MESES_ABREV[x.m - 1]);
  const ano = (x: Data) => (x.a != null ? (extenso ? ' de ' : ' ') + x.a : '');
  const um = (x: Data) => `${x.d} ${mes(x)}${ano(x)}`;
  if (!b || (b.d === a.d && b.m === a.m && b.a === a.a)) return um(a);
  if (a.a === b.a && a.m === b.m) return `${a.d} a ${um(b)}`;
  if (a.a === b.a || a.a == null || b.a == null) return `${a.d} ${mes(a)} a ${um(b)}`;
  return `${um(a)} a ${um(b)}`;
}

/** modo automático do evento: depois do último dia (mais estas horas) a cidade fica "realizado" */
export interface Automacao { ativo: boolean; horas: number }

/** fuso dos eventos: horário de Brasília (UTC−3, sem horário de verão desde 2019) */
const FUSO_HORAS = 3;

/** momento (ms, UTC) em que a linha vira "realizado": 0h do último dia (data_fim, ou data_inicio) + horas; null sem data completa */
export function limiteRealizado(l: Record<string, string | undefined>, horas: number): number | null {
  const x = lerData(l.data_fim) || lerData(l.data_inicio) || lerData(l.data);
  if (!x || x.a == null) return null;
  return Date.UTC(x.a, x.m - 1, x.d) + (FUSO_HORAS + (Number(horas) || 0)) * 3600e3;
}

/** a linha já passou do fim (só no modo automático; "agora" vem de fora, o motor não lê o relógio) */
export function estaRealizado(l: Record<string, string | undefined>, auto: Automacao | undefined, agora: Date | undefined): boolean {
  if (!auto?.ativo || !agora) return false;
  const lim = limiteRealizado(l, auto.horas);
  return lim != null && agora.getTime() >= lim;
}
