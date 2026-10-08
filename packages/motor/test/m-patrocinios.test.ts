// M. Patrocinadores
import { describe, expect, it } from 'vitest';
import { COTAS_PADRAO, gerar, montarPatrocinios, type ComposicaoPatrocinio, type Patrocinador } from '../src/index';
import { linha } from './ajuda';

const P = (id: string, nome: string, extra: Partial<Patrocinador> = {}): Patrocinador => ({ id, nome, logo: id + '.png', url: 'https://' + id + '.com', ativo: true, ...extra });
const BANCO = {
  patrocinadores: [
    P('daycoval', 'Banco Daycoval'), P('honda', 'Honda'), P('rumo', 'Instituto Rumo'), P('sulamerica', 'SulAmérica'),
    P('bma', 'BMA Advogados'), P('esfera', 'Esfera'), P('hyundai', 'BMC Hyundai', { url: '' }),
    P('ingresso', 'Ticket Sports'), P('norte', 'Norte Marketing'), P('velho', 'Antigo', { ativo: false }),
    P('rj', 'Governo do Estado RJ'), P('visit', 'Visit Rio'), P('prefeitura', 'Prefeitura Rio'),
  ],
  cotas: COTAS_PADRAO,
};
const nomes = (h: string) => [...h.matchAll(/alt="([^"]+)"/g)].map((m) => m[1]);

describe('M. Patrocinadores', () => {
  it('M1: cotas uma abaixo da outra com título e tamanho da cota; logos em ordem alfabética; link em nova aba', () => {
    const comp: ComposicaoPatrocinio = {
      blocos: [
        { id: 'b1', cota: 'master', ordem: 'alfabetica', itens: [{ patrocinador: 'daycoval' }] },
        { id: 'b2', cota: 'gold', ordem: 'alfabetica', itens: [{ patrocinador: 'sulamerica' }, { patrocinador: 'honda' }, { patrocinador: 'rumo' }] },
        { id: 'b3', cota: 'silver', ordem: 'alfabetica', itens: [{ patrocinador: 'esfera' }, { patrocinador: 'hyundai' }, { patrocinador: 'bma' }] },
      ],
    };
    const h = montarPatrocinios(comp, BANCO);
    expect(h).toContain('<p class="pub-patro__titulo">Master</p><div class="pub-patro__linha pub-patro__linha--gg">');
    expect(h).toContain('<p class="pub-patro__titulo">Gold</p><div class="pub-patro__linha pub-patro__linha--g">');
    expect(h).toContain('<p class="pub-patro__titulo">Silver</p><div class="pub-patro__linha pub-patro__linha--m">');
    expect(nomes(h)).toEqual(['Banco Daycoval', 'Honda', 'Instituto Rumo', 'SulAmérica', 'BMA Advogados', 'BMC Hyundai', 'Esfera']);
    expect(h).toContain('<a class="pub-patro__logo" href="https://honda.com" target="_blank" rel="noopener sponsored"><img src="_patrocinadores/honda.png" alt="Honda" loading="lazy"></a>');
    // sem link: só o logo
    expect(h).toContain('<span class="pub-patro__logo"><img src="_patrocinadores/hyundai.png" alt="BMC Hyundai"');
    expect((h.match(/class="pub-patro__faixa"/g) || []).length).toBe(3);
  });

  it('M2: Ticketeria e Realização ficam lado a lado (mesma faixa); qualquer bloco pode ir ao lado', () => {
    const h = montarPatrocinios({
      blocos: [
        { id: 'a', cota: 'apoio', ordem: 'alfabetica', itens: [{ patrocinador: 'esfera' }] },
        { id: 't', cota: 'ticketeria', ordem: 'alfabetica', itens: [{ patrocinador: 'ingresso' }] },
        { id: 'r', cota: 'realizacao', ordem: 'alfabetica', itens: [{ patrocinador: 'norte' }] },
      ],
    }, BANCO);
    const faixas = h.split('class="pub-patro__faixa"').slice(1);
    expect(faixas).toHaveLength(2);
    expect(faixas[1]).toContain('Ticketeria');
    expect(faixas[1]).toContain('Realização');
  });

  it('M3: bloco misto e sem título (ICMS RJ): um GG em cima e dois P embaixo', () => {
    const h = montarPatrocinios({
      blocos: [{ id: 'icms', cota: 'apoio', titulo: '', ordem: 'manual', itens: [{ patrocinador: 'visit', tamanho: 'P' }, { patrocinador: 'rj', tamanho: 'GG' }, { patrocinador: 'prefeitura', tamanho: 'P' }] }],
    }, BANCO);
    expect(h).not.toContain('pub-patro__titulo">');
    expect(h).toMatch(/linha--gg">[^]*Governo do Estado RJ[^]*<\/div><div class="pub-patro__linha pub-patro__linha--p">[^]*Visit Rio[^]*Prefeitura Rio/);
  });

  it('M4: ordem manual respeita a escolhida; aleatória marca a linha e põe o script que embaralha a cada visita', () => {
    const manual = montarPatrocinios({ blocos: [{ id: 'g', cota: 'gold', ordem: 'manual', itens: [{ patrocinador: 'sulamerica' }, { patrocinador: 'honda' }] }] }, BANCO);
    expect(nomes(manual)).toEqual(['SulAmérica', 'Honda']);
    expect(manual).not.toContain('<script');
    const alea = montarPatrocinios({ blocos: [{ id: 'g', cota: 'gold', ordem: 'aleatoria', itens: [{ patrocinador: 'sulamerica' }, { patrocinador: 'honda' }] }] }, BANCO);
    expect(alea).toContain('data-pub-aleatorio');
    expect(alea).toContain('Math.random()');
  });

  it('M5: patrocinador desativado não aparece e gera aviso; bloco vazio some', () => {
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '<body><main>x</main></body>', praca: '' },
      cidades: [linha({ cidade: 'SP' })],
      patrocinios: { ...BANCO, porPagina: { tapume: { blocos: [{ id: 'm', cota: 'master', ordem: 'alfabetica', itens: [{ patrocinador: 'velho' }] }] } } },
    });
    expect(r.paginas[0].html).toBe('<body><main>x</main></body>');
    expect(r.avisos.find((a) => a.codigo === 'patrocinador-fora')?.detalhe).toContain('Antigo');
  });

  it('M6: cada cidade tem a sua; o tapume tem a dele; a etapa usa a da cidade; entra antes do rodapé', () => {
    const sp = linha({ cidade: 'SP' });
    const rj = linha({ cidade: 'RJ' });
    const pag = '<body><main>conteúdo</main><footer class="site">rodapé</footer></body>';
    const r = gerar({
      formato: 'tapume_etapa_praca',
      modelos: { tapume: pag, praca: pag.replace('conteúdo', '@cidade_1'), etapa: pag },
      cidades: [sp, rj],
      etapas: [linha({ etapa: 'Outono', _cidade: rj._id })],
      patrocinios: {
        ...BANCO,
        porPagina: {
          tapume: { blocos: [{ id: '1', cota: 'master', ordem: 'alfabetica', itens: [{ patrocinador: 'daycoval' }] }] },
          [rj._id]: { blocos: [{ id: '2', cota: 'apoio', titulo: '', ordem: 'alfabetica', itens: [{ patrocinador: 'rj', tamanho: 'GG' }] }] },
        },
      },
      rodape: { ativo: true, geral: { fonte: '', corFundo: '#000', corTexto: '#fff', corLinks: '#fff', descricao: 'padrão', links: [], redes: [] } },
    });
    const [tap, pSP, pRJ, eRJ] = r.paginas;
    expect(nomes(tap.html)).toEqual(['Banco Daycoval']);
    expect(pSP.html).not.toContain('pub-patro');
    expect(nomes(pRJ.html)).toEqual(['Governo do Estado RJ']);
    expect(nomes(eRJ.html)).toEqual(['Governo do Estado RJ']);
    // ordem: conteúdo → patrocinadores → rodapé do HTML → rodapé padrão
    expect(pRJ.html).toMatch(/RJ<\/main><section class="pub-patro"[^]*<\/section><footer class="site">rodapé<\/footer><footer class="pub-rodape"/);
  });

  it('M7: bloco com várias cotas tem nome opcional (acima da faixa); cota sem nome não tem título; bloco de uma cota ignora o nome do bloco', () => {
    const cotas = [
      { id: 'master', nome: 'Master', tamanho: 'GG' as const, tituloBloco: 'Ignorado' },
      { id: 'org', nome: '', tamanho: 'P' as const, tituloBloco: 'Organização' },
      { id: 'real', nome: 'Realização', tamanho: 'P' as const, aoLado: true },
    ];
    const h = montarPatrocinios({
      blocos: [
        { id: 'm', cota: 'master', ordem: 'alfabetica', itens: [{ patrocinador: 'honda' }] },
        { id: 'o', cota: 'org', ordem: 'alfabetica', itens: [{ patrocinador: 'ingresso' }] },
        { id: 'r', cota: 'real', ordem: 'alfabetica', itens: [{ patrocinador: 'norte' }] },
      ],
    }, { ...BANCO, cotas });
    expect(h).not.toContain('Ignorado');
    expect(h).toContain('<div class="pub-patro__grupo"><p class="pub-patro__titulo pub-patro__titulo--bloco">Organização</p><div class="pub-patro__faixa"><div class="pub-patro__bloco"><div class="pub-patro__linha pub-patro__linha--p">');
    expect(h).toContain('<p class="pub-patro__titulo">Realização</p>');
    expect((h.match(/class="pub-patro__faixa"/g) || []).length).toBe(2);
  });
});
