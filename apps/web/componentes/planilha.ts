// Cadastro em planilha: baixar (.xlsx) e enviar (.xlsx ou .csv).
// Enviar não grava direto: devolve uma proposta (o que muda) para a pessoa conferir e aplicar.
import { COLUNAS_NOME, type Cadastro, type Linha, type TipoItem } from '@norte/motor';
import type { Evento } from '@/lib/comum/tipos';

const COL_ID = 'id (não altere)';
const COL_CIDADE = 'cidade da etapa';
const novoId = () => crypto.randomUUID().slice(0, 8);
const limpo = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^@/, '');

const nomeAba = (evento: Pick<Evento, 'formato'>, tipo: TipoItem) => (tipo === 'etapa' ? 'Etapas' : evento.formato === 'unica' ? 'Página' : 'Cidades');

export async function baixarPlanilha(evento: Evento, cad: Cadastro) {
  const { default: escrever } = await import('write-excel-file/browser');
  const titulo = (t: string) => ({ value: t, fontWeight: 'bold' as const, backgroundColor: '#E8EAE4' });
  const valor = (v: unknown) => (v == null || v === '' ? null : String(v));
  const abas: { sheet: string; data: unknown[][]; columns?: { width: number }[]; stickyRowsCount?: number }[] = [];

  const gerais = cad.colunas('geral');
  if (gerais.length) {
    abas.push({ sheet: 'Gerais', data: [[titulo('campo'), titulo('valor')], ...gerais.map((g) => [g, valor(evento.gerais[g])])], columns: [{ width: 26 }, { width: 44 }], stickyRowsCount: 1 });
  }
  const tabela = (tipo: TipoItem) => {
    const cols = cad.colunas(tipo);
    const linhas = tipo === 'etapa' ? evento.etapas : evento.cidades;
    const cab = [...cols, ...(tipo === 'etapa' ? [COL_CIDADE] : []), COL_ID];
    const cidadeDe = (l: Linha) => { const c = evento.cidades.find((x) => x._id === l._cidade); return c ? cad.nomeItem('cidade', c) : null; };
    abas.push({
      sheet: nomeAba(evento, tipo),
      data: [cab.map(titulo), ...linhas.map((l) => [...cols.map((c) => valor(l[c])), ...(tipo === 'etapa' ? [cidadeDe(l)] : []), l._id])],
      columns: cab.map((c) => ({ width: c === COL_ID ? 16 : Math.max(14, c.length + 4) })),
      stickyRowsCount: 1,
    });
  };
  tabela('cidade');
  if (evento.formato === 'tapume_etapa_praca') tabela('etapa');
  // a biblioteca tipa as células de um jeito mais estreito do que o que ela aceita
  await (escrever as unknown as (a: unknown, o: unknown) => { toFile: (n: string) => Promise<void> })(abas, {}).toFile(`${evento.slug}-cadastro.xlsx`);
}

export interface Proposta {
  gerais: Record<string, string>;
  cidades: Linha[];
  etapas: Linha[] | null;
  resumo: { aba: string; novas: number; atualizadas: number; removidas: string[] }[];
  avisos: string[];
}

type Tabela = string[][];

/** texto de uma célula (números no jeito brasileiro, datas dd/mm/aaaa) */
function texto(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return `${String(v.getUTCDate()).padStart(2, '0')}/${String(v.getUTCMonth() + 1).padStart(2, '0')}/${v.getUTCFullYear()}`;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  return String(v).trim();
}

/** CSV com ; , ou tab (o que aparecer mais no cabeçalho) */
function lerCsv(t: string): Tabela {
  t = t.replace(/^\uFEFF/, '');
  const primeira = t.split(/\r?\n/)[0] || '';
  const sep = [';', ',', '\t'].sort((a, b) => primeira.split(b).length - primeira.split(a).length)[0];
  const linhas: Tabela = [];
  let linha: string[] = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.map((l) => l.map((x) => x.trim()));
}

export async function lerPlanilha(arquivo: File, evento: Evento, cad: Cadastro): Promise<Proposta> {
  const abas = new Map<string, Tabela>();
  if (/\.csv$/i.test(arquivo.name)) {
    abas.set('cidades', lerCsv(await arquivo.text()));
  } else if (/\.xlsx$/i.test(arquivo.name)) {
    const { default: ler } = await import('read-excel-file/browser');
    for (const a of await ler(arquivo)) abas.set(limpo(a.sheet), a.data.map((r) => r.map(texto)));
  } else {
    throw new Error('Envie a planilha em .xlsx (Excel) ou .csv.');
  }
  const unica = evento.formato === 'unica';
  const comEtapas = evento.formato === 'tapume_etapa_praca';
  const avisos: string[] = [];
  const resumo: Proposta['resumo'] = [];

  // aba de cidades: pelo nome; com uma aba só (ou CSV), é ela
  const naoGerais = [...abas.keys()].filter((k) => k !== 'gerais' && k !== 'etapas');
  const tabCidades = abas.get('cidades') || abas.get('pagina') || (naoGerais.length === 1 ? abas.get(naoGerais[0]) : undefined);
  if (!tabCidades && !abas.get('gerais')) throw new Error(`Não achei a aba “${nomeAba(evento, 'cidade')}” na planilha.`);

  // gerais: campo | valor
  const gerais: Record<string, string> = {};
  const colsGerais = new Map(cad.colunas('geral').map((g) => [limpo(g), g]));
  for (const [campo, v] of (abas.get('gerais') || []).slice(1)) {
    if (!campo?.trim()) continue;
    const g = colsGerais.get(limpo(campo));
    if (g) gerais[g] = v ?? '';
    else avisos.push(`Gerais: “${campo}” não existe no cadastro e foi ignorado.`);
  }

  function tabela(tipo: TipoItem, tab: Tabela, atuais: Linha[], cidadesNovas: Linha[]): Linha[] {
    const aba = nomeAba(evento, tipo);
    const cols = cad.colunas(tipo);
    const porNome = new Map(cols.map((c) => [limpo(c), c]));
    const cab = (tab[0] || []).map((h) => h.trim());
    const mapa = cab.map((h) => {
      const k = limpo(h);
      if (!k) return null;
      if (k.startsWith('id')) return '_id';
      if (tipo === 'etapa' && k === limpo(COL_CIDADE)) return '_cidade';
      const c = porNome.get(k);
      if (!c) avisos.push(`${aba}: a coluna “${h}” não existe no cadastro e foi ignorada.`);
      return c || null;
    });
    // linha da planilha → linha atual: pelo id; sem id, pelo nome (cidade, praça…)
    const colNome = COLUNAS_NOME[tipo].find((c) => cols.includes(c));
    const usadas = new Set<string>();
    const achar = (id: string, nome: string) => {
      let l = id ? atuais.find((x) => x._id === id && !usadas.has(x._id)) : undefined;
      if (!l && nome) l = atuais.find((x) => !usadas.has(x._id) && limpo(cad.nomeItem(tipo, x)) === limpo(nome));
      return l;
    };
    let novas = 0;
    let atualizadas = 0;
    const out: Linha[] = [];
    for (const r of tab.slice(1)) {
      if (!r.some((x) => x?.trim())) continue;
      const v = (campo: string) => { const i = mapa.indexOf(campo); return i >= 0 ? (r[i] ?? '').trim() : ''; };
      let base = achar(v('_id'), colNome ? v(colNome) : '');
      // One page: a linha da página é sempre a mesma
      if (!base && unica && atuais[0] && !usadas.has(atuais[0]._id)) base = atuais[0];
      const l: Linha = base ? structuredClone(base) : { _id: novoId() };
      if (base) { usadas.add(base._id); atualizadas++; } else novas++;
      mapa.forEach((c, i) => { if (c && c !== '_id' && c !== '_cidade') l[c] = (r[i] ?? '').trim(); });
      if (tipo === 'etapa') {
        const nomeCid = v('_cidade');
        const c = nomeCid ? cidadesNovas.find((x) => limpo(cad.nomeItem('cidade', x)) === limpo(nomeCid)) : undefined;
        if (c) l._cidade = c._id;
        else if (nomeCid) avisos.push(`Etapas: a cidade “${nomeCid}” não está na aba Cidades.`);
        if (!l._cidade && cidadesNovas.length === 1) l._cidade = cidadesNovas[0]._id;
      }
      out.push(l);
      if (unica) break;
    }
    if (unica && tab.slice(2).some((r) => r.some((x) => x?.trim()))) avisos.push('Página: o One page tem uma linha só; as outras foram ignoradas.');
    const removidas = atuais.filter((x) => !usadas.has(x._id)).map((x) => cad.nomeItem(tipo, x));
    resumo.push({ aba, novas, atualizadas, removidas });
    return out;
  }

  const cidades = tabCidades ? tabela('cidade', tabCidades, evento.cidades, []) : evento.cidades;
  let etapas: Linha[] | null = null;
  const tabEtapas = abas.get('etapas');
  if (comEtapas && tabEtapas) etapas = tabela('etapa', tabEtapas, evento.etapas, cidades);
  // etapas que apontavam para cidades removidas ficam sem cidade
  if (comEtapas) for (const et of etapas || []) if (et._cidade && !cidades.some((c) => c._id === et._cidade)) delete et._cidade;
  return { gerais, cidades, etapas, resumo, avisos };
}
