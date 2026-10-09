// Liga os domínios dos eventos ao Worker do publicador (Custom Domains da Cloudflare).
// Precisa de CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID; sem eles, a tela mostra o passo a passo manual.
// O domínio tem que estar (como zona) na mesma conta da Cloudflare do Worker.

const API = 'https://api.cloudflare.com/client/v4';

export type EstadoDominio =
  /** ligado ao Worker: o site responde nele */
  | 'conectado'
  /** a zona existe na conta, mas o domínio ainda não está ligado */
  | 'desligado'
  /** a conta não tem a zona desse domínio */
  | 'sem-zona'
  /** sem chave da Cloudflare: não dá para saber */
  | 'desconhecido';

export class ErroCloudflare extends Error {}

export class Cloudflare {
  constructor(private token: string, private conta: string, private worker: string) {}

  static doAmbiente(): Cloudflare | null {
    const t = process.env.CLOUDFLARE_API_TOKEN, c = process.env.CLOUDFLARE_ACCOUNT_ID;
    return t && c ? new Cloudflare(t, c, process.env.CLOUDFLARE_WORKER || 'publicador-norte') : null;
  }

  private async api<T>(caminho: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(API + caminho, { ...init, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...init.headers }, cache: 'no-store' });
    const j = (await r.json().catch(() => ({}))) as { success?: boolean; result?: T; errors?: { message: string }[] };
    if (!r.ok || j.success === false) throw new ErroCloudflare(j.errors?.map((e) => e.message).join('; ') || `HTTP ${r.status}`);
    return j.result as T;
  }

  /** zona da conta que contém o domínio (cuidar.com.br para www.cuidar.com.br) */
  async zona(dominio: string): Promise<{ id: string; name: string } | null> {
    const partes = dominio.split('.');
    for (let i = 0; i < partes.length - 1; i++) {
      const nome = partes.slice(i).join('.');
      const z = await this.api<{ id: string; name: string }[]>(`/zones?name=${encodeURIComponent(nome)}&account.id=${this.conta}`);
      if (z.length) return z[0];
    }
    return null;
  }

  private async ligados(dominio: string) {
    return this.api<{ id: string; hostname: string; service: string }[]>(`/accounts/${this.conta}/workers/domains?hostname=${encodeURIComponent(dominio)}`);
  }

  async estado(dominio: string): Promise<EstadoDominio> {
    if ((await this.ligados(dominio)).some((d) => d.hostname === dominio && d.service === this.worker)) return 'conectado';
    return (await this.zona(dominio)) ? 'desligado' : 'sem-zona';
  }

  /** liga o domínio ao Worker (a Cloudflare cria o DNS e o certificado) */
  async conectar(dominio: string): Promise<EstadoDominio> {
    const z = await this.zona(dominio);
    if (!z) return 'sem-zona';
    await this.api(`/accounts/${this.conta}/workers/domains`, {
      method: 'PUT',
      body: JSON.stringify({ hostname: dominio, service: this.worker, environment: 'production', zone_id: z.id }),
    });
    return 'conectado';
  }

  /** desliga o domínio do Worker (só se estiver ligado a ele) */
  async desconectar(dominio: string): Promise<void> {
    for (const d of await this.ligados(dominio)) {
      if (d.hostname === dominio && d.service === this.worker) await this.api(`/accounts/${this.conta}/workers/domains/${d.id}`, { method: 'DELETE' });
    }
  }
}
