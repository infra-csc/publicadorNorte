// Acesso ao GitHub só por fetch (roda igual no Node e na Cloudflare).
// Cada gravação é um commit: lê o branch, monta as mudanças e avança o ponteiro.

const API = 'https://api.github.com';

export class ErroGitHub extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

export interface EntradaArvore { path: string; mode: string; type: 'blob' | 'tree' | 'commit'; sha: string; size?: number }

/** mudança num caminho: sha do blob novo, ou null para apagar */
export type Mudancas = Map<string, string | null>;

export function paraBase64(bytes: Uint8Array): string {
  let s = '';
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) s += String.fromCharCode(...bytes.subarray(i, i + passo));
  return btoa(s);
}

export class GitHub {
  constructor(private token: string, readonly repo: string) {}

  async api<T = unknown>(caminho: string, init: RequestInit & { cru?: boolean } = {}): Promise<T> {
    const r = await fetch(`${API}/repos/${this.repo}${caminho}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: init.cru ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'publicador-norte',
        ...(init.body && !init.cru ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      cache: 'no-store',
    });
    if (!r.ok) {
      let msg = r.statusText;
      try { msg = ((await r.json()) as { message?: string }).message || msg; } catch { /* sem corpo */ }
      throw new ErroGitHub(r.status, msg);
    }
    if (init.cru) return new Uint8Array(await r.arrayBuffer()) as T;
    if (r.status === 204) return undefined as T;
    return (await r.json()) as T;
  }

  /** sha do último commit do branch, ou null se o branch não existe */
  async ref(branch: string): Promise<string | null> {
    try {
      const r = await this.api<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`);
      return r.object.sha;
    } catch (e) {
      if (e instanceof ErroGitHub && (e.status === 404 || e.status === 409)) return null;
      throw e;
    }
  }

  async arvoreDoCommit(commit: string): Promise<string> {
    return (await this.api<{ tree: { sha: string } }>(`/git/commits/${commit}`)).tree.sha;
  }

  /** só os arquivos (blobs) de uma árvore, com caminho completo */
  async arquivos(arvore: string): Promise<EntradaArvore[]> {
    const r = await this.api<{ tree: EntradaArvore[]; truncated: boolean }>(`/git/trees/${arvore}?recursive=1`);
    if (r.truncated) throw new ErroGitHub(500, 'O repositório ficou grande demais para listar de uma vez.');
    return r.tree.filter((e) => e.type === 'blob');
  }

  async criarBlob(bytes: Uint8Array): Promise<string> {
    return (await this.api<{ sha: string }>('/git/blobs', { method: 'POST', body: JSON.stringify({ content: paraBase64(bytes), encoding: 'base64' }) })).sha;
  }

  async criarBlobTexto(texto: string): Promise<string> {
    return (await this.api<{ sha: string }>('/git/blobs', { method: 'POST', body: JSON.stringify({ content: texto, encoding: 'utf-8' }) })).sha;
  }

  async lerBlob(sha: string): Promise<Uint8Array> {
    return this.api<Uint8Array>(`/git/blobs/${sha}`, { cru: true });
  }

  async lerTexto(sha: string): Promise<string> {
    return new TextDecoder().decode(await this.lerBlob(sha));
  }

  /**
   * Grava um commit no branch com as mudanças que `montar` pedir. `montar` recebe os arquivos atuais
   * (caminho → sha) e devolve as mudanças. Se outro commit entrar no meio, tenta de novo.
   */
  async alterar<T>(branch: string, mensagem: string, montar: (atuais: Map<string, string>) => Promise<{ mudancas: Mudancas; resultado: T }>): Promise<{ commit: string; resultado: T }> {
    for (let tentativa = 0; ; tentativa++) {
      const pai = await this.ref(branch);
      const base = pai ? await this.arvoreDoCommit(pai) : null;
      const atuais = new Map<string, string>();
      if (base) for (const e of await this.arquivos(base)) atuais.set(e.path, e.sha);
      const { mudancas, resultado } = await montar(atuais);
      const tree = [...mudancas]
        .filter(([p, sha]) => sha !== null || atuais.has(p))
        .map(([path, sha]) => ({ path, mode: '100644', type: 'blob', sha }));
      if (!tree.length && pai) return { commit: pai, resultado };
      const arvore = (await this.api<{ sha: string }>('/git/trees', { method: 'POST', body: JSON.stringify(base ? { base_tree: base, tree } : { tree }) })).sha;
      const commit = (await this.api<{ sha: string }>('/git/commits', { method: 'POST', body: JSON.stringify({ message: mensagem, tree: arvore, parents: pai ? [pai] : [] }) })).sha;
      try {
        if (pai) await this.api(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit, force: false }) });
        else await this.api('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit }) });
        return { commit, resultado };
      } catch (e) {
        // alguém gravou no meio: refaz em cima do commit novo
        if (e instanceof ErroGitHub && (e.status === 422 || e.status === 409) && tentativa < 3) continue;
        throw e;
      }
    }
  }

  async criarTag(nome: string, commit: string): Promise<void> {
    await this.api('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/tags/${nome}`, sha: commit }) });
  }

  async pages(): Promise<{ html_url: string; status: string | null } | null> {
    try {
      return await this.api<{ html_url: string; status: string | null }>('/pages');
    } catch (e) {
      if (e instanceof ErroGitHub && e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Situação da publicação mais recente do site pelas execuções do Actions ("pages build and deployment").
   * Publicações seguidas cancelam as montagens anteriores, e o registro antigo (/pages/builds) fica "errored"
   * mesmo com a última no ar; por isso vale a execução mais nova que não foi cancelada. Sem acesso ao Actions: null.
   */
  async situacaoPelasActions(branch: string): Promise<{ situacao: 'no-ar' | 'publicando' | 'erro'; commit: string } | null> {
    try {
      const r = await this.api<{ workflow_runs: { status: string; conclusion: string | null; head_sha: string }[] }>(`/actions/runs?branch=${encodeURIComponent(branch)}&per_page=10`);
      const run = r.workflow_runs.find((x) => x.conclusion !== 'cancelled');
      if (!run) return null;
      return { situacao: run.status !== 'completed' ? 'publicando' : run.conclusion === 'success' ? 'no-ar' : 'erro', commit: run.head_sha };
    } catch (e) {
      if (e instanceof ErroGitHub && (e.status === 403 || e.status === 404)) return null;
      throw e;
    }
  }

  async ultimaPublicacaoPages(): Promise<{ status: string; commit: string } | null> {
    try {
      return await this.api<{ status: string; commit: string }>('/pages/builds/latest');
    } catch (e) {
      if (e instanceof ErroGitHub && e.status === 404) return null;
      throw e;
    }
  }
}
