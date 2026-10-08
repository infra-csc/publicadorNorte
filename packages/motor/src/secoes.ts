// Seções que dá para esconder: cada <section id="…"> de primeiro nível do HTML-modelo.
// Esconder = tirar a seção da página gerada e também os links que apontam para ela (#id).
import { escRx } from './texto';
import { dentro, faixas } from './variaveis';

export interface Secao {
  id: string;
  /** nome para a tela: aria-label, senão o título da seção, senão o id */
  nome: string;
}

/** escolhas de seções do evento. Chave = "<tipo de página>#<id>", ex.: "praca#kit". */
export interface EscolhaSecoes {
  /** escondidas no evento todo */
  ocultas?: string[];
  /** exceções por cidade/etapa (_id da linha): true = mostrar, false = esconder */
  porLinha?: Record<string, Record<string, boolean>>;
  /** ordem das seções por tipo de página (ids). Muda a ordem na página gerada. */
  ordem?: Partial<Record<string, string[]>>;
}

interface Bloco { id: string | null; abre: string; ini: number; fim: number; miolo: string }

/** <section> de primeiro nível (fora de comentários, scripts e estilos) */
function blocos(src: string): Bloco[] {
  const ignorar = faixas(src, /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi);
  const rx = /<section\b[^>]*>|<\/section\s*>/gi;
  const out: Bloco[] = [];
  let nivel = 0;
  let aberto: { ini: number; abre: string; fimAbre: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src))) {
    if (dentro(ignorar, m.index)) continue;
    if (m[0][1] !== '/') {
      if (nivel === 0) aberto = { ini: m.index, abre: m[0], fimAbre: m.index + m[0].length };
      nivel++;
    } else if (nivel > 0) {
      nivel--;
      if (nivel === 0 && aberto) {
        const id = /\sid\s*=\s*["']([^"']+)["']/i.exec(aberto.abre)?.[1] || null;
        out.push({ id, abre: aberto.abre, ini: aberto.ini, fim: m.index + m[0].length, miolo: src.slice(aberto.fimAbre, m.index) });
        aberto = null;
      }
    }
  }
  return out;
}

const textoDe = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Seções que aparecem no passo de seções (as que têm id). */
export function secoesDe(html: string): Secao[] {
  return blocos(html)
    .filter((b) => b.id)
    .map((b) => {
      const rotulo = /\saria-label\s*=\s*["']([^"']+)["']/i.exec(b.abre)?.[1];
      const titulo = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(b.miolo)?.[1];
      // título que é só variável (ex.: <h1>@cidade_1</h1>) não serve de nome
      const t = titulo ? textoDe(titulo) : '';
      const temTexto = /\p{L}/u.test(t.replace(/@\{?\w+\}?/g, ''));
      const nome = (rotulo || (temTexto ? t : '') || b.id!).slice(0, 80);
      return { id: b.id!, nome };
    });
}

/** Tira da página as seções escondidas e os links que levam a elas. */
export function removerSecoes(html: string, ids: Set<string>): string {
  if (!ids.size) return html;
  const tirar = blocos(html).filter((b) => b.id && ids.has(b.id));
  for (const b of tirar.reverse()) html = html.slice(0, b.ini) + html.slice(b.fim);
  for (const id of ids) {
    const href = `\\bhref\\s*=\\s*["']#${escRx(id)}["']`;
    // item de menu que só tem o link: sai o item inteiro
    html = html.replace(new RegExp(`<li\\b[^>]*>\\s*<a\\b[^>]*${href}[^>]*>[\\s\\S]*?<\\/a>\\s*<\\/li>`, 'gi'), '');
    html = html.replace(new RegExp(`<a\\b[^>]*${href}[^>]*>[\\s\\S]*?<\\/a>`, 'gi'), '');
  }
  return html;
}

/** Ordem final dos ids: a salva, e cada seção nova (fora da ordem salva) logo depois da que vinha antes dela no HTML. */
export function ordemFinal(ids: string[], salva: string[] | undefined): string[] {
  const out = (salva || []).filter((id, i, l) => ids.includes(id) && l.indexOf(id) === i);
  ids.forEach((id, i) => {
    if (out.includes(id)) return;
    const antes = ids.slice(0, i).reverse().find((x) => out.includes(x));
    out.splice(antes ? out.indexOf(antes) + 1 : 0, 0, id);
  });
  return out;
}

/** Troca as seções (com id, de primeiro nível) de lugar conforme a ordem. O resto do HTML fica onde estava. */
export function reordenarSecoes(html: string, ordem: string[] | undefined): string {
  if (!ordem?.length) return html;
  const bs = blocos(html).filter((b) => b.id);
  const final = ordemFinal(bs.map((b) => b.id!), ordem);
  if (final.every((id, i) => id === bs[i].id)) return html;
  const porId = new Map(bs.map((b) => [b.id!, b]));
  let out = '';
  let ult = 0;
  bs.forEach((b, i) => {
    const novo = porId.get(final[i])!;
    out += html.slice(ult, b.ini) + html.slice(novo.ini, novo.fim);
    ult = b.fim;
  });
  return out + html.slice(ult);
}

/** ids escondidos numa página: o geral, depois a exceção da cidade, depois a da etapa */
export function ocultasDaPagina(tipo: string, escolha: EscolhaSecoes | undefined, linhas: (string | undefined)[]): Set<string> {
  const pre = tipo + '#';
  const out = new Set((escolha?.ocultas || []).filter((k) => k.startsWith(pre)).map((k) => k.slice(pre.length)));
  for (const l of linhas) {
    if (!l) continue;
    for (const [k, mostrar] of Object.entries(escolha?.porLinha?.[l] || {})) {
      if (!k.startsWith(pre)) continue;
      if (mostrar) out.delete(k.slice(pre.length));
      else out.add(k.slice(pre.length));
    }
  }
  return out;
}
