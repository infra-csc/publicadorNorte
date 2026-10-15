// Chaves das rotas chamadas de fora da tela. Chave que autoriza /api/automacao. O cron da Cloudflare (worker.ts) chama a rota por dentro do Worker.
// Sem AUTOMACAO_TOKEN configurado, a chave é derivada do GITHUB_TOKEN (os dois lados têm; quem é de fora, não).
export async function chaveAutomacao(env: { AUTOMACAO_TOKEN?: string; GITHUB_TOKEN?: string }): Promise<string | null> {
  return env.AUTOMACAO_TOKEN || derivada(env.GITHUB_TOKEN, 'publicador-norte/automacao');
}

/** chave do aviso do Odoo (/api/odoo/aviso): ODOO_AVISO_TOKEN ou derivada do GITHUB_TOKEN */
export async function chaveAvisoOdoo(env: { ODOO_AVISO_TOKEN?: string; GITHUB_TOKEN?: string }): Promise<string | null> {
  return env.ODOO_AVISO_TOKEN || derivada(env.GITHUB_TOKEN, 'publicador-norte/odoo-aviso');
}

async function derivada(segredo: string | undefined, rotulo: string): Promise<string | null> {
  if (!segredo) return null;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(rotulo)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}
