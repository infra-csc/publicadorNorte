// Preços e links dos combos vindos do Odoo 19 (API JSON-2), a partir do JS que a Running Land passou.
// O ID do combo é o número no fim do link de inscrição da cidade (/shop/…-415). Só fetch: roda no Worker.
// Variáveis de ambiente (nunca no repositório): ODOO_URL, ODOO_API_KEY, ODOO_PRIME_PRICELIST_ID (padrão 4) e,
// só se o servidor tiver mais de um banco, ODOO_DB (nome errado faz o Odoo responder 404).
import { fmtBR, type Linha } from '@norte/motor';
import { idDoCombo } from '@/lib/comum/odoo';
import type { Evento, ResultadoOdoo } from '@/lib/comum/tipos';
import type { Armazenamento } from './armazenamento';

export interface ConfigOdoo { url: string; db?: string; chave: string; listaPrime: number }

export function configOdoo(env: Record<string, string | undefined> = process.env): ConfigOdoo | null {
  const url = (env.ODOO_URL || '').replace(/\/+$/, '');
  if (!url || !env.ODOO_API_KEY) return null;
  return { url, ...(env.ODOO_DB ? { db: env.ODOO_DB } : {}), chave: env.ODOO_API_KEY, listaPrime: Number(env.ODOO_PRIME_PRICELIST_ID || 4) };
}

export class ErroOdoo extends Error {}

export interface ComboOdoo {
  id: number;
  nome: string;
  codigo: string;
  preco: number;
  /** preço "separado" (Compare to Price do Odoo); null quando não tem ou não é maior que o preço */
  precoComum: number | null;
  parcelas: number;
  valorParcela: number;
  /** desconto de assinante O2 Prime (lista de preço do Prime, pela categoria do combo) */
  prime: { descontoPct: number; preco: number; valorParcela: number } | null;
  url: string;
  etapas: { nome: string; data: string | null; distancias: { nome: string; esgotado: boolean }[] }[];
  /** à venda: ativo, vendável, publicado em Combos de Evento (se o Odoo tiver esse campo), com preço e com ingresso sobrando; senão, o motivo */
  aVenda: boolean;
  foraDeVenda?: string;
  aviso?: string;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Chamar = <T = unknown>(modelo: string, metodo: string, corpo: object) => Promise<T>;

export function clienteOdoo(cfg: ConfigOdoo, f: typeof fetch = fetch): Chamar {
  return async <T,>(modelo: string, metodo: string, corpo: object) => {
    const r = await f(`${cfg.url}/json/2/${modelo}/${metodo}`, {
      method: 'POST',
      headers: { Authorization: `bearer ${cfg.chave}`, ...(cfg.db ? { 'X-Odoo-Database': cfg.db } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    if (r.status === 401 || r.status === 403) throw new ErroOdoo('O Odoo não aceitou a chave (ODOO_API_KEY).');
    if (r.status === 404 && cfg.db) throw new ErroOdoo(`O Odoo não achou o banco "${cfg.db}" (ODOO_DB). Confira o nome ou tire essa variável.`);
    if (!r.ok) {
      const motivo = await r.json().then((j: { message?: string }) => j.message || '', () => '');
      throw new ErroOdoo(`O Odoo respondeu ${r.status} em ${modelo}/${metodo}${motivo ? ': ' + String(motivo).slice(0, 200) : ''}.`);
    }
    return (await r.json()) as T;
  };
}

const arred = (v: number) => Math.round(v * 100) / 100;
const parcela = (v: number, n: number) => Math.floor(Math.round(v * 100) / n) / 100;

type Template = { id: number; name: string; default_code: string | false; list_price: number; x_max_parcelas?: number | false; categ_id: [number, string] | false; website_url: string; sale_ok?: boolean; is_published?: boolean; active?: boolean; compare_list_price?: number | false };
type Ingresso = { name: string; event_id: [number, string]; product_id?: [number, string] | false; seats_max: number; seats_available: number };
type EventoOdoo = { id: number; name: string; date_begin: string | false };

/**
 * Campo "Publicado em Combos de Evento" do produto (a loja /shop/combos/… usa ele, não o "Publicado" do site).
 * O nome técnico é procurado pelo rótulo, uma vez por cliente; sem o campo, a publicação não conta.
 */
const camposPublicado = new WeakMap<Chamar, Promise<string | null>>();
function campoPublicado(chamar: Chamar): Promise<string | null> {
  let p = camposPublicado.get(chamar);
  if (!p) {
    p = chamar<Record<string, { string?: string; type?: string }>>('product.template', 'fields_get', { attributes: ['string', 'type'] })
      .then((f) => {
        if (!f || typeof f !== 'object' || Array.isArray(f)) return null;
        return Object.keys(f).find((k) => f[k]?.type === 'boolean' && /publicado em combos?/i.test(semAcento(f[k]?.string || ''))) || null;
      }, () => null);
    camposPublicado.set(chamar, p);
  }
  return p;
}

export async function consultarCombo(cfg: ConfigOdoo, chamar: Chamar, id: number): Promise<ComboOdoo> {
  // 1) produto do combo
  const publicado = await campoPublicado(chamar);
  const [combo] = await chamar<(Template & Record<string, unknown>)[]>('product.template', 'search_read', {
    domain: [['id', '=', id], ['active', 'in', [true, false]]],
    fields: ['name', 'default_code', 'list_price', 'compare_list_price', 'x_max_parcelas', 'categ_id', 'website_url', 'sale_ok', 'active', ...(publicado ? [publicado] : [])],
  });
  if (!combo) throw new ErroOdoo(`O combo ${id} não existe no Odoo.`);

  // 2) ingressos do combo pelo código: combo CDE27COMBO4CT → ingressos CDE27CT<n>KBCOMBO-<distância>
  let aviso: string | undefined;
  let ingressos: Ingresso[] = [];
  let eventos: EventoOdoo[] = [];
  const m = /^(.+?)COMBO\d+([A-Z]+)$/.exec(combo.default_code || '');
  if (!m) aviso = `sem código no padrão CDE27COMBO4XX (${combo.default_code || 'vazio'}): distâncias não vieram`;
  else {
    ingressos = await chamar<Ingresso[]>('event.event.ticket', 'search_read', {
      domain: [['product_id.default_code', '=like', `${m[1] + m[2]}%`], ['product_id.default_code', 'ilike', 'KBCOMBO']],
      fields: ['name', 'price', 'event_id', 'product_id', 'seats_max', 'seats_available'],
    });
    const ids = [...new Set(ingressos.map((t) => t.event_id[0]))];
    if (ids.length) {
      eventos = await chamar<EventoOdoo[]>('event.event', 'search_read', {
        domain: [['id', 'in', ids]], fields: ['name', 'date_begin', 'website_url'], order: 'date_begin asc',
      });
    }
  }

  // 3) desconto do O2 Prime pela categoria do combo (só a categoria exata)
  let pct = 0;
  if (combo.categ_id) {
    const regras = await chamar<{ percent_price: number }[]>('product.pricelist.item', 'search_read', {
      domain: [['pricelist_id', '=', cfg.listaPrime], ['applied_on', '=', '2_product_category'], ['categ_id', '=', combo.categ_id[0]], ['compute_price', '=', 'percentage']],
      fields: ['percent_price'], limit: 1,
    });
    pct = regras[0]?.percent_price || 0;
  }

  // etapas de outra cidade ligadas a este combo (código trocado no Odoo): fica só a cidade do combo
  const cidade = semAcento(combo.name.split(' - ').pop() || '').trim();
  const daCidade = eventos.filter((ev) => semAcento(ev.name).includes(cidade));
  if (cidade && daCidade.length && daCidade.length < eventos.length) {
    const fora = eventos.filter((ev) => !daCidade.includes(ev));
    aviso = [aviso, `etapas de outra cidade ignoradas (${fora.map((ev) => ev.name).join(', ')})`].filter(Boolean).join('; ');
    eventos = daCidade;
  }
  const preco = arred(combo.list_price);
  // ingressos do combo nesta cidade: todos sem vaga = esgotado
  const daqui = ingressos.filter((t) => eventos.some((ev) => ev.id === t.event_id[0]));
  const foraDeVenda = combo.active === false ? 'arquivado no Odoo'
    : combo.sale_ok === false ? 'não está à venda no Odoo'
    : publicado && combo[publicado] === false ? 'não está publicado em Combos de Evento'
    : !(preco > 0) ? 'sem preço no Odoo'
    : daqui.length && daqui.every((t) => t.seats_max > 0 && t.seats_available <= 0) ? 'ingressos esgotados'
    : undefined;
  const parcelas = combo.x_max_parcelas || 1;
  const precoPrime = arred(preco * (1 - pct / 100));
  return {
    id: combo.id,
    nome: combo.name,
    codigo: combo.default_code || '',
    preco,
    precoComum: combo.compare_list_price && combo.compare_list_price > preco ? arred(combo.compare_list_price) : null,
    parcelas,
    valorParcela: parcela(preco, parcelas),
    prime: pct > 0 ? { descontoPct: pct, preco: precoPrime, valorParcela: parcela(precoPrime, parcelas) } : null,
    url: cfg.url + combo.website_url,
    etapas: eventos.map((ev) => ({
      nome: ev.name,
      data: ev.date_begin ? new Date(ev.date_begin.replace(' ', 'T') + 'Z').toISOString() : null,
      // a distância certa está no código do produto do ingresso ([CDE27RJ1KBCOMBO-13KM]); o nome às vezes vem trocado
      distancias: ingressos.filter((t) => t.event_id[0] === ev.id).map((t) => {
        const doCodigo = t.product_id ? /-(\d+(?:[.,]\d+)?)\s*KM\]/i.exec(t.product_id[1])?.[1] : undefined;
        return { nome: doCodigo ? doCodigo + 'KM' : t.name, esgotado: t.seats_max > 0 && t.seats_available <= 0 };
      }),
    })),
    aVenda: !foraDeVenda,
    ...(foraDeVenda ? { foraDeVenda } : {}),
    ...(aviso ? { aviso } : {}),
  };
}

/** "Combo - 10 km" → "10"; sem número, o nome como veio */
function distancia(nome: string): string | null {
  const m = nome.match(/(\d+(?:[.,]\d+)?)\s*km?\b/i);
  return m ? m[1].replace('.', ',') : null;
}


const ESTACOES = ['outono', 'inverno', 'primavera', 'verao'];

/** colunas da cidade que o Odoo preenche (as distâncias seguem a ordem das etapas por data) */
export function valoresDoCombo(c: ComboOdoo): Record<string, string> {
  const v: Record<string, string> = {
    preco_vista: fmtBR(c.preco),
    // desconto do combo sobre o preço "separado" (Compare to Price); sem ele, ficam vazios e o selo e o "separado" somem
    preco_comum: c.precoComum ? fmtBR(c.precoComum) : '',
    porcentagem_desconto: c.precoComum ? fmtBR(Math.round((1 - c.preco / c.precoComum) * 100)) : '',
    desconto_em_reais: c.precoComum ? fmtBR(c.precoComum - c.preco) : '',
    parcelamento: String(c.parcelas),
    valor_parcelado: fmtBR(c.valorParcela),
    preco_prime: c.prime ? fmtBR(c.prime.preco) : '',
    preco_prime_parcelado: c.prime ? fmtBR(c.prime.valorParcela) : '',
    porcentagem_desconto_prime: c.prime ? fmtBR(c.prime.descontoPct) : '',
    link_inscricao: c.url,
    link_inscricao_prime: c.url,
  };
  c.etapas.forEach((e, i) => {
    // etapa com estação no nome (Outono, Inverno…): é a etapa 1 a 4 nessa ordem; sem estação, vale a ordem das datas
    const estacao = ESTACOES.find((x) => semAcento(e.nome).includes(x));
    const n = estacao ? ESTACOES.indexOf(estacao) + 1 : i + 1;
    const ds = [...new Set(e.distancias.map((d) => distancia(d.nome)).filter((d): d is string => !!d))];
    ds.sort((a, b) => parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')));
    if (ds.length && !v[`etapa${n}_distancias`]) v[`etapa${n}_distancias`] = ds.join(', ');
  });
  return v;
}

/**
 * Status da cidade pelo Odoo: à venda = "aberta"; fora de venda depois de já ter vendido = "esgotado"; nunca vendeu = em breve.
 * `_odooVendeu` guarda que já houve venda; `_odooStatus`, o último status que o Odoo pôs. O status só muda quando a
 * situação no Odoo muda: quem trocar à mão (ex.: de volta para em breve) fica assim até a próxima mudança lá.
 */
export function statusPeloOdoo(l: Linha, c: ComboOdoo): Record<string, string> {
  const vendeu = c.aVenda || l._odooVendeu === 'sim';
  const novo = c.aVenda ? 'aberta' : vendeu ? 'esgotado' : '';
  const out: Record<string, string> = {};
  if (c.aVenda && l._odooVendeu !== 'sim') out._odooVendeu = 'sim';
  if ((l._odooStatus ?? null) !== novo) { out.status = novo; out._odooStatus = novo; }
  return out;
}

const NOME_STATUS: Record<string, string> = { aberta: 'aberta', esgotado: 'esgotado', '': 'em breve' };

/**
 * Combo de uma cidade entre os do mesmo código: o nome do produto ("… - Porto Alegre") ou o fim do link (…-porto-alegre-421).
 * Só quando um único combo bate (São José não pega São José dos Campos).
 */
export function comboDaCidade<T extends { name: string; website_url?: string }>(cidade: string, combos: T[]): T | null {
  const slug = (s: string) => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const c = slug(cidade);
  if (!c) return null;
  const fim = (s: string) => s === c || s.endsWith('-' + c);
  const bate = combos.filter((x) => fim(slug(x.name)) || fim(slug(x.website_url || '').replace(/-\d+$/, '')));
  return bate.length === 1 ? bate[0] : null;
}

/**
 * Consulta o combo de cada cidade (pelo link de inscrição) e grava o que mudou no cadastro.
 * Grava também quando o resultado muda (ou se `sempre`), para a tela mostrar o último resultado; `ligar` liga o Odoo no evento.
 */
export async function sincronizarOdoo(armazenamento: Armazenamento, slug: string, cfg: ConfigOdoo, agora: Date, opcoes: { sempre?: boolean; ligar?: boolean; fetch?: typeof fetch } = {}): Promise<{ resultado: ResultadoOdoo; evento: Evento; versao: string | null }> {
  const lido = await armazenamento.ler(slug);
  if (!lido) throw new ErroOdoo('Evento não encontrado.');
  const chamar = clienteOdoo(cfg, opcoes.fetch);
  const cache = new Map<number, Promise<ComboOdoo>>();
  const novos = new Map<string, Record<string, string>>();
  const cidades: ResultadoOdoo['cidades'] = [];
  const nomeDe = (l: Linha) => String(l.cidade || '').trim() || 'Cidade sem nome';
  const codigos = new Set<string>();
  const consultar = async (l: Linha, id: number, comoAchou = '') => {
    if (!cache.has(id)) cache.set(id, consultarCombo(cfg, chamar, id));
    try {
      const c = await cache.get(id)!;
      if (c.codigo) codigos.add(c.codigo);
      // fora de venda depois de já ter vendido: os preços ficam como estavam (a página mostra esgotado); só o status muda.
      // Cidade que nunca vendeu (ex.: venda ainda não liberada): preços, distâncias e link já entram, e o status fica em breve
      const st = statusPeloOdoo(l, c);
      const preenche = c.aVenda || (c.preco > 0 && l._odooVendeu !== 'sim');
      novos.set(l._id, { ...(preenche ? valoresDoCombo(c) : comoAchou ? { link_inscricao: c.url, link_inscricao_prime: c.url } : {}), ...st });
      const status = NOME_STATUS[st.status ?? String(l._odooStatus ?? '')] ?? String(l.status || 'em breve');
      cidades.push({ id: l._id, nome: nomeDe(l), combo: id, ok: true, mensagem: comoAchou + (c.aVenda ? `R$ ${fmtBR(c.preco)}${c.prime ? ` · Prime R$ ${fmtBR(c.prime.preco)}` : ''}` : `fora de venda (${c.foraDeVenda})`) + ` · ${status}${c.aviso ? ` · ${c.aviso}` : ''}` });
    } catch (x) {
      cidades.push({ id: l._id, nome: nomeDe(l), combo: id, ok: false, mensagem: comoAchou + (x instanceof ErroOdoo ? x.message : 'sem resposta do Odoo (' + String((x as Error)?.message || x).slice(0, 120) + ')') });
    }
  };
  const semLink: Linha[] = [];
  for (const l of lido.evento.cidades) {
    const id = idDoCombo(l.link_inscricao);
    if (id == null) semLink.push(l);
    else await consultar(l, id);
  }
  // cidade sem link: procura no Odoo o combo do mesmo código das outras (CDE27COMBO4CT → CDE27COMBO4…) com o nome da cidade
  const prefixos = [...new Set([...codigos].map((k) => /^(.+?COMBO\d+)[A-Z]+$/i.exec(k)?.[1]).filter((p): p is string => !!p))];
  let candidatos: { id: number; name: string; default_code: string | false; website_url?: string }[] = [];
  if (semLink.length && prefixos.length) {
    try {
      for (const p of prefixos) {
        candidatos.push(...await chamar<typeof candidatos>('product.template', 'search_read', {
          domain: [['default_code', '=ilike', p + '%'], ['active', 'in', [true, false]]], fields: ['name', 'default_code', 'website_url'],
        }));
      }
    } catch { candidatos = []; }
  }
  const usados = new Set(cidades.map((c) => c.combo));
  for (const l of semLink) {
    const achado = comboDaCidade(nomeDe(l), candidatos.filter((c) => !usados.has(c.id)));
    if (achado) { usados.add(achado.id); await consultar(l, achado.id, `achado pelo código ${achado.default_code}: `); }
    else cidades.push({ id: l._id, nome: nomeDe(l), combo: null, ok: true, mensagem: prefixos.length ? `sem link do combo e nenhum combo ${prefixos.join('/')}… com esse nome no Odoo: fica como está` : 'sem link do combo: fica como está' });
  }
  // na ordem do cadastro
  const ordem = new Map(lido.evento.cidades.map((l, i) => [l._id, i]));
  cidades.sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0));
  // mudou: valores que aparecem no site; os marcadores (_odoo…) também são gravados, mas não pedem publicação
  let mudou = 0, marcadores = 0;
  for (const l of lido.evento.cidades) for (const [k, v] of Object.entries(novos.get(l._id) || {})) if (String(l[k] ?? '') !== v || !(k in l)) { if (k.startsWith('_')) marcadores++; else mudou++; }
  const erros = cidades.filter((c) => !c.ok);
  const comCombo = cidades.filter((c) => c.combo != null).length;
  const resultado: ResultadoOdoo = {
    em: agora.toISOString(),
    ok: !erros.length,
    mudou,
    mensagem: !comCombo ? 'Nenhuma cidade com link de combo do Odoo.'
      : erros.length ? `${erros.length} de ${comCombo} cidade(s) sem resposta do Odoo: ${erros.map((c) => c.nome).join(', ')}.`
      : mudou ? `${mudou} valor(es) atualizados em ${comCombo} cidade(s).` : `Tudo igual ao Odoo (${comCombo} cidade(s)).`,
    cidades,
  };
  const antes = lido.evento.odoo?.ultima;
  // sem mudança e com os mesmos erros de antes, não grava (a automação confere no intervalo do evento)
  const falhas = (r: ResultadoOdoo) => r.cidades.filter((c) => !c.ok).map((c) => c.id + c.mensagem).join('|');
  const mesmoResultado = antes && antes.ok === resultado.ok && falhas(antes) === falhas(resultado);
  if (!mudou && !marcadores && mesmoResultado && !opcoes.sempre) return { resultado, evento: lido.evento, versao: null };
  const r = await armazenamento.atualizar(slug, (e) => {
    for (const l of e.cidades) Object.assign(l, novos.get(l._id) || {});
    e.odoo = { ...e.odoo, ativo: opcoes.ligar || !!e.odoo?.ativo, ultima: resultado, ...(mudou || e.odoo?.pendente ? { pendente: true } : {}) };
  }, mudou ? `Odoo: ${mudou} valor(es) de ${slug}` : `Odoo: confere ${slug}`);
  return { resultado, ...r };
}
