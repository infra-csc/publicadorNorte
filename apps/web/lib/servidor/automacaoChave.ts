// Chave que autoriza /api/automacao. O cron da Cloudflare (worker.ts) chama a rota por dentro do Worker.
// Sem AUTOMACAO_TOKEN configurado, a chave é derivada do GITHUB_TOKEN (os dois lados têm; quem é de fora, não).
export async function chaveAutomacao(env: { AUTOMACAO_TOKEN?: string; GITHUB_TOKEN?: string }): Promise<string | null> {
  if (env.AUTOMACAO_TOKEN) return env.AUTOMACAO_TOKEN;
  if (!env.GITHUB_TOKEN) return null;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.GITHUB_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('publicador-norte/automacao')));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}
