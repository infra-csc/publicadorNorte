// Seção de patrocinadores: montada a partir do banco geral (logos, links, cotas) e da composição de cada página.
// Fica sempre antes do rodapé. Cada cidade monta a sua; o tapume monta a dele; a etapa usa a da cidade.
import { esc } from './texto';
import { urlSegura } from './rodape';

export type Tamanho = 'GG' | 'G' | 'M' | 'P';
export const TAMANHOS: Tamanho[] = ['GG', 'G', 'M', 'P'];

/** patrocinador do banco geral */
export interface Patrocinador {
  id: string;
  nome: string;
  /** arquivo do logo dentro de _patrocinadores/ (ex.: "honda-1a2b.png") */
  logo: string;
  url: string;
  ativo: boolean;
}

/** cota do banco geral (Master, Gold…): tamanho padrão e se fica ao lado da cota anterior */
export interface Cota {
  id: string;
  /** título dos logos da cota ('' = sem título) */
  nome: string;
  tamanho: Tamanho;
  aoLado?: boolean;
  /** nome do bloco (faixa com várias cotas lado a lado), guardado na primeira cota da faixa; opcional */
  tituloBloco?: string;
}

export const COTAS_PADRAO: Cota[] = [
  { id: 'master', nome: 'Master', tamanho: 'GG' },
  { id: 'gold', nome: 'Gold', tamanho: 'G' },
  { id: 'silver', nome: 'Silver', tamanho: 'M' },
  { id: 'apoio', nome: 'Apoio', tamanho: 'P' },
  { id: 'ticketeria', nome: 'Ticketeria', tamanho: 'P' },
  { id: 'realizacao', nome: 'Realização', tamanho: 'P', aoLado: true },
];

export type OrdemBloco = 'alfabetica' | 'manual' | 'aleatoria';

/** um bloco da seção: uma cota com os seus logos */
export interface BlocoPatrocinio {
  id: string;
  cota: string;
  /** título mostrado; undefined = nome da cota; '' = sem título */
  titulo?: string;
  /** fica ao lado do bloco anterior; undefined = o padrão da cota */
  aoLado?: boolean;
  ordem: OrdemBloco;
  /** logos; tamanho próprio opcional (bloco misto) */
  itens: { patrocinador: string; tamanho?: Tamanho }[];
}

export interface ComposicaoPatrocinio {
  blocos: BlocoPatrocinio[];
}

export interface EstiloPatrocinio {
  corFundo?: string;
  corTitulo?: string;
}

export interface EntradaPatrocinios {
  /** composição por página: "tapume" e o _id de cada cidade (a etapa usa a da cidade) */
  porPagina: Record<string, ComposicaoPatrocinio>;
  estilo?: EstiloPatrocinio;
  /** banco geral */
  patrocinadores: Patrocinador[];
  cotas: Cota[];
}

/** pasta dos logos no site publicado */
export const PASTA_LOGOS = '_patrocinadores/';

const cor = (c: string | undefined, padrao: string) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c! : padrao);
const logoSeguro = (l: string) => /^[\w.-]+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(l || '') && !l.includes('..');
const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

/** tamanho de cada aplicação (largura × altura do card), desktop e celular */
const MEDIDAS: Record<Tamanho, { w: number; h: number; wm: number; hm: number }> = {
  GG: { w: 246, h: 180, wm: 200, hm: 146 },
  G: { w: 202, h: 150, wm: 150, hm: 112 },
  M: { w: 172, h: 137, wm: 104, hm: 84 },
  P: { w: 127, h: 103, wm: 92, hm: 75 },
};

export const SCRIPT_ALEATORIO =
  '<script data-pub-patrocinios>(function(){document.querySelectorAll("[data-pub-aleatorio]").forEach(function(l){for(var i=l.children.length;i>1;i--){l.appendChild(l.children[Math.random()*i|0]);}});})();</script>';

/** HTML da seção de patrocinadores de uma composição ('' se não houver logo para mostrar) */
export function montarPatrocinios(comp: ComposicaoPatrocinio | undefined, e: Pick<EntradaPatrocinios, 'patrocinadores' | 'cotas' | 'estilo'>): string {
  if (!comp?.blocos?.length) return '';
  const porId = new Map(e.patrocinadores.map((p) => [p.id, p]));
  const cotas = new Map(e.cotas.map((c) => [c.id, c]));
  let aleatorio = false;

  const blocos = comp.blocos
    .map((b) => {
      const cota = cotas.get(b.cota);
      const padrao: Tamanho = cota?.tamanho || 'P';
      const itens = b.itens
        .map((i) => ({ p: porId.get(i.patrocinador), tamanho: i.tamanho || padrao }))
        .filter((i): i is { p: Patrocinador; tamanho: Tamanho } => !!i.p && i.p.ativo && logoSeguro(i.p.logo));
      if (!itens.length) return null;
      // uma linha por tamanho, do maior para o menor
      const linhas = TAMANHOS.map((t) => {
        let l = itens.filter((i) => i.tamanho === t);
        if (b.ordem !== 'manual') l = [...l].sort((x, y) => comparar(x.p.nome, y.p.nome));
        return { t, l };
      }).filter((x) => x.l.length);
      if (b.ordem === 'aleatoria') aleatorio = true;
      const titulo = b.titulo === undefined ? cota?.nome || '' : b.titulo;
      const html =
        `<div class="pub-patro__bloco">` +
        (titulo.trim() ? `<p class="pub-patro__titulo">${esc(titulo.trim())}</p>` : '') +
        linhas
          .map(
            ({ t, l }) =>
              `<div class="pub-patro__linha pub-patro__linha--${t.toLowerCase()}"${b.ordem === 'aleatoria' ? ' data-pub-aleatorio' : ''}>` +
              l
                .map(({ p }) => {
                  const img = `<img src="${PASTA_LOGOS}${esc(p.logo)}" alt="${esc(p.nome)}" loading="lazy">`;
                  const u = urlSegura(p.url);
                  return u
                    ? `<a class="pub-patro__logo" href="${esc(u)}"${/^https?:/i.test(u) ? ' target="_blank" rel="noopener sponsored"' : ''}>${img}</a>`
                    : `<span class="pub-patro__logo">${img}</span>`;
                })
                .join('') +
              '</div>',
          )
          .join('') +
        '</div>';
      return { html, aoLado: b.aoLado ?? !!cota?.aoLado, tituloBloco: cota?.tituloBloco?.trim() || '' };
    })
    .filter((x): x is { html: string; aoLado: boolean; tituloBloco: string } => !!x);
  if (!blocos.length) return '';

  // blocos "ao lado" juntam-se ao anterior na mesma faixa; a faixa leva o nome do bloco da primeira cota
  const faixas: { titulo: string; html: string[] }[] = [];
  for (const b of blocos) {
    if (b.aoLado && faixas.length) faixas[faixas.length - 1].html.push(b.html);
    else faixas.push({ titulo: b.tituloBloco, html: [b.html] });
  }
  const faixa = (f: (typeof faixas)[number]) => {
    const div = `<div class="pub-patro__faixa">${f.html.join('')}</div>`;
    // nome do bloco só vale quando há mais de uma cota na faixa
    return f.titulo && f.html.length > 1 ? `<div class="pub-patro__grupo"><p class="pub-patro__titulo pub-patro__titulo--bloco">${esc(f.titulo)}</p>${div}</div>` : div;
  };

  const fundo = cor(e.estilo?.corFundo, '#f1f1f1');
  const titulo = cor(e.estilo?.corTitulo, '#222222');
  const css =
    `.pub-patro{background:${fundo};padding:56px 16px}` +
    '.pub-patro *{box-sizing:border-box}' +
    '.pub-patro__in{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:48px;align-items:center}' +
    '.pub-patro__faixa{display:flex;flex-wrap:wrap;gap:24px 48px;justify-content:center;align-items:flex-start}' +
    '.pub-patro__bloco{display:flex;flex-direction:column;gap:16px;align-items:center}' +
    `.pub-patro__titulo{margin:0;font-size:13px;color:${titulo};text-align:center}` +
    '.pub-patro__grupo{display:flex;flex-direction:column;gap:16px;align-items:center}.pub-patro__titulo--bloco{font-size:15px;font-weight:600}' +
    '.pub-patro__linha{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}' +
    '.pub-patro__logo{display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #d9d9d9;border-radius:14px;padding:12px}' +
    '.pub-patro__logo img{max-width:80%;max-height:70%;width:auto;height:auto;object-fit:contain;display:block}' +
    'a.pub-patro__logo:hover{border-color:#999}' +
    TAMANHOS.map((t) => `.pub-patro__linha--${t.toLowerCase()} .pub-patro__logo{width:${MEDIDAS[t].w}px;height:${MEDIDAS[t].h}px}`).join('') +
    '@media (max-width:600px){.pub-patro{padding:40px 12px}.pub-patro__in{gap:36px}.pub-patro__linha{gap:10px}' +
    TAMANHOS.map((t) => `.pub-patro__linha--${t.toLowerCase()} .pub-patro__logo{width:${MEDIDAS[t].wm}px;height:${MEDIDAS[t].hm}px;border-radius:10px}`).join('') +
    '}';
  return (
    `<section class="pub-patro" id="patrocinadores" aria-label="Patrocinadores" data-pub-patrocinios><style>${css}</style><div class="pub-patro__in">` +
    faixas.map(faixa).join('') +
    `</div>${aleatorio ? SCRIPT_ALEATORIO : ''}</section>`
  );
}

/**
 * Põe a seção antes do rodapé: antes do <footer> do HTML (fora das seções), se houver;
 * senão antes de </body> (e o rodapé padrão, que entra depois, fica abaixo dela).
 */
export function colocarPatrocinios(html: string, secao: string): string {
  if (!secao) return html;
  const m = /<footer\b(?![^>]*data-pub-rodape)[^>]*>/i.exec(html);
  if (m) {
    // só vale um <footer> que não esteja dentro de uma <section>
    const antes = html.slice(0, m.index);
    const abertas = (antes.match(/<section\b/gi) || []).length - (antes.match(/<\/section\s*>/gi) || []).length;
    if (abertas <= 0) return html.slice(0, m.index) + secao + html.slice(m.index);
  }
  const i = html.search(/<\/body>/i);
  return i >= 0 ? html.slice(0, i) + secao + html.slice(i) : html + secao;
}

/** patrocinadores inativos ou apagados usados numa composição (para avisar) */
export function patrocinadoresFora(e: EntradaPatrocinios): string[] {
  const porId = new Map(e.patrocinadores.map((p) => [p.id, p]));
  const fora = new Set<string>();
  for (const comp of Object.values(e.porPagina)) {
    for (const b of comp.blocos) for (const i of b.itens) {
      const p = porId.get(i.patrocinador);
      if (!p) fora.add(i.patrocinador + ' (apagado)');
      else if (!p.ativo) fora.add(p.nome);
    }
  }
  return [...fora];
}
