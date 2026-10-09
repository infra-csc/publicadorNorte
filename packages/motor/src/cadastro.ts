import { colunas, type Deteccao, TEXTOS_PADRAO } from './detectar';
import { avaliar, nomesFormula } from './formulas';
import { MARCA_OCULTA, midiaEscondida, valorMidia } from './midia';
import { fmtBR, numBR, slug } from './texto';
import type { Linha, TipoItem, Vars } from './tipos';
import { ehMidia } from './variaveis';

export interface DadosCadastro {
  vars: Vars;
  gerais?: Record<string, string>;
  cidades?: Linha[];
  etapas?: Linha[];
  /** ordem das colunas arrastada pelo usuário */
  ordem?: Partial<Record<TipoItem, string[]>>;
  /** escolha das mídias de dono geral: { "<variavel>": "_media/…" } */
  imagens?: Record<string, string>;
  /** caminhos dos arquivos enviados (pasta _media) */
  arquivos?: Iterable<string>;
}

/** primeira coluna preenchida entre estas vira o nome do item */
export const COLUNAS_NOME: Record<TipoItem, string[]> = { cidade: ['cidade', 'praca', 'nome', 'local'], etapa: ['etapa', 'nome', 'estacao', 'titulo'] };

/** Leitura do cadastro de um evento: valores finais (digitado, calculado ou padrão), nomes e arquivos. */
export class Cadastro {
  readonly vars: Vars;
  readonly gerais: Record<string, string>;
  readonly cidades: Linha[];
  readonly etapas: Linha[];
  readonly imagens: Record<string, string>;
  readonly arquivos: string[];
  readonly ordem: Partial<Record<TipoItem, string[]>>;
  private cacheCols = new Map<string, string[]>();

  constructor(readonly det: Deteccao, d: DadosCadastro) {
    this.vars = d.vars;
    this.gerais = d.gerais || {};
    this.cidades = d.cidades || [];
    this.etapas = d.etapas || [];
    this.imagens = d.imagens || {};
    this.arquivos = [...(d.arquivos || [])];
    this.ordem = d.ordem || {};
  }

  colunas(tipo: TipoItem | 'geral'): string[] {
    let c = this.cacheCols.get(tipo);
    if (!c) this.cacheCols.set(tipo, (c = colunas(tipo, this.det, this.vars, this.ordem)));
    return c;
  }

  /** coluna que tem fórmula ou entra na fórmula de outra (o número sai formatado) */
  numerica(base: string): boolean {
    return !!this.vars[base]?.formula || Object.values(this.vars).some((v) => v.formula && nomesFormula(v.formula).includes(base));
  }

  private linhaDaColuna(it: Linha | null, nome: string): Linha | null {
    return this.vars[nome]?.dono === 'geral' ? null : it;
  }

  /**
   * Valor final de uma coluna para uma linha (ou geral, com `it` nulo): o que foi digitado; se vazio e houver fórmula, o cálculo.
   * `vistos` evita conta circular: dentro de uma conta, a própria coluna conta como vazia.
   */
  valorDe(it: Linha | null, base: string, vistos?: Set<string>): string {
    const v = this.vars[base];
    if (v?.excluida) return '';
    if (ehMidia(base)) {
      const geral = v?.dono === 'geral' || !it;
      // por cidade: a escolha da linha; sem ela (ou se o arquivo sumiu), a escolha geral; sem nenhuma, o arquivo padrão
      for (const escolha of geral ? [this.imagens[base]] : [it![base], this.imagens[base]]) {
        if (!escolha) continue;
        if (midiaEscondida(escolha)) return MARCA_OCULTA;
        if (valorMidia(base, escolha, this.det, this.arquivos) === escolha) return escolha;
      }
      return valorMidia(base, undefined, this.det, this.arquivos);
    }
    if (vistos?.has(base)) return '';
    const bruto = v?.dono === 'geral' || !it ? this.gerais[base] : it[base];
    if (bruto != null && String(bruto).trim() !== '') {
      const t = String(bruto).trim();
      // número digitado em coluna de conta sai no mesmo formato do calculado (1720 → 1.720)
      if (/^-?[\d.]+(,\d+)?$/.test(t) && this.numerica(base)) {
        const n = numBR(t);
        if (n != null) return fmtBR(n);
      }
      return t;
    }
    if (base in TEXTOS_PADRAO && (v?.dono === 'geral' || !it)) return TEXTOS_PADRAO[base];
    if (base === 'status' && it && this.det.opcoes.status) return 'breve'; // sem status = em breve
    if (!v?.formula) return '';
    const s = new Set(vistos || []);
    s.add(base);
    const r = avaliar(v.formula, (nome) => numBR(this.valorDe(this.linhaDaColuna(it, nome), nome, s)));
    return r == null ? '' : fmtBR(r);
  }

  /** o que a fórmula daria (para mostrar como placeholder e no botão ↺) */
  calculado(it: Linha | null, base: string): string {
    const v = this.vars[base];
    if (!v?.formula) return base in TEXTOS_PADRAO ? TEXTOS_PADRAO[base] : '';
    const r = avaliar(v.formula, (n) => numBR(this.valorDe(this.linhaDaColuna(it, n), n, new Set([base]))));
    return r == null ? '' : fmtBR(r);
  }

  /** status para contagem: vazio conta como "breve" */
  statusDe(it: Linha): string {
    const k = slug(this.valorDe(it, 'status') || 'breve').replace(/-/g, '_');
    return k === 'em_breve' ? 'breve' : k;
  }

  lista(tipo: TipoItem): Linha[] {
    return tipo === 'etapa' ? this.etapas : this.cidades;
  }

  idxDe(tipo: TipoItem, item: Linha): number {
    return this.lista(tipo).indexOf(item);
  }

  nomeItem(tipo: TipoItem, item: Linha): string {
    const i = this.idxDe(tipo, item);
    for (const p of COLUNAS_NOME[tipo]) if (item[p]) return item[p]!;
    const c = this.colunas(tipo);
    // a coluna de nome existe mas está vazia: não usa outra coluna (ex.: UF) como nome
    if (!COLUNAS_NOME[tipo].some((p) => c.includes(p))) for (const k of c) if (item[k]) return item[k]!;
    return (tipo === 'etapa' ? 'Etapa ' : 'Cidade ') + (i + 1);
  }

  private arquivoPadrao(tipo: TipoItem, item: Linha): string {
    const i = this.idxDe(tipo, item);
    if (tipo === 'etapa') {
      const e = slug(this.nomeItem('etapa', item)) || 'etapa-' + (i + 1);
      const c = this.cidadeDa(item);
      return (c ? this.arquivo('cidade', c).replace(/\.html?$/i, '') + '-' : '') + e + '.html';
    }
    return (slug(this.nomeItem('cidade', item)) || 'cidade-' + (i + 1)) + '.html';
  }

  /** nome do arquivo gerado: o digitado na coluna "Arquivo gerado" ou o automático */
  arquivo(tipo: TipoItem, item: Linha): string {
    return (item._arquivo || '').trim() || this.arquivoPadrao(tipo, item);
  }

  etapasDa(c: Linha): Linha[] {
    return this.etapas.filter((e) => e._cidade === c._id);
  }

  cidadeDa(e: Linha): Linha | undefined {
    return this.cidades.find((c) => c._id === e._cidade);
  }
}

/**
 * Linha nova copiada da de cima, menos o nome (cada linha é outra cidade/etapa), o arquivo e o status
 * (o status volta ao padrão, em breve).
 */
export function novaLinha(tipo: TipoItem, base: Linha | null, colunasDaTabela: string[], id: string): Linha {
  const novo: Linha = base ? JSON.parse(JSON.stringify(base)) : { _id: id };
  novo._id = id;
  delete novo._arquivo;
  delete novo.status;
  const nome = COLUNAS_NOME[tipo].find((k) => colunasDaTabela.includes(k));
  if (nome) novo[nome] = '';
  return novo;
}
