// Cadastro em planilha: baixar (.xlsx) e enviar (.xlsx ou .csv).
// Enviar não grava direto: devolve uma proposta (o que muda) para a pessoa conferir e aplicar.
import { COLUNAS_NOME, linhaVazia, type Cadastro, type Linha, type TipoItem, NOMES_BASE } from '@norte/motor';
import type { Evento } from '@/lib/comum/tipos';

const COL_ID = 'id (não altere)';
const COL_CIDADE = 'cidade da etapa';
const novoId = () => crypto.randomUUID().slice(0, 8);
const limpo = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^@/, '');

/** cabeçalho escrito como no HTML (`cidade_1`, `@preco_vista_1`) vale como a coluna (`cidade`) */
const semNum = (s: string) => limpo(s).replace(/_1$/, '');

const nomeAba = (_evento: Pick<Evento, 'formato'>, tipo: TipoItem) => (tipo === 'etapa' ? 'Etapas' : 'Cidades');

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
  /** campos que estavam como coluna da cidade/etapa e vieram na aba de gerais: passam a valer igual em todas as páginas */
  paraGeral: string[];
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

/** tabela no formato "variavel | valor" (ou "campo | valor"): são os gerais, não cidades */
const ehGerais = (t: Tabela) => {
  const [a, b] = (t[0] || []).map(limpo);
  return ['variavel', 'campo', 'nome'].includes(a || '') && b === 'valor' && (t[0] || []).filter((x) => x.trim()).length === 2;
};

export async function lerPlanilha(arquivo: File, evento: Evento, cad: Cadastro): Promise<Proposta> {
  const abas = new Map<string, Tabela>();
  if (/\.csv$/i.test(arquivo.name)) {
    const t = lerCsv(await arquivo.text());
    abas.set(ehGerais(t) ? 'gerais' : 'cidades', t);
  } else if (/\.xlsx$/i.test(arquivo.name)) {
    const { default: ler } = await import('read-excel-file/browser');
    for (const a of await ler(arquivo)) { const t = a.data.map((r) => r.map(texto)); abas.set(ehGerais(t) && !abas.has('gerais') ? 'gerais' : limpo(a.sheet), t); }
  } else {
    throw new Error('Envie a planilha em .xlsx (Excel) ou .csv.');
  }
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
  // texto igual para todos que o HTML usa dentro do card repetido (ex.: a etiqueta "inscreva-se"): o publicador
  // tinha posto como coluna da cidade; vindo na aba de gerais, passa a ser geral (os nomes da base, não)
  const colsItem = new Map([...cad.colunas('cidade'), ...cad.colunas('etapa')].filter((c) => !NOMES_BASE.has(c)).map((c) => [limpo(c), c]));
  const paraGeral: string[] = [];
  for (const [campo, v] of (abas.get('gerais') || []).slice(1)) {
    if (!campo?.trim()) continue;
    const g = colsGerais.get(limpo(campo)) ?? colsGerais.get(semNum(campo));
    const item = g ? undefined : colsItem.get(limpo(campo)) ?? colsItem.get(semNum(campo));
    if (g) gerais[g] = v ?? '';
    else if (item) { gerais[item] = v ?? ''; paraGeral.push(item); }
    else avisos.push(`Gerais: “${campo}” não existe no cadastro e foi ignorado.`);
  }
  if (paraGeral.length) avisos.push(`Gerais: ${paraGeral.length} campo(s) que estavam como coluna da cidade passam a valer igual em todas as páginas (${paraGeral.map((c) => '@' + c).join(', ')}).`);

  function tabela(tipo: TipoItem, tab: Tabela, atuais: Linha[], cidadesNovas: Linha[]): Linha[] {
    const aba = nomeAba(evento, tipo);
    const cols = cad.colunas(tipo);
    const porNome = new Map(cols.map((c) => [limpo(c), c]));
    const cab = (tab[0] || []).map((h) => h.trim());
    const coluna = (h: string) => porNome.get(limpo(h)) ?? porNome.get(semNum(h));
    if (!cab.some((h) => coluna(h))) throw new Error(`A aba “${aba}” não tem nenhuma coluna do cadastro (${cols.slice(0, 4).join(', ')}…). Confira a primeira linha.`);
    const mapa = cab.map((h) => {
      const k = limpo(h);
      if (!k) return null;
      if (k.startsWith('id')) return '_id';
      if (tipo === 'etapa' && k === limpo(COL_CIDADE)) return '_cidade';
      const c = coluna(h);
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
      // linha sem nenhum valor (só o id, ou nada) não vira cidade
      if (!mapa.some((c, i) => c && c !== '_id' && (r[i] ?? '').trim())) continue;
      const v = (campo: string) => { const i = mapa.indexOf(campo); return i >= 0 ? (r[i] ?? '').trim() : ''; };
      let base = achar(v('_id'), colNome ? v(colNome) : '');
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
    }
    const fora = atuais.filter((x) => !usadas.has(x._id));
    const vazias = fora.filter(linhaVazia).length;
    const removidas = [...fora.filter((x) => !linhaVazia(x)).map((x) => cad.nomeItem(tipo, x)), ...(vazias ? [`${vazias} sem nada preenchido`] : [])];
    resumo.push({ aba, novas, atualizadas, removidas });
    return out;
  }

  const cidades = tabCidades ? tabela('cidade', tabCidades, evento.cidades, []) : evento.cidades;
  let etapas: Linha[] | null = null;
  const tabEtapas = abas.get('etapas');
  if (comEtapas && tabEtapas) etapas = tabela('etapa', tabEtapas, evento.etapas, cidades);
  // etapas que apontavam para cidades removidas ficam sem cidade
  if (comEtapas) for (const et of etapas || []) if (et._cidade && !cidades.some((c) => c._id === et._cidade)) delete et._cidade;
  return { gerais, cidades, etapas, resumo, avisos, paraGeral };
}
