// Onde os eventos ficam guardados. Hoje: um branch do GitHub. Na Cloudflare: outra implementação
// desta mesma interface (ex.: D1 + R2), sem mexer nas telas nem nas rotas.
import type { TipoPagina } from '@norte/motor';
import type { ArquivoMidia, Evento, EventoCompleto, ResumoEvento } from '../comum/tipos';
import { ErroGitHub, type GitHub, type Mudancas } from './github';

export class Conflito extends Error {}
export class NaoEncontrado extends Error {}

export interface Armazenamento {
  listar(): Promise<ResumoEvento[]>;
  ler(slug: string): Promise<EventoCompleto | null>;
  criar(evento: Evento): Promise<void>;
  /** grava se ninguém tiver gravado depois da `versao` lida; senão lança Conflito */
  salvar(evento: Evento, versao: string): Promise<string>;
  /** lê, aplica `fn` e grava (para mudanças feitas pelo próprio servidor, como registrar uma publicação) */
  atualizar(slug: string, fn: (e: Evento) => void, mensagem: string): Promise<{ evento: Evento; versao: string }>;
  salvarModelo(slug: string, tipo: TipoPagina, html: string): Promise<void>;
  /** move para a lixeira (dá para recuperar) */
  excluir(slug: string): Promise<void>;
  renomear(slug: string, novo: string): Promise<void>;
  enviarArquivo(bytes: Uint8Array): Promise<string>;
  lerArquivo(sha: string): Promise<Uint8Array>;
  adicionarMidia(slug: string, arquivos: ArquivoMidia[]): Promise<void>;
  /** remove os arquivos indicados, ou toda a mídia do evento se nenhum for indicado */
  removerMidia(slug: string, caminhos?: string[]): Promise<void>;
}

const PASTA = 'eventos/';
const pasta = (slug: string) => `${PASTA}${slug}/`;
const ARQ_EVENTO = 'evento.json';
const MODELOS = 'modelos/';
const MIDIA = 'arquivos/';
const LEIA_ME = 'LEIA-ME.md';
const TEXTO_LEIA_ME = '# Dados do Publicador de Hotsites\n\nEste branch é gravado pelo publicador. Não edite à mão.\n';

const json = (e: Evento) => JSON.stringify(e, null, 2) + '\n';

export class ArmazenamentoGitHub implements Armazenamento {
  constructor(private gh: GitHub, private branch: string) {}

  private async arquivosDoBranch(): Promise<Map<string, { sha: string; size: number }>> {
    const pai = await this.gh.ref(this.branch);
    const out = new Map<string, { sha: string; size: number }>();
    if (!pai) return out;
    for (const e of await this.gh.arquivos(await this.gh.arvoreDoCommit(pai))) out.set(e.path, { sha: e.sha, size: e.size || 0 });
    return out;
  }

  async listar(): Promise<ResumoEvento[]> {
    const todos = await this.arquivosDoBranch();
    const out: ResumoEvento[] = [];
    await Promise.all(
      [...todos].filter(([p]) => p.startsWith(PASTA) && p.endsWith('/' + ARQ_EVENTO) && p.split('/').length === 3).map(async ([, a]) => {
        const e = JSON.parse(await this.gh.lerTexto(a.sha)) as Evento;
        const ativa = e.publicacoes.find((p) => p.versao === e.versaoAtiva);
        out.push({ slug: e.slug, nome: e.nome, formato: e.formato, cidades: e.cidades.length, atualizadoEm: e.atualizadoEm, url: ativa?.url || null });
      }),
    );
    return out.sort((a, b) => (a.atualizadoEm < b.atualizadoEm ? 1 : -1));
  }

  async ler(slug: string): Promise<EventoCompleto | null> {
    const todos = await this.arquivosDoBranch();
    const p = pasta(slug);
    const ev = todos.get(p + ARQ_EVENTO);
    if (!ev) return null;
    const evento = JSON.parse(await this.gh.lerTexto(ev.sha)) as Evento;
    const modelos: EventoCompleto['modelos'] = {};
    const arquivos: ArquivoMidia[] = [];
    const leituras: Promise<void>[] = [];
    for (const [caminho, a] of todos) {
      if (!caminho.startsWith(p)) continue;
      const resto = caminho.slice(p.length);
      if (resto.startsWith(MODELOS)) {
        const tipo = resto.slice(MODELOS.length).replace(/\.html$/, '') as TipoPagina;
        leituras.push(this.gh.lerTexto(a.sha).then((t) => { modelos[tipo] = t; }));
      } else if (resto.startsWith(MIDIA)) arquivos.push({ caminho: resto.slice(MIDIA.length), sha: a.sha, bytes: a.size });
    }
    await Promise.all(leituras);
    arquivos.sort((a, b) => (a.caminho < b.caminho ? -1 : 1));
    return { evento, versao: ev.sha, modelos, arquivos };
  }

  private async gravarEvento(evento: Evento, mensagem: string, conferir?: (atual: string | undefined) => void): Promise<string> {
    const sha = await this.gh.criarBlobTexto(json(evento));
    await this.gh.alterar(this.branch, mensagem, async (atuais) => {
      conferir?.(atuais.get(pasta(evento.slug) + ARQ_EVENTO));
      const mudancas: Mudancas = new Map([[pasta(evento.slug) + ARQ_EVENTO, sha]]);
      if (!atuais.has(LEIA_ME)) mudancas.set(LEIA_ME, await this.gh.criarBlobTexto(TEXTO_LEIA_ME));
      return { mudancas, resultado: null };
    });
    return sha;
  }

  async criar(evento: Evento): Promise<void> {
    await this.gravarEvento(evento, `Cria o evento ${evento.nome}`, (atual) => {
      if (atual) throw new Conflito('Já existe um evento com esse endereço.');
    });
  }

  async salvar(evento: Evento, versao: string): Promise<string> {
    return this.gravarEvento(evento, `Atualiza ${evento.nome}`, (atual) => {
      if (!atual) throw new NaoEncontrado('Evento não encontrado.');
      if (atual !== versao) throw new Conflito('Outra pessoa salvou este evento enquanto você editava.');
    });
  }

  async atualizar(slug: string, fn: (e: Evento) => void, mensagem: string): Promise<{ evento: Evento; versao: string }> {
    const { resultado } = await this.gh.alterar(this.branch, mensagem, async (atuais) => {
      const sha = atuais.get(pasta(slug) + ARQ_EVENTO);
      if (!sha) throw new NaoEncontrado('Evento não encontrado.');
      const e = JSON.parse(await this.gh.lerTexto(sha)) as Evento;
      fn(e);
      e.atualizadoEm = new Date().toISOString();
      const novo = await this.gh.criarBlobTexto(json(e));
      return { mudancas: new Map([[pasta(slug) + ARQ_EVENTO, novo]]), resultado: { evento: e, versao: novo } };
    });
    return resultado;
  }

  async salvarModelo(slug: string, tipo: TipoPagina, html: string): Promise<void> {
    const sha = await this.gh.criarBlobTexto(html);
    await this.gh.alterar(this.branch, `Envia o HTML ${tipo} de ${slug}`, async (atuais) => {
      if (!atuais.has(pasta(slug) + ARQ_EVENTO)) throw new NaoEncontrado('Evento não encontrado.');
      return { mudancas: new Map([[pasta(slug) + MODELOS + tipo + '.html', sha]]), resultado: null };
    });
  }

  /** move todos os arquivos de um prefixo para outro, num commit só */
  private async mover(de: string, para: string, mensagem: string, ajustar?: (e: Evento) => void): Promise<void> {
    await this.gh.alterar(this.branch, mensagem, async (atuais) => {
      const mudancas: Mudancas = new Map();
      for (const [p, sha] of atuais) {
        if (!p.startsWith(de)) continue;
        mudancas.set(p, null);
        mudancas.set(para + p.slice(de.length), sha);
      }
      if (!mudancas.size) throw new NaoEncontrado('Evento não encontrado.');
      if (ajustar) {
        const e = JSON.parse(await this.gh.lerTexto(atuais.get(de + ARQ_EVENTO)!)) as Evento;
        ajustar(e);
        mudancas.set(para + ARQ_EVENTO, await this.gh.criarBlobTexto(json(e)));
      }
      return { mudancas, resultado: null };
    });
  }

  async excluir(slug: string): Promise<void> {
    const quando = new Date().toISOString().replace(/[:.]/g, '-');
    await this.mover(pasta(slug), `lixeira/${slug}-${quando}/`, `Move ${slug} para a lixeira`);
  }

  async renomear(slug: string, novo: string): Promise<void> {
    const todos = await this.arquivosDoBranch();
    if (todos.has(pasta(novo) + ARQ_EVENTO)) throw new Conflito('Já existe um evento com esse endereço.');
    await this.mover(pasta(slug), pasta(novo), `Muda o endereço de ${slug} para ${novo}`, (e) => {
      e.slug = novo;
      e.atualizadoEm = new Date().toISOString();
    });
  }

  enviarArquivo(bytes: Uint8Array): Promise<string> {
    return this.gh.criarBlob(bytes);
  }

  lerArquivo(sha: string): Promise<Uint8Array> {
    return this.gh.lerBlob(sha);
  }

  async adicionarMidia(slug: string, arquivos: ArquivoMidia[]): Promise<void> {
    await this.gh.alterar(this.branch, `Envia ${arquivos.length} arquivo(s) de mídia de ${slug}`, async (atuais) => {
      if (!atuais.has(pasta(slug) + ARQ_EVENTO)) throw new NaoEncontrado('Evento não encontrado.');
      return { mudancas: new Map(arquivos.map((a) => [pasta(slug) + MIDIA + a.caminho, a.sha])), resultado: null };
    });
  }

  async removerMidia(slug: string, caminhos?: string[]): Promise<void> {
    const msg = caminhos ? `Exclui ${caminhos.length} arquivo(s) de mídia de ${slug}` : `Remove a mídia de ${slug}`;
    await this.gh.alterar(this.branch, msg, async (atuais) => {
      const pre = pasta(slug) + MIDIA;
      const alvo = caminhos ? new Set(caminhos.map((c) => pre + c)) : null;
      const apagar = [...atuais.keys()].filter((p) => p.startsWith(pre) && (!alvo || alvo.has(p)));
      return { mudancas: new Map(apagar.map((p) => [p, null])), resultado: null };
    });
  }
}

export const ehNaoEncontrado = (e: unknown) => e instanceof NaoEncontrado || (e instanceof ErroGitHub && e.status === 404);
