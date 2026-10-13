// Séries numeradas das variáveis gerais: tema1_titulo, tema1_texto, tema2_titulo… → série "tema" com itens 1, 2…
// O número fica colado num pedaço do nome (tema1, faq10, carreta_ponto2). Usado no Cadastro (blocos) e no verificador.

export interface Serie {
  /** nome inteiro antes do número (material_capa_linha ≠ hero_linha) */
  chave: string;
  /** pedaço com o número, sem ele (faq, ponto) */
  raiz: string;
  /** campos na ordem em que aparecem, com # no lugar do número (faq#_pergunta) */
  campos: string[];
  /** número → campo → variável */
  itens: Map<number, Map<string, string>>;
}

export function separarSeries(nomes: string[]): { soltas: string[]; series: Serie[] } {
  const porChave = new Map<string, Serie>();
  const de = new Map<string, { chave: string; raiz: string; n: number; campo: string }>();
  for (const g of nomes) {
    const partes = g.split('_');
    const i = partes.findIndex((p) => /^[a-z]+\d+$/.test(p));
    if (i < 0) continue;
    const [, raiz, num] = /^([a-z]+)(\d+)$/.exec(partes[i])!;
    const campo = [...partes.slice(0, i), raiz + '#', ...partes.slice(i + 1)].join('_');
    de.set(g, { chave: [...partes.slice(0, i), raiz].join('_'), raiz, n: Number(num), campo });
  }
  // ordem dos campos: a do item de número menor primeiro (o item 1 dita o molde)
  for (const [g, { chave, raiz, n, campo }] of [...de].sort((a, b) => a[1].n - b[1].n)) {
    const s: Serie = porChave.get(chave) || { chave, raiz, campos: [], itens: new Map() };
    porChave.set(chave, s);
    if (!s.campos.includes(campo)) s.campos.push(campo);
    if (!s.itens.has(n)) s.itens.set(n, new Map());
    s.itens.get(n)!.set(campo, g);
  }
  // só é lista com três números ou mais, ou com dois que têm os mesmos campos (equipe1_nome/_funcao, equipe2_nome/_funcao);
  // titulo_linha1 + titulo_linha2 ou destaque1 + destaque2_gratuito são textos diferentes e ficam soltos
  const series = [...porChave.values()].filter((s) => s.itens.size > 2 || (s.itens.size === 2 && s.campos.length > 1 && [...s.itens.values()].every((m) => m.size === s.campos.length)));
  const naSerie = new Set(series.flatMap((s) => [...s.itens.values()].flatMap((m) => [...m.values()])));
  for (const s of series) {
    s.itens = new Map([...s.itens].sort((a, b) => a[0] - b[0]));
    for (const [n, m] of s.itens) s.itens.set(n, new Map(s.campos.filter((c) => m.has(c)).map((c) => [c, m.get(c)!])));
  }
  return { soltas: nomes.filter((g) => !naSerie.has(g)), series };
}

/** campos que os outros itens têm e este não (item → campos que faltam) */
export function faltasNaSerie(s: Serie): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const [n, m] of s.itens) {
    const f = s.campos.filter((c) => !m.has(c));
    if (f.length) out.set(n, f);
  }
  return out;
}
