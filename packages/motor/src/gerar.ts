import { lerBlocos, type No } from './blocos';
import { converterMarcas, marcar } from './edicao';
import { Cadastro } from './cadastro';
import { temCardsFixos } from './cards-fixos';
import { detectar, ehContagem, sincronizarVars, type Deteccao } from './detectar';
import { ajustarTagsMidia, opcoesMidia, pastasMidia, tirarMidiaOculta } from './midia';
import { abreviar, esc, slug, slugValor } from './texto';
import { FORMATOS, NOME_PAGINA, type Aviso, type Formato, type Linha, type Modelos, type TipoItem, type TipoPagina, type Vars } from './tipos';
import { ehMidia, trocarVars } from './variaveis';
import { ocultasDaPagina, removerSecoes, reordenarSecoes, type EscolhaSecoes } from './secoes';
import { colocarRodape, rodapeDaPagina, type EscolhaRodape } from './rodape';
import { colocarPatrocinios, montarPatrocinios, patrocinadoresFora, type EntradaPatrocinios } from './patrocinios';

export interface EntradaGerar {
  formato: Formato;
  modelos: Modelos;
  /** estado das variáveis (dono, manual, ignorar, excluida, extra, formula). As que faltarem são inferidas. */
  vars?: Vars;
  gerais?: Record<string, string>;
  cidades?: Linha[];
  etapas?: Linha[];
  ordem?: Partial<Record<TipoItem, string[]>>;
  /** escolha das mídias de dono geral */
  imagens?: Record<string, string>;
  /** caminhos dos arquivos enviados (pasta _media) */
  arquivos?: Iterable<string>;
  /** data/hora de referência (o motor não lê o relógio). Reservado para o pós-evento (fase 3). */
  agora?: Date;
  /** seções escondidas (no evento todo e por cidade/etapa) */
  secoes?: EscolhaSecoes;
  /** rodapé padrão do publicador (geral e por cidade/etapa) */
  rodape?: EscolhaRodape;
  /** patrocinadores: composição por página (tapume e cada cidade) e o banco geral */
  patrocinios?: EntradaPatrocinios;
  /** prévia editável: marca cada texto de variável com <pub-v data-v data-l> (nunca no site publicado) */
  marcarEdicao?: boolean;
}

export interface PaginaGerada {
  tipo: TipoPagina;
  arquivo: string;
  titulo: string;
  html: string;
  /** 0 = página de cidade/home, 1 = página de etapa (recuo na lista) */
  nivel: 0 | 1;
  cidadeId?: string;
  etapaId?: string;
  /** quantos avisos esta página gerou */
  avisos: number;
}

export interface ResultadoGerar {
  paginas: PaginaGerada[];
  avisos: Aviso[];
  bloqueado: boolean;
  deteccao: Deteccao;
  /** estado das variáveis usado na geração (o recebido + o inferido) */
  vars: Vars;
}

interface Ctx {
  kind: TipoPagina;
  cidade?: Linha;
  etapa?: Linha;
  item?: Linha | null;
  tipoItem?: TipoItem;
  grupo?: { col: string; valor: string };
  listaG?: Linha[];
}

interface Rastro {
  /** variáveis vazias: "@base" → quem (nome da cidade/etapa ou da página) */
  faltas: { chave: string; quem: string | null }[];
  /** variáveis sem item (ex.: @cidade_3 com 2 cidades) */
  fora: Set<string>;
  faltaG: Set<string>;
}

class Montador {
  /** linha do cadastro de onde veio o último valor ('' = geral; null = não editável) */
  private linhaUsada: string | null = null;
  constructor(private cad: Cadastro, private formato: Formato, private marcarEdicao = false) {}

  private get comEtapas() {
    return this.formato === 'tapume_etapa_praca';
  }

  private escopo(alvo: TipoItem, ctx: Ctx): Linha[] {
    if (alvo === 'etapa') {
      const c = ctx.cidade || (ctx.item && ctx.tipoItem === 'cidade' ? ctx.item : null);
      return c ? this.cad.etapasDa(c) : this.cad.etapas;
    }
    return ctx.listaG || this.cad.cidades;
  }

  render(nos: No[], ctx: Ctx, R: Rastro): string {
    return nos.map((n) => this.renderNo(n, ctx, R)).join('');
  }

  private renderNo(n: No, ctx: Ctx, R: Rastro): string {
    if (n.t === 'txt') return this.trocar(n.s, ctx, R);
    if (n.t === 'repetir') return this.escopo(n.alvo, ctx).map((it) => this.render(n.filhos, { ...ctx, item: it, tipoItem: n.alvo }, R)).join('');
    if (n.t === 'agrupar') {
      const grupos = new Map<string, Linha[]>();
      for (const c of this.escopo('cidade', ctx)) {
        const v = String(c[n.col] || '').trim();
        if (!grupos.has(v)) grupos.set(v, []);
        grupos.get(v)!.push(c);
      }
      if (grupos.has('')) R.faltas.push({ chave: '@' + n.col, quem: grupos.get('')!.map((c) => this.cad.nomeItem('cidade', c)).join(', ') });
      return [...grupos].map(([v, itens]) => this.render(n.filhos, { ...ctx, grupo: { col: n.col, valor: v }, listaG: itens, item: null }, R)).join('');
    }
    const v = this.valorCol(n.col, ctx);
    let ok = n.op ? slugValor(v) === slugValor(n.val) : !!String(v || '').trim() && !['nao', 'no', 'false', '0'].includes(slug(v));
    if (n.op === '!=') ok = !ok;
    return this.render(ok ? n.filhos : n.senao, ctx, R);
  }

  /** valor de uma coluna testada em @se */
  private valorCol(col: string, ctx: Ctx): string {
    const v = this.cad.vars[col];
    if (ctx.item && v?.dono !== 'geral' && (col in ctx.item || v?.formula || v?.dono === ctx.tipoItem)) return this.cad.valorDe(ctx.item, col);
    if (ctx.grupo && ctx.grupo.col === col) return ctx.grupo.valor;
    if (v?.dono === 'etapa' && ctx.etapa) return this.cad.valorDe(ctx.etapa, col);
    if (v?.dono === 'cidade' && ctx.cidade) return this.cad.valorDe(ctx.cidade, col);
    if (ctx.cidade && col in ctx.cidade) return this.cad.valorDe(ctx.cidade, col);
    return this.cad.valorDe(null, col);
  }

  /** @total_cidades e @total_<status>, dentro do grupo atual quando houver */
  private contar(base: string, ctx: Ctx): string {
    const lista = ctx.listaG || this.cad.cidades;
    const q = base.slice(6);
    if (q === 'cidades' || q === 'pracas') return String(lista.length);
    if (q === 'etapas') return String(this.escopo('etapa', ctx).length);
    const alvo = q === 'em_breve' ? 'breve' : q;
    return String(lista.filter((c) => this.cad.statusDe(c) === alvo).length);
  }

  private trocar(src: string, ctx: Ctx, R: Rastro): string {
    return trocarVars(src, (base, num, tok) => {
      const v = this.cad.vars[base];
      if (!v || v.ignorar) return null;
      this.linhaUsada = null;
      const r = this.resolver(base, num, tok, ctx, R);
      if (r == null) return null;
      return this.marcarEdicao && this.linhaUsada != null ? marcar(base, this.linhaUsada, esc(r)) : esc(r);
    });
  }

  private resolver(base: string, num: number | null, tok: string, ctx: Ctx, R: Rastro): string | null {
    const cad = this.cad;
    const v = cad.vars[base];
    const idx = num || 1;
    if (v.excluida) return '';
    if (ehContagem(base, cad.det.opcoes)) return this.contar(base, ctx);
    const raiz = /_abrev$/.test(base) && cad.vars[base.slice(0, -6)] ? base.slice(0, -6) : null;
    if (raiz && v.dono === 'auto') {
      const r = this.resolver(raiz, num, tok.replace(/_abrev/, ''), ctx, R);
      return r == null ? r : abreviar(r);
    }
    if (base === 'url') {
      let it: Linha | undefined | null;
      let tp: TipoItem;
      if (ctx.item) { it = ctx.item; tp = ctx.tipoItem!; }
      else if (ctx.kind === 'tapume') { tp = 'cidade'; it = cad.cidades[idx - 1]; }
      else if (ctx.kind === 'praca' && this.comEtapas && num) { tp = 'etapa'; it = ctx.cidade ? cad.etapasDa(ctx.cidade)[idx - 1] : undefined; }
      else if (ctx.kind === 'etapa') { tp = 'etapa'; it = ctx.etapa; }
      else { tp = 'cidade'; it = ctx.cidade; }
      if (!it) { R.fora.add(tok); return ''; }
      return cad.arquivo(tp, it);
    }
    if (ctx.grupo && base === ctx.grupo.col && !ctx.item) return ctx.grupo.valor;
    if (v.dono === 'geral') {
      this.linhaUsada = '';
      const val = cad.valorDe(null, base);
      if (!val) R.faltaG.add(tok);
      return val;
    }
    const tipo: TipoItem = v.dono === 'etapa' ? 'etapa' : 'cidade';
    let it: Linha | undefined | null;
    if (ctx.item && ctx.tipoItem === tipo) it = ctx.item;
    else if (tipo === 'etapa') it = ctx.etapa || this.escopo('etapa', ctx)[idx - 1];
    else it = ctx.cidade || (ctx.item && ctx.tipoItem === 'etapa' ? cad.cidadeDa(ctx.item) : null) || cad.cidades[idx - 1];
    if (!it) { R.fora.add(tok); return ''; }
    this.linhaUsada = it._id;
    const val = cad.valorDe(it, base);
    if (!val) {
      const daPagina = (ctx.cidade && it === ctx.cidade) || (ctx.etapa && it === ctx.etapa);
      R.faltas.push({ chave: '@' + base, quem: daPagina ? null : cad.nomeItem(tipo, it) });
    }
    return val || '';
  }
}

/** Monta as páginas do evento: HTML-modelo + cadastro + mídia → páginas + avisos. Não altera a entrada. */
export function gerar(e: EntradaGerar): ResultadoGerar {
  const det = detectar(e.modelos, e.formato);
  const vars = sincronizarVars(det, e.vars);
  const cad = new Cadastro(det, { ...e, vars });
  const paginasDoFormato = FORMATOS[e.formato].paginas;
  const comEtapas = e.formato === 'tapume_etapa_praca';
  const paginas: PaginaGerada[] = [];
  const avisos: Aviso[] = [];
  const faltaG = new Set<string>();
  const vazios = new Map<string, Set<string>>();
  const errosVistos = new Set<TipoPagina>();

  for (const k of paginasDoFormato) {
    if (e.modelos[k] == null) {
      avisos.push({ codigo: 'falta-html', nivel: 'bloqueia', titulo: 'Falta o HTML da página ' + NOME_PAGINA[k], detalhe: 'Sem ele, nenhuma página desse tipo é gerada.', passo: 'paginas' });
    }
  }
  const unica = e.formato === 'unica';
  if (!unica && !cad.cidades.length) {
    avisos.push({ codigo: 'sem-cidades', nivel: 'bloqueia', titulo: 'Nenhuma cidade cadastrada', detalhe: 'As páginas de praça saem do cadastro de cidades.', passo: 'cadastro' });
  }
  if (comEtapas && !cad.etapas.length) {
    avisos.push({ codigo: 'sem-etapas', nivel: 'bloqueia', titulo: 'Nenhuma etapa cadastrada', detalhe: 'Neste formato, cada cidade tem as suas etapas.', passo: 'cadastro' });
  }

  const montador = new Montador(cad, e.formato, !!e.marcarEdicao);
  const arvores = new Map<TipoPagina, ReturnType<typeof lerBlocos>>();
  const add = (kind: TipoPagina, arquivo: string, titulo: string, ctx: Omit<Ctx, 'kind'>, nivel: 0 | 1) => {
    const modelo = e.modelos[kind];
    if (modelo == null) return;
    let arv = arvores.get(kind);
    if (!arv) arvores.set(kind, (arv = lerBlocos(modelo)));
    const a0 = avisos.length;
    if (arv.erros.length && !errosVistos.has(kind)) {
      errosVistos.add(kind);
      avisos.push({
        codigo: 'bloco-mal-fechado', nivel: 'bloqueia', pagina: titulo, passo: 'paginas',
        titulo: NOME_PAGINA[kind] + ': blocos do HTML mal fechados',
        detalhe: arv.erros.map((x) => x.msg).join(' · ') + '. Corrija no HTML e envie de novo.',
      });
    }
    const R: Rastro = { faltas: [], fora: new Set(), faltaG };
    const linhasDaPagina = kind === 'tapume' ? [] : [ctx.cidade?._id, ctx.etapa?._id];
    const ocultas = ocultasDaPagina(kind, e.secoes, linhasDaPagina);
    const corpo = tirarMidiaOculta(removerSecoes(reordenarSecoes(converterMarcas(montador.render(arv.raiz, { ...ctx, kind }, R)), e.secoes?.ordem?.[kind]), ocultas));
    // patrocinadores só nas internas: a página do One page, a praça (sem etapas) e cada etapa; o tapume nunca
    const chavePatro = kind === 'unica' ? 'unica' : kind === 'etapa' ? ctx.etapa?._id : kind === 'praca' && !comEtapas ? ctx.cidade?._id : undefined;
    const comPatro = e.patrocinios && chavePatro ? colocarPatrocinios(corpo, montarPatrocinios(e.patrocinios.porPagina[chavePatro], e.patrocinios)) : corpo;
    const html = ajustarTagsMidia(colocarRodape(comPatro, rodapeDaPagina(e.rodape, linhasDaPagina)));
    for (const f of R.faltas) {
      if (!vazios.has(f.chave)) vazios.set(f.chave, new Set());
      vazios.get(f.chave)!.add(f.quem ?? titulo);
    }
    if (R.fora.size) {
      avisos.push({
        codigo: 'espacos-sobrando', nivel: 'alerta', pagina: titulo, passo: 'cadastro',
        titulo: titulo + ': a página tem mais espaços do que itens cadastrados',
        detalhe: 'Ficam vazios: ' + [...R.fora].join(', ') + '. Para não sobrar espaço, use um bloco que se repete.',
      });
    }
    paginas.push({
      tipo: kind, arquivo, titulo, html, nivel, cidadeId: ctx.cidade?._id, etapaId: ctx.etapa?._id,
      avisos: avisos.length - a0 + (R.faltas.length ? 1 : 0),
    });
  };

  // One page: uma página só; as cidades (se houver) são só a lista de @repetir cidades
  if (unica) add('unica', 'index.html', 'Página', {}, 0);
  if (paginasDoFormato.includes('tapume')) add('tapume', 'index.html', 'Tapume', {}, 0);
  for (const c of unica ? [] : cad.cidades) {
    const nc = cad.nomeItem('cidade', c);
    add('praca', cad.arquivo('cidade', c), nc, { cidade: c }, 0);
    if (comEtapas) for (const et of cad.etapasDa(c)) add('etapa', cad.arquivo('etapa', et), nc + ' · ' + cad.nomeItem('etapa', et), { cidade: c, etapa: et }, 1);
  }
  if (comEtapas) {
    const soltas = cad.etapas.filter((x) => !cad.cidadeDa(x));
    if (soltas.length) {
      avisos.push({
        codigo: 'etapas-sem-cidade', nivel: 'alerta', passo: 'cadastro', titulo: soltas.length + ' etapa(s) sem cidade',
        detalhe: soltas.map((x) => cad.nomeItem('etapa', x)).join(', ') + ' não geram página até escolher a cidade.',
      });
    }
  }
  for (const [c, valores] of Object.entries(det.opcoes)) {
    if (!vars[c] || vars[c].ignorar) continue;
    const ok = new Set(valores.map(slugValor));
    const linhas: [TipoItem, Linha][] = [...cad.cidades.map((x) => ['cidade', x] as [TipoItem, Linha]), ...cad.etapas.map((x) => ['etapa', x] as [TipoItem, Linha])];
    const fora = linhas.filter(([, x]) => String(x[c] || '').trim() && !ok.has(slugValor(x[c])));
    if (fora.length) {
      avisos.push({
        codigo: 'valor-desconhecido', nivel: 'alerta', passo: 'cadastro', titulo: '@' + c + ' com valor que o HTML não conhece',
        detalhe: fora.map(([t, x]) => cad.nomeItem(t, x) + ' = “' + x[c] + '”').join(', ') + '. O HTML espera: ' + valores.join(' ou ') + '.',
      });
    }
  }
  const tapume = e.modelos.tapume;
  const fixos = paginasDoFormato.includes('tapume') && tapume != null ? temCardsFixos(tapume) : 0;
  if (fixos) {
    avisos.push({
      codigo: 'cards-fixos', nivel: 'alerta', passo: 'paginas',
      titulo: 'Tapume com ' + fixos + ' cards fixos e ' + cad.cidades.length + ' cidade(s) cadastrada(s)',
      detalhe: 'Os cards sem cidade saem vazios e o status não muda para “em breve”. Transforme em card que se repete no passo Páginas.',
    });
  }
  const semArquivo = [...det.variaveis.keys()].filter((b) => ehMidia(b) && !vars[b]?.ignorar && !vars[b]?.excluida && !opcoesMidia(b, det, cad.arquivos).length);
  if (semArquivo.length) {
    avisos.push({
      codigo: 'midia-sem-arquivo', nivel: 'alerta', passo: 'paginas', titulo: semArquivo.length + ' imagem(ns) ou vídeo(s) sem arquivo',
      detalhe: 'Faltam as pastas: ' + [...new Set(semArquivo.flatMap((b) => pastasMidia(b, det).filter((p) => p.startsWith('_media'))))].join(', ') + '. Envie a pasta _media no passo Páginas.',
    });
  }
  if (vazios.size) {
    const tot = new Set([...vazios.values()].flatMap((x) => [...x])).size;
    avisos.push({
      codigo: 'campos-vazios', nivel: 'alerta', passo: 'cadastro',
      titulo: 'Campos vazios no cadastro: ' + vazios.size + ' variável(is) em ' + tot + ' cidade(s)',
      detalhe: [...vazios].map(([k, set]) => k + ' (' + (set.size > 3 ? set.size + ' cidades' : [...set].join(', ')) + ')').join(' · ') + '. Saem em branco.',
    });
  }
  if (faltaG.size) {
    avisos.push({ codigo: 'gerais-vazios', nivel: 'alerta', passo: 'cadastro', titulo: 'Gerais do evento sem valor', detalhe: [...faltaG].join(', ') + ' — saem em branco em todas as páginas.' });
  }
  const foraPatro = e.patrocinios ? patrocinadoresFora(e.patrocinios) : [];
  if (foraPatro.length) {
    avisos.push({
      codigo: 'patrocinador-fora', nivel: 'alerta', passo: 'patrocinios',
      titulo: foraPatro.length + ' patrocinador(es) desativado(s) ou apagado(s) no banco',
      detalhe: foraPatro.join(', ') + ' — não aparecem nas páginas. Troque ou tire no passo Patrocínios.',
    });
  }
  const cont: Record<string, number> = {};
  for (const p of paginas) cont[p.arquivo] = (cont[p.arquivo] || 0) + 1;
  const dup = Object.keys(cont).filter((k) => cont[k] > 1);
  if (dup.length) {
    avisos.unshift({
      codigo: 'arquivo-duplicado', nivel: 'bloqueia', passo: 'cadastro', titulo: 'Duas páginas com o mesmo nome de arquivo',
      detalhe: dup.join(', ') + ' — uma apagaria a outra. Mude a coluna Arquivo no cadastro.',
    });
  }
  return { paginas, avisos, bloqueado: avisos.some((a) => a.nivel === 'bloqueia'), deteccao: det, vars };
}
