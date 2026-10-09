// Domínios próprios dos eventos (produção).

/** "https://www.Cuidar.com.br/" → "www.cuidar.com.br"; null se não for um domínio válido */
export function normalizarDominio(texto: string): string | null {
  let d = texto.trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  if (d.length > 253 || !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)) return null;
  // endereços do próprio publicador e de teste não servem
  if (/(^|\.)(workers\.dev|github\.io|localhost)$/.test(d)) return null;
  return d;
}

/** o host é do próprio publicador (painel), não de um site em produção? */
export function hostDoPublicador(host: string, extras = ''): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, '');
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(h) || h.endsWith('.workers.dev') || h.endsWith('.localhost')) return true;
  return extras.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(h);
}
