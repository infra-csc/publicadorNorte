import type { TipoItem } from './tipos';

// <!-- @repetir cidades -->, <!-- @agrupar por regiao -->, <!-- @se status = aberta -->, <!-- @senao -->, <!-- @fim -->
export const RX_MARCA = /<!--\s*@(repetir|agrupar|se|senao|fim)\b([\s\S]*?)-->/g;

export interface NoTxt { t: 'txt'; s: string; ini: number }
/** repetir cidades/etapas, ou as fotos de uma galeria (`@repetir galeria`, `@repetir galeria_bastidores`) */
export interface NoRepetir { t: 'repetir'; alvo: TipoItem | 'galeria'; colecao?: string; filhos: No[]; ini: number }
export interface NoAgrupar { t: 'agrupar'; col: string; filhos: No[]; ini: number }
export interface NoSe {
  t: 'se';
  col: string;
  op: '' | '=' | '!=';
  val: string;
  /** argumento como foi escrito (para o verificador) */
  arg: string;
  filhos: No[];
  senao: No[];
  emSenao: boolean;
  ini: number;
  iniSenao: number | null;
}
export type No = NoTxt | NoRepetir | NoAgrupar | NoSe;
export interface ErroBloco { msg: string; ini: number }

/** nome da coluna: sem @ inicial e sem sufixo _N (`@se gratuito_1 = sim` ≡ `@se gratuito = sim`) */
export const nomeCol = (s: string): string =>
  String(s || '').trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_\d+$/, '');

export function lerBlocos(src: string): { raiz: No[]; erros: ErroBloco[] } {
  const raiz: NoRepetir = { t: 'repetir', alvo: 'cidade', filhos: [], ini: 0 };
  const pilha: (NoRepetir | NoAgrupar | NoSe)[] = [raiz];
  const erros: ErroBloco[] = [];
  const topo = () => pilha[pilha.length - 1];
  const destino = (n: NoRepetir | NoAgrupar | NoSe): No[] => (n.t === 'se' && n.emSenao ? n.senao : n.filhos);
  const rx = new RegExp(RX_MARCA.source, 'g');
  let ult = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src))) {
    if (m.index > ult) destino(topo()).push({ t: 'txt', s: src.slice(ult, m.index), ini: ult });
    ult = m.index + m[0].length;
    const kw = m[1];
    const arg = m[2].trim();
    if (kw === 'repetir') {
      const gal = /^galeria\w*/i.exec(arg)?.[0].toLowerCase();
      const n: NoRepetir = gal
        ? { t: 'repetir', alvo: 'galeria', colecao: gal, filhos: [], ini: m.index }
        : { t: 'repetir', alvo: /etapa/i.test(arg) ? 'etapa' : 'cidade', filhos: [], ini: m.index };
      destino(topo()).push(n);
      pilha.push(n);
    } else if (kw === 'agrupar') {
      const n: NoAgrupar = { t: 'agrupar', col: nomeCol(arg.replace(/^por\s+/i, '')), filhos: [], ini: m.index };
      destino(topo()).push(n);
      pilha.push(n);
    } else if (kw === 'se') {
      const mm = arg.match(/^@?([A-Za-z][\w]*)\s*(!=|=)?\s*([\s\S]*)$/) || [];
      const n: NoSe = {
        t: 'se', col: nomeCol(mm[1] || ''), op: (mm[2] as NoSe['op']) || '', val: (mm[3] || '').trim(), arg,
        filhos: [], senao: [], emSenao: false, ini: m.index, iniSenao: null,
      };
      if (!n.col) erros.push({ msg: '@se sem coluna', ini: m.index });
      destino(topo()).push(n);
      pilha.push(n);
    } else if (kw === 'senao') {
      const n = topo();
      if (n.t !== 'se' || n.emSenao) erros.push({ msg: '@senao fora de um @se', ini: m.index });
      else { n.emSenao = true; n.iniSenao = m.index; }
    } else {
      if (pilha.length === 1) erros.push({ msg: 'um @fim a mais', ini: m.index });
      else pilha.pop();
    }
  }
  if (ult < src.length) destino(topo()).push({ t: 'txt', s: src.slice(ult), ini: ult });
  for (const n of pilha.slice(1)) {
    erros.push({ msg: '@' + (n.t === 'se' ? 'se ' + n.col : n.t === 'agrupar' ? 'agrupar por ' + n.col : 'repetir') + ' sem @fim', ini: n.ini });
  }
  return { raiz: raiz.filhos, erros };
}
