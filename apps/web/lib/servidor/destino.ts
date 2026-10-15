// Para onde a publicação vai. Hoje: branch servido pelo GitHub Pages. Na Cloudflare: outra implementação.
import { type GitHub, type Mudancas } from './github';

export interface ArquivoPublicado {
  caminho: string;
  /** conteúdo já guardado (mídia): o sha do blob */
  sha?: string;
  /** conteúdo novo (páginas HTML) */
  texto?: string;
}

export interface EstadoSite {
  /** o site está ligado (no GitHub: Pages ativado) */
  ligado: boolean;
  /** última atualização do site: no ar, publicando ou com erro */
  situacao: 'no-ar' | 'publicando' | 'erro' | 'desconhecida';
  commit: string | null;
  base: string | null;
}

export interface DestinoPublicacao {
  /** troca a pasta do evento pelos arquivos novos; devolve a referência da versão */
  publicar(slug: string, versao: number, arquivos: ArquivoPublicado[]): Promise<{ commit: string }>;
  /** volta a pasta do evento para uma versão anterior, como uma publicação nova */
  restaurar(slug: string, versao: number, commit: string): Promise<{ commit: string }>;
  url(slug: string): Promise<string>;
  estado(): Promise<EstadoSite>;
}

export class DestinoGitHubPages implements DestinoPublicacao {
  constructor(private gh: GitHub, private branch: string) {}

  private async trocarPasta(slug: string, mensagem: string, novos: Map<string, string>): Promise<string> {
    const pre = slug + '/';
    const { commit } = await this.gh.alterar(this.branch, mensagem, async (atuais) => {
      const mudancas: Mudancas = new Map();
      for (const p of atuais.keys()) if (p.startsWith(pre)) mudancas.set(p, null);
      for (const [p, sha] of novos) mudancas.set(pre + p, sha);
      // sem .nojekyll o GitHub Pages esconde as pastas que começam com "_" (como _media)
      if (!atuais.has('.nojekyll')) mudancas.set('.nojekyll', await this.gh.criarBlobTexto(''));
      return { mudancas, resultado: null };
    });
    return commit;
  }

  async publicar(slug: string, versao: number, arquivos: ArquivoPublicado[]): Promise<{ commit: string }> {
    const novos = new Map<string, string>();
    await Promise.all(
      arquivos.map(async (a) => {
        novos.set(a.caminho, a.sha ?? (await this.gh.criarBlobTexto(a.texto ?? '')));
      }),
    );
    const commit = await this.trocarPasta(slug, `Publica ${slug} v${versao}`, novos);
    await this.gh.criarTag(`${slug}-v${versao}`, commit).catch(() => { /* tag é só referência */ });
    return { commit };
  }

  async restaurar(slug: string, versao: number, commit: string): Promise<{ commit: string }> {
    const pre = slug + '/';
    const antigos = new Map<string, string>();
    for (const e of await this.gh.arquivos(await this.gh.arvoreDoCommit(commit))) if (e.path.startsWith(pre)) antigos.set(e.path.slice(pre.length), e.sha);
    return { commit: await this.trocarPasta(slug, `Volta ${slug} para a v${versao}`, antigos) };
  }

  private async base(): Promise<string> {
    const p = await this.gh.pages();
    if (p?.html_url) return p.html_url.endsWith('/') ? p.html_url : p.html_url + '/';
    const [dono, nome] = this.gh.repo.split('/');
    return `https://${dono.toLowerCase()}.github.io/${nome}/`;
  }

  async url(slug: string): Promise<string> {
    return (await this.base()) + slug + '/';
  }

  async estado(): Promise<EstadoSite> {
    const p = await this.gh.pages();
    if (!p) return { ligado: false, situacao: 'desconhecida', commit: null, base: null };
    const a = await this.gh.situacaoPelasActions(this.branch);
    if (a) return { ligado: true, situacao: a.situacao, commit: a.commit, base: await this.base() };
    const b = await this.gh.ultimaPublicacaoPages();
    const situacao = !b ? 'desconhecida' : b.status === 'built' ? 'no-ar' : b.status === 'errored' ? 'erro' : 'publicando';
    return { ligado: true, situacao, commit: b?.commit || null, base: await this.base() };
  }
}
