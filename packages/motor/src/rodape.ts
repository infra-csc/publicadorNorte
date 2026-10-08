// Rodapé padrão do publicador: montado a partir de uma configuração (fonte, cores, descrição, links e redes sociais)
// e colocado no fim da página. Geral do evento, com troca por cidade.
import { esc } from './texto';

export type RedeSocial = 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'x' | 'linkedin' | 'whatsapp' | 'spotify' | 'site' | 'email' | 'telefone';

export interface ConfigRodape {
  /** família do Google Fonts ('' = a mesma fonte da página) */
  fonte: string;
  corFundo: string;
  corTexto: string;
  /** cor dos links de texto */
  corLinks: string;
  descricao: string;
  links: { texto: string; url: string }[];
  /** ícones de redes sociais: têm a cor do texto */
  redes: { rede: RedeSocial; url: string }[];
}

export interface EscolhaRodape {
  /** rodapé padrão aparece no evento todo */
  ativo: boolean;
  geral: ConfigRodape;
  /** por cidade/etapa (_id da linha): mostrar/esconder e, se quiser, um rodapé próprio */
  porLinha?: Record<string, { ativo?: boolean; config?: ConfigRodape }>;
}

export const RODAPE_PADRAO: ConfigRodape = {
  fonte: '',
  corFundo: '#16181d',
  corTexto: '#f1f2ee',
  corLinks: '#f3e35a',
  descricao: '',
  links: [],
  redes: [],
};

export const REDES: Record<RedeSocial, { nome: string; svg: string }> = {
  instagram: { nome: 'Instagram', svg: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>' },
  facebook: { nome: 'Facebook', svg: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3.5H9V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z"/>' },
  youtube: { nome: 'YouTube', svg: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>' },
  tiktok: { nome: 'TikTok', svg: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.5 2.5 4.5 5 4.8"/>' },
  x: { nome: 'X', svg: '<path d="M4 4l16 16M20 4L4 20"/>' },
  linkedin: { nome: 'LinkedIn', svg: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>' },
  whatsapp: { nome: 'WhatsApp', svg: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9.5 9c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1a4 4 0 0 1-2-2l1-1-1-2z"/>' },
  spotify: { nome: 'Spotify', svg: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.7 9 1M8 12.5c2.5-.7 5-.5 7 .8M8.5 15.3c2-.5 3.8-.3 5.3.6"/>' },
  site: { nome: 'Site', svg: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>' },
  email: { nome: 'E-mail', svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' },
  telefone: { nome: 'Telefone', svg: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>' },
};

/** fontes sugeridas na tela (qualquer família do Google Fonts serve) */
export const FONTES_SUGERIDAS = [
  'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans', 'Lato', 'Raleway', 'Oswald', 'Nunito', 'Work Sans', 'DM Sans',
  'Manrope', 'Rubik', 'Barlow', 'Archivo', 'Space Grotesk', 'Bebas Neue', 'Playfair Display', 'Merriweather',
];

const cor = (c: string, padrao: string) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : padrao);
const fonteValida = (f: string) => /^[A-Za-z0-9 ]{2,40}$/.test((f || '').trim());
/** só links seguros: http(s), e-mail, telefone ou âncora */
export const urlSegura = (u: string): string | null => {
  const t = (u || '').trim();
  return /^(https?:\/\/|mailto:|tel:|#)/i.test(t) ? t : null;
};

/** HTML do rodapé (com o próprio estilo, isolado pela classe .pub-rodape) */
export function montarRodape(c: ConfigRodape): string {
  const fundo = cor(c.corFundo, RODAPE_PADRAO.corFundo);
  const texto = cor(c.corTexto, RODAPE_PADRAO.corTexto);
  const links = cor(c.corLinks, RODAPE_PADRAO.corLinks);
  const familia = fonteValida(c.fonte) ? `'${c.fonte.trim()}', system-ui, sans-serif` : 'inherit';
  const css =
    `.pub-rodape{background:${fundo};color:${texto};font-family:${familia};padding:40px 20px;font-size:15px;line-height:1.5}` +
    '.pub-rodape *{box-sizing:border-box}' +
    '.pub-rodape__in{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:20px;align-items:center;text-align:center}' +
    '.pub-rodape__desc{margin:0;white-space:pre-line;max-width:70ch}' +
    '.pub-rodape__links{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center}' +
    `.pub-rodape__links a{color:${links};text-decoration:none}.pub-rodape__links a:hover{text-decoration:underline}` +
    '.pub-rodape__redes{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;list-style:none;margin:0;padding:0}' +
    `.pub-rodape__redes a{color:${texto};display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:50%}` +
    '.pub-rodape__redes a:hover{opacity:.75}.pub-rodape__redes svg{width:22px;height:22px}';
  const partes: string[] = [];
  if (c.descricao.trim()) partes.push(`<p class="pub-rodape__desc">${esc(c.descricao.trim())}</p>`);
  const ls = c.links.map((l) => ({ texto: l.texto.trim(), url: urlSegura(l.url) })).filter((l) => l.texto && l.url);
  if (ls.length) partes.push(`<nav class="pub-rodape__links" aria-label="Links">${ls.map((l) => `<a href="${esc(l.url)}"${/^https?:/i.test(l.url!) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.texto)}</a>`).join('')}</nav>`);
  const rs = c.redes.filter((r) => REDES[r.rede] && urlSegura(r.url));
  if (rs.length) {
    partes.push(
      `<ul class="pub-rodape__redes">${rs
        .map((r) => {
          const u = urlSegura(r.url)!;
          return `<li><a href="${esc(u)}"${/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : ''} aria-label="${REDES[r.rede].nome}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${REDES[r.rede].svg}</svg></a></li>`;
        })
        .join('')}</ul>`,
    );
  }
  return `<footer class="pub-rodape" data-pub-rodape><style>${css}</style><div class="pub-rodape__in">${partes.join('')}</div></footer>`;
}

/** link do Google Fonts para a fonte do rodapé ('' se não precisar) */
export function linkFonte(c: ConfigRodape): string {
  if (!fonteValida(c.fonte)) return '';
  const fam = encodeURIComponent(c.fonte.trim()).replace(/%20/g, '+');
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fam}:wght@400;600;700&amp;display=swap" data-pub-rodape>`;
}

/** rodapé valendo numa página: o geral, ou o da cidade, ou o da etapa (null = não mostrar) */
export function rodapeDaPagina(escolha: EscolhaRodape | undefined, linhas: (string | undefined)[]): ConfigRodape | null {
  if (!escolha) return null;
  let ativo = escolha.ativo;
  let config = escolha.geral;
  for (const l of linhas) {
    const p = l ? escolha.porLinha?.[l] : undefined;
    if (!p) continue;
    if (p.ativo !== undefined) ativo = p.ativo;
    if (p.config) config = p.config;
  }
  return ativo ? config : null;
}

/** põe o rodapé antes de </body> (ou no fim) e a fonte no <head> */
export function colocarRodape(html: string, c: ConfigRodape | null): string {
  if (!c) return html;
  const rod = montarRodape(c);
  const fonte = linkFonte(c);
  if (fonte) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => fonte + '</head>') : fonte + html;
  const i = html.search(/<\/body>/i);
  return i >= 0 ? html.slice(0, i) + rod + html.slice(i) : html + rod;
}
