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
  /** logo no alto da coluna da esquerda: caminho de um arquivo da mídia do evento ('' = sem logo) */
  logo?: string;
  /** descrição; **assim** fica em negrito */
  descricao: string;
  /** título da coluna de links (ex.: "Dúvidas") */
  tituloLinks?: string;
  links: { texto: string; url: string }[];
  /** redes sociais: ícone na cor do texto e, se tiver, um texto ao lado (ex.: "Siga no Instagram") */
  redes: { rede: RedeSocial; url: string; texto?: string }[];
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
  corLinks: '#f1f2ee',
  logo: '',
  descricao: '',
  tituloLinks: '',
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

/** imagem do logo: arquivo da mídia do evento (caminho relativo) ou endereço https */
export const caminhoSeguro = (c: string): string | null => {
  const t = (c || '').trim();
  if (/^https:\/\//i.test(t)) return t;
  return /^[\w\-./ ]+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(t) && !t.includes('..') && !t.startsWith('/') ? t : null;
};

/** **texto** vira negrito (o texto já vem escapado) */
const negrito = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/** HTML do rodapé (com o próprio estilo, isolado pela classe .pub-rodape) */
export function montarRodape(c: ConfigRodape): string {
  const fundo = cor(c.corFundo, RODAPE_PADRAO.corFundo);
  const texto = cor(c.corTexto, RODAPE_PADRAO.corTexto);
  const links = cor(c.corLinks, RODAPE_PADRAO.corLinks);
  const familia = fonteValida(c.fonte) ? `'${c.fonte.trim()}', system-ui, sans-serif` : 'inherit';
  const novaAba = (u: string) => (/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '');

  // coluna da esquerda: logo + descrição
  const esquerda: string[] = [];
  const logo = caminhoSeguro(c.logo || '');
  if (logo) esquerda.push(`<img class="pub-rodape__logo" src="${esc(logo)}" alt="">`);
  if (c.descricao.trim()) esquerda.push(`<p class="pub-rodape__desc">${negrito(esc(c.descricao.trim()))}</p>`);

  // coluna da direita: título, links e redes sociais
  const direita: string[] = [];
  const ls = c.links.map((l) => ({ texto: l.texto.trim(), url: urlSegura(l.url) })).filter((l) => l.texto && l.url);
  const rs = c.redes.filter((r) => REDES[r.rede] && urlSegura(r.url));
  if ((c.tituloLinks || '').trim() && (ls.length || rs.length)) direita.push(`<p class="pub-rodape__titulo">${esc(c.tituloLinks!.trim())}</p>`);
  if (ls.length) direita.push(`<nav class="pub-rodape__links" aria-label="${esc((c.tituloLinks || '').trim() || 'Links')}">${ls.map((l) => `<a href="${esc(l.url!)}"${novaAba(l.url!)}>${esc(l.texto)}</a>`).join('')}</nav>`);
  if (rs.length) {
    direita.push(
      `<ul class="pub-rodape__redes">${rs
        .map((r) => {
          const u = urlSegura(r.url)!;
          const rotulo = (r.texto || '').trim();
          const icone = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${REDES[r.rede].svg}</svg>`;
          return `<li><a href="${esc(u)}"${novaAba(u)}${rotulo ? '' : ` aria-label="${REDES[r.rede].nome}"`}>${icone}${rotulo ? `<span>${esc(rotulo)}</span>` : ''}</a></li>`;
        })
        .join('')}</ul>`,
    );
  }

  const duas = esquerda.length > 0 && direita.length > 0;
  const css =
    `.pub-rodape{background:${fundo};color:${texto};font-family:${familia};padding:56px 24px;font-size:16px;line-height:1.55}` +
    '.pub-rodape *{box-sizing:border-box}' +
    `.pub-rodape__in{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:${duas ? 'minmax(0,1.5fr) minmax(0,1fr)' : 'minmax(0,1fr)'};gap:40px 64px;align-items:start}` +
    '.pub-rodape__esq{display:flex;flex-direction:column;gap:24px;align-items:flex-start}' +
    '.pub-rodape__logo{display:block;max-height:80px;max-width:240px;width:auto;height:auto}' +
    '.pub-rodape__desc{margin:0;white-space:pre-line;max-width:62ch}.pub-rodape__desc strong{font-weight:700}' +
    `.pub-rodape__dir{display:flex;flex-direction:column;gap:12px;${duas ? 'justify-self:end;' : ''}}` +
    '.pub-rodape__titulo{margin:0;font-weight:700;font-size:1.05em}' +
    '.pub-rodape__links{display:flex;flex-direction:column;gap:6px}' +
    `.pub-rodape__links a{color:${links};text-decoration:none}.pub-rodape__links a:hover{text-decoration:underline}` +
    '.pub-rodape__redes{display:flex;flex-direction:column;gap:8px;list-style:none;margin:10px 0 0;padding:0}' +
    `.pub-rodape__redes a{color:${texto};display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:13px}` +
    '.pub-rodape__redes a:hover{opacity:.75}.pub-rodape__redes svg{width:20px;height:20px;flex:none}' +
    '@media (max-width:760px){' +
    '.pub-rodape{padding:48px 20px}.pub-rodape__in{grid-template-columns:minmax(0,1fr);gap:48px;text-align:center;justify-items:center}' +
    '.pub-rodape__esq,.pub-rodape__dir{align-items:center;justify-self:center}' +
    '.pub-rodape__titulo{font-size:1.4em}.pub-rodape__links{gap:14px;font-size:1.1em}' +
    '.pub-rodape__redes{flex-direction:row;flex-wrap:wrap;justify-content:center;gap:18px}}';
  const colunas = (esquerda.length ? `<div class="pub-rodape__esq">${esquerda.join('')}</div>` : '') + (direita.length ? `<div class="pub-rodape__dir">${direita.join('')}</div>` : '');
  return `<footer class="pub-rodape" data-pub-rodape><style>${css}</style><div class="pub-rodape__in">${colunas}</div></footer>`;
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
