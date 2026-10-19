// Odoo: ID pelo link, consulta (Odoo simulado), valores do cadastro, gravação e republicação pela automação
import { describe, expect, it } from 'vitest';
import { idDoCombo } from '@/lib/comum/odoo';
import type { Evento, EventoCompleto, ResumoEvento } from '@/lib/comum/tipos';
import { BANCO_VAZIO, type Armazenamento } from './armazenamento';
import { horaDoOdoo, rodarAutomacao } from './automacao';
import type { DestinoPublicacao } from './destino';
import { clienteOdoo, consultarCombo, sincronizarOdoo, statusPeloOdoo, valoresDoCombo, type ComboOdoo, type ConfigOdoo } from './odoo';

const CFG: ConfigOdoo = { url: 'https://loja.test', db: 'db', chave: 'k', listaPrime: 4 };
const AGORA = new Date('2026-10-14T12:00:00Z');
/** 12h em Brasília: hora de conferir no intervalo padrão (6 h) */
const HORA = new Date('2026-10-14T15:00:00Z');

/** Odoo de mentira: responde search_read pelos dados abaixo */
function odooFalso(preco = 549, opcoes: { semCodigo?: boolean; foraDeVenda?: boolean; comPA?: boolean } = {}) {
  const chamadas: string[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const [modelo] = url.replace(CFG.url + '/json/2/', '').split('/');
    chamadas.push(modelo);
    expect((init.headers as Record<string, string>).Authorization).toBe('bearer k');
    const corpo = JSON.parse(String(init.body));
    const r: Record<string, unknown> = {
      'product.template': corpo.domain[0][1] === '=ilike'
        ? (opcoes.comPA ? [{ id: 415, name: 'Combo Circuito das Estações 2027 - Curitiba', default_code: 'CDE27COMBO4CT' }, { id: 421, name: 'Combo Circuito das Estações 2027 - Porto Alegre', default_code: 'CDE27COMBO4PA', website_url: '/shop/combos/cde27combo4pa-combo-circuito-das-estacoes-2027-porto-alegre-421' }] : [])
        : corpo.domain[0][2] === 421 && opcoes.comPA
        ? [{ id: 421, name: 'Combo Circuito das Estações 2027 - Porto Alegre', default_code: 'CDE27COMBO4PA', list_price: 599.9, x_max_parcelas: 12, sale_ok: true, is_published: !opcoes.foraDeVenda, active: true, categ_id: false, website_url: '/shop/combos/cde27combo4pa-combo-circuito-das-estacoes-2027-porto-alegre-421' }]
        : corpo.domain[0][2] === 415
        ? [{ id: 415, name: 'Combo CT', default_code: opcoes.semCodigo ? false : 'CDE27COMBO4CT', list_price: preco, compare_list_price: 1149.96, x_max_parcelas: 12, sale_ok: !opcoes.foraDeVenda, is_published: true, active: true, categ_id: [9, 'Combos'], website_url: '/shop/cde27combo4ct-combo-curitiba-415' }]
        : [],
      'event.event.ticket': [
        { name: 'Combo 10 km', event_id: [2, 'Inverno'], seats_max: 0, seats_available: 0 },
        { name: 'Combo 5 km', event_id: [1, 'Outono'], seats_max: 10, seats_available: 0 },
        { name: 'Combo 10 km', event_id: [1, 'Outono'], seats_max: 0, seats_available: 0 },
      ],
      'event.event': [{ id: 1, name: 'Outono', date_begin: '2027-05-02 09:00:00' }, { id: 2, name: 'Inverno', date_begin: '2027-08-01 09:00:00' }],
      'product.pricelist.item': [{ percent_price: 10 }],
    };
    return new Response(JSON.stringify(r[modelo] ?? []), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, chamadas };
}

function memoria(e: Evento) {
  let atual: Evento = structuredClone(e);
  const publicados: number[] = [];
  const gravar = (fn: (e: Evento) => void) => { const n = structuredClone(atual); fn(n); atual = n; return { evento: n, versao: 'v' }; };
  const arm = {
    listar: async (): Promise<ResumoEvento[]> => [{ slug: atual.slug, nome: atual.nome, formato: atual.formato, cidades: 0, atualizadoEm: '', url: null, pendente: false, odoo: !!atual.odoo?.ativo, odooHoras: atual.odoo?.intervalo, odooPendente: !!atual.odoo?.pendente }],
    ler: async (): Promise<EventoCompleto> => ({ evento: structuredClone(atual), modelos: { tapume: '<p>x</p>', praca: '<p>@cidade_1 R$@preco_vista_1</p>' }, arquivos: [], versao: 'v' } as unknown as EventoCompleto),
    lerBanco: async () => ({ banco: BANCO_VAZIO(), versao: '' }),
    atualizar: async (_s: string, fn: (e: Evento) => void) => gravar(fn),
    atualizarProducao: async (_s: string, fn: (e: Evento) => void) => gravar(fn),
  } as unknown as Armazenamento;
  const dest = { publicar: async (_s: string, v: number) => { publicados.push(v); return { commit: 'c' + v }; }, url: async () => 'https://teste/combo/' } as unknown as DestinoPublicacao;
  return { arm, dest, publicados, atual: () => atual };
}

const evento = (extra: Partial<Evento> = {}): Evento => ({
  id: 'x', slug: 'combo', nome: 'Combo', formato: 'tapume_praca', paginas: {}, vars: {}, gerais: {}, etapas: [], ordem: {}, imagens: {}, baseUrl: '',
  cidades: [
    { _id: 'ct', cidade: 'Curitiba', status: 'aberta', link_inscricao: 'https://loja.test/shop/cde27combo4ct-combo-circuito-das-estacoes-2027-curitiba-415' },
    { _id: 'pa', cidade: 'Porto Alegre', preco_vista: '549' },
  ],
  publicacoes: [], versaoAtiva: null, criadoEm: '', atualizadoEm: '', odoo: { ativo: true }, ...extra,
}) as Evento;

describe('Odoo', () => {
  it('ID do combo pelo número no fim do link da loja', () => {
    expect(idDoCombo('https://beta.runningland.com.br/shop/cde27combo4sp-combo-circuito-das-estacoes-2027-sao-paulo-346')).toBe(346);
    expect(idDoCombo('https://beta.runningland.com.br/shop/combo-circuito-das-estacoes-2027-belo-horizonte-410?x=1')).toBe(410);
    expect(idDoCombo('https://site.com/inscricao')).toBeNull();
    expect(idDoCombo('')).toBeNull();
    // a loja passou a usar /shop/combos/…
    expect(idDoCombo('https://beta.runningland.com.br/shop/combos/cde27combo4sp-combo-circuito-das-estacoes-2027-sao-paulo-346')).toBe(346);
  });

  it('cidade sem link: acha no Odoo o combo do mesmo código das outras com o nome da cidade e grava o link', async () => {
    const m = memoria(evento());
    const { f } = odooFalso(549, { comPA: true });
    const r = await sincronizarOdoo(m.arm, 'combo', CFG, AGORA, { fetch: f });
    expect(r.resultado.ok).toBe(true);
    expect(m.atual().cidades[1]).toMatchObject({ preco_vista: '599,90', link_inscricao: 'https://loja.test/shop/combos/cde27combo4pa-combo-circuito-das-estacoes-2027-porto-alegre-421', status: 'aberta' });
    expect(r.resultado.cidades.map((c) => c.nome)).toEqual(['Curitiba', 'Porto Alegre']);
    expect(r.resultado.cidades[1].mensagem).toContain('achado pelo código CDE27COMBO4PA');
    // ainda não publicado na loja: preços e link já entram, status em breve
    const n = memoria(evento());
    await sincronizarOdoo(n.arm, 'combo', CFG, AGORA, { fetch: odooFalso(549, { comPA: true, foraDeVenda: true }).f });
    expect(n.atual().cidades[1]).toMatchObject({ preco_vista: '599,90', valor_parcelado: '49,99', status: '' });
    expect(n.atual().cidades[1].link_inscricao).toContain('-421');
  });

  it('nome da cidade só pega um combo quando bate sozinho', async () => {
    const { comboDaCidade } = await import('./odoo');
    const lista = [{ name: 'Combo - São José dos Campos' }, { name: 'Combo - São José' }, { name: 'Combo', website_url: '/shop/combos/x-porto-alegre-421' }];
    expect(comboDaCidade('São José', lista)?.name).toBe('Combo - São José');
    expect(comboDaCidade('Porto Alegre', lista)?.website_url).toContain('421');
    expect(comboDaCidade('Curitiba', lista)).toBeNull();
  });

  it('consulta como o JS da Running Land: preço, parcelas (para baixo), Prime pela lista de preço, distâncias por etapa em ordem de data', async () => {
    const { f } = odooFalso(799);
    const c = await consultarCombo(CFG, clienteOdoo(CFG, f), 415);
    expect(c).toMatchObject({ preco: 799, parcelas: 12, valorParcela: 66.58, prime: { descontoPct: 10, preco: 719.1, valorParcela: 59.92 }, url: 'https://loja.test/shop/cde27combo4ct-combo-curitiba-415' });
    expect(valoresDoCombo(c)).toEqual({
      preco_vista: '799', preco_comum: '1.149,96', porcentagem_desconto: '31', desconto_em_reais: '350,96', parcelamento: '12', valor_parcelado: '66,58', preco_prime: '719,10', preco_prime_parcelado: '59,92', porcentagem_desconto_prime: '10',
      link_inscricao: c.url, link_inscricao_prime: c.url, etapa1_distancias: '5, 10', etapa2_distancias: '10',
    });
  });

  it('dados tortos do Odoo: etapa de outra cidade sai (com aviso), ingresso sem km não vira distância, etapa pela estação', async () => {
    const r: Record<string, unknown> = {
      'product.template': [{ id: 417, name: 'Combo - Circuito das Estações 2027 - Recife', default_code: 'CDE27COMBO4RC', list_price: 599.9, x_max_parcelas: 10, categ_id: false, website_url: '/shop/x-417' }],
      'event.event.ticket': [
        { name: '5KM', event_id: [1, ''], seats_max: 0, seats_available: 0 },
        { name: 'Inscrição para Circuito das Estações 2027 - Inverno - Recife', event_id: [2, ''], product_id: [9, '[CDE27RC2KBCOMBO-13KM] Kit Estações (13KM)'], seats_max: 0, seats_available: 0 },
        { name: '10KM', event_id: [2, ''], seats_max: 0, seats_available: 0 },
        { name: '15KM', event_id: [3, ''], seats_max: 0, seats_available: 0 },
      ],
      'event.event': [
        { id: 2, name: 'Circuito das Estações Inverno 2027 Recife', date_begin: '2027-07-04 09:00:00' },
        { id: 3, name: 'Circuito das Estações Inverno 2027 Salvador', date_begin: '2027-07-18 09:00:00' },
        { id: 1, name: 'Circuito das Estações Verão 2027 Recife', date_begin: '2027-11-14 09:00:00' },
      ],
    };
    const f = (async (url: string) => new Response(JSON.stringify(r[url.split('/json/2/')[1].split('/')[0]] ?? []))) as unknown as typeof fetch;
    const c = await consultarCombo(CFG, clienteOdoo(CFG, f), 417);
    expect(c.aviso).toContain('Salvador');
    expect(c.prime).toBeNull();
    const v = valoresDoCombo(c);
    expect([v.etapa2_distancias, v.etapa4_distancias, v.etapa1_distancias, v.mes_verao_abrev, v.parcelamento, v.valor_parcelado]).toEqual(['10, 13', '5', undefined, undefined, '10', '59,99']);
  });

  it('combo sem código no padrão: preço e link vêm, distâncias não (com aviso)', async () => {
    const { f, chamadas } = odooFalso(549, { semCodigo: true });
    const c = await consultarCombo(CFG, clienteOdoo(CFG, f), 415);
    expect(c.etapas).toEqual([]);
    expect(c.aviso).toContain('distâncias');
    expect(chamadas).not.toContain('event.event.ticket');
  });

  it('grava só nas cidades com link; sem mudança, não grava de novo; combo que não existe vira aviso', async () => {
    const m = memoria(evento());
    const { f } = odooFalso(549);
    const r = await sincronizarOdoo(m.arm, 'combo', CFG, AGORA, { fetch: f });
    expect(r.resultado.ok).toBe(true);
    expect(m.atual().cidades[0]).toMatchObject({ preco_vista: '549', valor_parcelado: '45,75', preco_prime: '494,10' });
    expect(m.atual().cidades[1]).toEqual({ _id: 'pa', cidade: 'Porto Alegre', preco_vista: '549' });
    expect(m.atual().odoo?.ultima?.mudou).toBeGreaterThan(0);
    const de = m.atual().atualizadoEm;
    const r2 = await sincronizarOdoo(m.arm, 'combo', CFG, AGORA, { fetch: f });
    expect(r2.versao).toBeNull();
    expect(m.atual().atualizadoEm).toBe(de);
    const x = memoria(evento({ cidades: [{ _id: 'y', cidade: 'X', link_inscricao: 'https://loja.test/shop/combo-999' }] }));
    const r3 = await sincronizarOdoo(x.arm, 'combo', CFG, AGORA, { fetch: f });
    expect(r3.resultado).toMatchObject({ ok: false });
    expect(r3.resultado.cidades[0].mensagem).toContain('não existe');
  });

  it('automação: preço mudou no Odoo e o evento já foi publicado → grava e republica; desligado, nada', async () => {
    const v1 = { versao: 1, commit: 'c1', em: '', paginas: 2, avisos: 0, url: 'https://teste/combo/' };
    const m = memoria(evento({ publicacoes: [v1], versaoAtiva: 1 }));
    const r = await rodarAutomacao(m.arm, m.dest, HORA, { cfg: CFG, fetch: odooFalso(599).f });
    expect(m.atual().cidades[0].preco_vista).toBe('599');
    expect(m.publicados).toEqual([2]);
    expect(r[0].resultado).toContain('publicado v2');
    // fora da hora do intervalo: não consulta
    expect(await rodarAutomacao(m.arm, m.dest, new Date('2026-10-14T15:10:00Z'), { cfg: CFG, fetch: odooFalso(649).f })).toEqual([]);
    // "Buscar agora" gravou e não publicou: a automação publica mesmo sem mudança nova; publicado, não repete
    const b = memoria(evento({ publicacoes: [v1], versaoAtiva: 1 }));
    await sincronizarOdoo(b.arm, 'combo', CFG, AGORA, { fetch: odooFalso(599).f, sempre: true, ligar: true });
    expect(b.atual().odoo?.pendente).toBe(true);
    const rb = await rodarAutomacao(b.arm, b.dest, AGORA, { cfg: CFG, fetch: odooFalso(599).f });
    expect(b.publicados).toEqual([2]);
    expect(rb[0].resultado).toContain('publicado v2');
    expect(b.atual().odoo?.pendente).toBeUndefined();
    expect(await rodarAutomacao(b.arm, b.dest, new Date('2026-10-14T12:30:00Z'), { cfg: CFG, fetch: odooFalso(599).f })).toEqual([]);
    const d = memoria(evento({ odoo: { ativo: false } }));
    expect(await rodarAutomacao(d.arm, d.dest, HORA, { cfg: CFG, fetch: odooFalso(599).f })).toEqual([]);
  });

  it('intervalo: a passada do cron no começo do intervalo, contado da meia-noite de Brasília', () => {
    expect(horaDoOdoo(new Date('2026-10-14T05:02:00Z'), 2)).toBe(true); // 02h02 em Brasília
    expect(horaDoOdoo(new Date('2026-10-14T05:02:00Z'), 6)).toBe(false);
    expect(horaDoOdoo(new Date('2026-10-14T09:00:00Z'), 6)).toBe(true); // 06h
    expect(horaDoOdoo(new Date('2026-10-14T03:04:00Z'), 24)).toBe(true); // 00h04
    expect(horaDoOdoo(new Date('2026-10-14T15:00:00Z'), 24)).toBe(false);
    expect(horaDoOdoo(new Date('2026-10-14T15:00:00Z'))).toBe(true); // padrão 6 h
  });

  it('status pelo Odoo: à venda = aberta; nunca vendeu = em breve; saiu de venda depois de vender = esgotado; troca à mão vale até o Odoo mudar', () => {
    const c = (aVenda: boolean) => ({ aVenda }) as ComboOdoo;
    expect(statusPeloOdoo({ _id: 'a' }, c(false))).toEqual({ status: '', _odooStatus: '' });
    expect(statusPeloOdoo({ _id: 'a', status: 'aberta' }, c(true))).toEqual({ status: 'aberta', _odooStatus: 'aberta', _odooVendeu: 'sim' });
    expect(statusPeloOdoo({ _id: 'a', status: 'aberta', _odooStatus: 'aberta', _odooVendeu: 'sim' }, c(false))).toEqual({ status: 'esgotado', _odooStatus: 'esgotado' });
    // alguém pôs "em breve" à mão com o combo ainda à venda: fica, até o Odoo mudar de situação
    expect(statusPeloOdoo({ _id: 'a', status: '', _odooStatus: 'aberta', _odooVendeu: 'sim' }, c(true))).toEqual({});
    expect(statusPeloOdoo({ _id: 'a', status: '', _odooStatus: 'aberta', _odooVendeu: 'sim' }, c(false))).toEqual({ status: 'esgotado', _odooStatus: 'esgotado' });
  });

  it('combo fora de venda: preços ficam como estavam, a cidade que já vendeu vira esgotado e o site é republicado', async () => {
    const v1 = { versao: 1, commit: 'c1', em: '', paginas: 2, avisos: 0, url: 'https://teste/combo/' };
    const m = memoria(evento({ publicacoes: [v1], versaoAtiva: 1 }));
    await sincronizarOdoo(m.arm, 'combo', CFG, AGORA, { fetch: odooFalso(549).f });
    expect(m.atual().cidades[0]).toMatchObject({ status: 'aberta', preco_vista: '549', _odooVendeu: 'sim' });
    const r = await rodarAutomacao(m.arm, m.dest, HORA, { cfg: CFG, fetch: odooFalso(0, { foraDeVenda: true }).f });
    expect(m.atual().cidades[0]).toMatchObject({ status: 'esgotado', preco_vista: '549' });
    expect(m.atual().odoo?.ultima?.cidades[0].mensagem).toContain('não está à venda');
    expect(r[0].resultado).toContain('publicado');
    const nova = memoria(evento());
    await sincronizarOdoo(nova.arm, 'combo', CFG, AGORA, { fetch: odooFalso(549, { foraDeVenda: true }).f });
    // nunca vendeu (ex.: ainda não publicado na loja): os preços já entram, o status fica em breve
    expect(nova.atual().cidades[0]).toMatchObject({ status: '', preco_vista: '549' });
  });
});
