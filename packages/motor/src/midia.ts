import type { Deteccao } from './detectar';
import type { TipoPagina } from './tipos';

/** Tipos aceitos na pasta _media. Arquivos ocultos e de outros tipos são ignorados. */
export const TIPOS_ARQUIVO: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  mp4: 'video/mp4', webm: 'video/webm', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf',
  css: 'text/css', js: 'text/javascript', json: 'application/json', pdf: 'application/pdf',
};
const ext = (n: string) => (String(n).split('.').pop() || '').toLowerCase();
export const tipoArquivo = (k: string): string | null => TIPOS_ARQUIVO[ext(k)] || null;
export const ehImagemArq = (k: string) => /^image\//.test(tipoArquivo(k) || '');
export const ehVideoArq = (k: string) => /^video\//.test(tipoArquivo(k) || '');

/** O arquivo enviado entra no evento? (tipo aceito e não oculto) */
export const arquivoAceito = (caminho: string): boolean => !!tipoArquivo(caminho) && !/(^|\/)\./.test(caminho);

// ---- variáveis de mídia: @img_<secao>_<nome>, @video_<secao>_<nome>, @media_<secao>_<nome> ----

const RX_DESK = /(^|[_\-/.])(desktop|desk)([_\-/.]|$)/i;
const RX_MOB = /(^|[_\-/.])(mobile|mob|celular)([_\-/.]|$)/i;
/** versão de tela: slot …_desktop só vê arquivos de desktop, …_mobile só de mobile */
export const versaoTela = (nome: string): '' | 'desktop' | 'mobile' => (RX_DESK.test(nome) ? 'desktop' : RX_MOB.test(nome) ? 'mobile' : '');
const tipoMidia = (base: string) => base.split('_')[0];
export const secaoMidia = (base: string) => base.split('_')[1] || '';
export const slotMidia = (base: string) => base.split('_').slice(2).join('_') || secaoMidia(base);
const PASTA_PAG: Record<TipoPagina, string> = { tapume: 'tapume', praca: 'praca', etapa: 'etapa', unica: 'pagina' };

/** _media/… (atual) ou _images/… (versão antiga do guia): caminho a partir dessa pasta */
export const caminhoMidia = (k: string): string => {
  const m = k.match(/(^|\/)(_media|_images)\//);
  return m ? k.slice(m.index! + m[1].length) : k;
};

/** pastas onde a variável procura arquivos: _media/<pagina>/<secao>/ de cada página em que aparece */
export function pastasMidia(base: string, det: Deteccao): string[] {
  const d = det.variaveis.get(base);
  const kinds = d ? (Object.keys(d.por) as TipoPagina[]) : (['praca'] as TipoPagina[]);
  return [...new Set(kinds.flatMap((k) => ['_media', '_images'].map((r) => `${r}/${PASTA_PAG[k] || k}/${secaoMidia(base)}/`)))];
}

export interface OpcaoMidia { arquivo: string; caminho: string }

/** opções de uma variável de mídia: só os arquivos das pastas da seção dela, do tipo e da versão de tela certos */
export function opcoesMidia(base: string, det: Deteccao, arquivos: Iterable<string>): OpcaoMidia[] {
  const pastas = pastasMidia(base, det);
  const vistas = new Set<string>();
  const out: OpcaoMidia[] = [];
  const t = tipoMidia(base);
  for (const k of arquivos) {
    const c = caminhoMidia(k);
    const tipoOk = t === 'video' ? ehVideoArq(c) : t === 'img' ? ehImagemArq(c) : ehVideoArq(c) || ehImagemArq(c);
    const pasta = pastas.find((p) => c.startsWith(p));
    const vSlot = versaoTela(slotMidia(base));
    const vArq = versaoTela(c.slice(pasta?.length || 0));
    const telaOk = !vSlot || !vArq || vSlot === vArq;
    if (tipoOk && telaOk && pasta && !vistas.has(c)) { vistas.add(c); out.push({ arquivo: k, caminho: c }); }
  }
  return out.sort((a, b) => (a.caminho < b.caminho ? -1 : a.caminho > b.caminho ? 1 : 0));
}

/** arquivo padrão: o de nome igual ao fim da variável (preferindo imagem); senão a primeira imagem; senão o primeiro */
export function padraoMidia(base: string, ops: OpcaoMidia[]): string {
  const nome = slotMidia(base);
  const img = (o: OpcaoMidia) => ehImagemArq(o.caminho);
  const mesmos = ops.filter((o) => o.caminho.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase() === nome);
  return (mesmos.find(img) || mesmos[0] || ops.find(img) || ops[0])?.caminho || '';
}

/** caminho escolhido (se ainda é uma opção válida) ou o padrão */
export function valorMidia(base: string, escolhido: string | undefined, det: Deteccao, arquivos: Iterable<string>): string {
  const ops = opcoesMidia(base, det, arquivos);
  if (escolhido && ops.some((o) => o.caminho === escolhido)) return escolhido;
  return padraoMidia(base, ops);
}

// ---- referências de arquivo no HTML ----

const RX_REF = /(?:\s(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["'])|(?:url\(\s*["']?([^"')]+?)["']?\s*\))|(?:\ssrcset\s*=\s*["']([^"']+)["'])/gi;
const RX_REF_TXT = /["'`]([^"'`\s<>]+\.(?:mp4|webm|webp|png|jpe?g|gif|svg|avif|woff2?|ttf|otf|pdf))["'`]/gi;
export const refExterna = (r: string): boolean => /^(?:[a-z]+:|\/\/|#|@)/i.test(r) || !r.trim();
export const normRef = (r: string): string => {
  let x = r.trim().split(/[?#]/)[0].replace(/^\.\//, '');
  try { x = decodeURI(x); } catch { /* fica como está */ }
  return x;
};

/** Caminhos de arquivo que o HTML usa: src, href (não .html), poster, data-src, srcset, url() e strings de JS com extensão de mídia. */
export function refsDeArquivo(html: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  // caminhos dentro do JavaScript, como vídeos trocados por tamanho de tela
  const rt = new RegExp(RX_REF_TXT.source, 'gi');
  while ((m = rt.exec(html))) if (!refExterna(m[1])) out.add(m[1]);
  const r = new RegExp(RX_REF.source, 'gi');
  while ((m = r.exec(html))) {
    if (m[3]) {
      for (const p of m[3].split(',')) {
        const u = p.trim().split(/\s+/)[0];
        if (u && !refExterna(u)) out.add(u);
      }
    } else {
      const u = m[1] || m[2];
      if (u && !refExterna(u) && !/\.html?$/i.test(normRef(u))) out.add(u);
    }
  }
  return [...out];
}

/** Arquivo enviado que corresponde a uma referência: caminho exato → termina com o caminho → mesmo nome em qualquer pasta. */
export function acharArquivo(ref: string, arquivos: Iterable<string>): string | null {
  const chaves = [...arquivos];
  const r = normRef(ref);
  if (chaves.includes(r)) return r;
  const k = chaves.find((c) => c.endsWith('/' + r));
  if (k) return k;
  const nome = r.split('/').pop();
  return chaves.find((c) => c.split('/').pop() === nome) || null;
}

// ---- troca imagem ↔ vídeo ----

const ATTR_VIDEO = /\s(autoplay|muted|loop|playsinline|controls|preload|poster)(=("[^"]*"|'[^']*'|\S+))?/gi;
const VID = /\.(?:mp4|webm)(?:[?#][^"']*)?$/i;
const IMG = /\.(?:webp|png|jpe?g|gif|avif|svg)(?:[?#][^"']*)?$/i;
// :where() = especificidade zero: o CSS da página (ex.: .hero__bg--desk{display:none}) sempre vence
export const CSS_MIDIA = '<style>:where(video[data-pub-midia],img[data-pub-midia]){display:block;width:100%;height:100%;object-fit:cover}</style>';
const limparAttrs = (s: string) => s.replace(/\s+/g, ' ').replace(/\s+$/, '');

/** `<img>` com vídeo vira `<video>`, `<video>` com imagem vira `<img>`, e o `<picture>` acompanha. */
export function ajustarTagsMidia(html: string): string {
  let mudou = false;
  const paraVideo = (attrs: string, q: string, src: string) => {
    mudou = true;
    const at = attrs
      .replace(/\salt=("[^"]*"|'[^']*')/i, (_x, v) => ' aria-label=' + v)
      .replace(/\s(srcset|sizes|loading|decoding|fetchpriority)=("[^"]*"|'[^']*')/gi, '')
      .replace(/\s*\/$/, '');
    return `<video${limparAttrs(at)} src=${q}${src}${q} data-pub-midia autoplay muted loop playsinline></video>`;
  };
  // <picture> cujo <img> virou vídeo: o vídeo ocupa o lugar do <picture> inteiro (vídeo não funciona dentro de <picture>)
  html = html.replace(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi, (todo, dentro: string) => {
    const im = dentro.match(/<img\b([^>]*?)\bsrc=(["'])([^"']+)\2([^>]*)>/i);
    if (im && VID.test(im[3])) return paraVideo(im[1] + im[4], im[2], im[3]);
    // <source> com vídeo dentro de <picture> não toca: sai, e fica a imagem
    const limpo = dentro.replace(/<source\b[^>]*\bsrcset=(["'])([^"']+)\1[^>]*>/gi, (t: string, _q: string, u: string) => (VID.test(u) ? ((mudou = true), '') : t));
    return todo.replace(dentro, () => limpo);
  });
  html = html
    .replace(/<img\b([^>]*?)(?<![\w-])src=(["'])([^"']+)\2([^>]*?)\/?>/gi, (t, a: string, q: string, src: string, b: string) => (VID.test(src) ? paraVideo(a + b, q, src) : t))
    .replace(/<video\b([^>]*?)(?<![\w-])src=(["'])([^"']+)\2([^>]*)>[\s\S]*?<\/video>/gi, (t, a: string, q: string, src: string, b: string) => {
      if (!IMG.test(src)) return t;
      mudou = true;
      const at = limparAttrs(
        (a + b).replace(ATTR_VIDEO, '').replace(/\sdata-pub-midia/g, '').replace(/\saria-label=("[^"]*"|'[^']*')/i, (_x, v) => ' alt=' + v),
      );
      return `<img${at} src=${q}${src}${q}${/\salt=/.test(at) ? '' : ' alt=""'} data-pub-midia>`;
    });
  // o vídeo que entrou no lugar de uma imagem ocupa o mesmo espaço que ela ocupava
  if (mudou) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, CSS_MIDIA + '</head>') : CSS_MIDIA + html;
  return html;
}
