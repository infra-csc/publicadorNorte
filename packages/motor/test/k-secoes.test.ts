// K. Seções (esconder e mostrar)
import { describe, expect, it } from 'vitest';
import { gerar, removerSecoes, secoesDe } from '../src/index';
import { linha } from './ajuda';

const PRACA = [
  '<nav><ul><li><a href="#topo">Início</a></li><li><a href="#kit">Kit</a></li></ul></nav>',
  '<section class="hero" id="topo"><h1>@cidade_1</h1></section>',
  '<section id="kit" aria-label="Kit do atleta"><h2>O kit</h2><section id="kit-foto"><p>foto</p></section><a class="cta" href="#topo">subir</a></section>',
  '<!-- <section id="velha">não conta</section> -->',
  '<section id="faq"><h2>Dúvidas <small>frequentes</small></h2></section>',
  '<section><p>sem id</p></section>',
  '<a class="btn" href="#kit">Ver o kit</a>',
].join('');

describe('K. Seções', () => {
  it('K1: lista as <section> de primeiro nível com id; nome = aria-label, senão o título, senão o id', () => {
    expect(secoesDe(PRACA)).toEqual([
      { id: 'topo', nome: 'topo' },
      { id: 'kit', nome: 'Kit do atleta' },
      { id: 'faq', nome: 'Dúvidas frequentes' },
    ]);
  });

  it('K2: seção escondida some da página, com os links que apontam para ela', () => {
    const out = removerSecoes(PRACA, new Set(['kit']));
    expect(out).not.toContain('id="kit"');
    expect(out).not.toContain('href="#kit"');
    expect(out).toContain('<ul><li><a href="#topo">Início</a></li></ul>');
    expect(out).toContain('<section id="faq">');
  });

  it('K3: escondida no evento todo, mas mostrada numa cidade (e o contrário)', () => {
    const sp = linha({ cidade: 'SP' });
    const rj = linha({ cidade: 'RJ' });
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '', praca: PRACA },
      cidades: [sp, rj],
      secoes: { ocultas: ['praca#kit'], porLinha: { [sp._id]: { 'praca#kit': true, 'praca#faq': false } } },
    });
    const [, pSP, pRJ] = r.paginas;
    expect(pSP.html).toContain('id="kit"');
    expect(pSP.html).not.toContain('id="faq"');
    expect(pRJ.html).not.toContain('id="kit"');
    expect(pRJ.html).toContain('id="faq"');
  });

  it('K4: no tapume vale só a escolha geral', () => {
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '<section id="mapa">m</section><section id="lista">l</section>', praca: '' },
      cidades: [linha({ cidade: 'SP' })],
      secoes: { ocultas: ['tapume#mapa'] },
    });
    expect(r.paginas[0].html).toBe('<section id="lista">l</section>');
  });

  it('K5: na página da etapa, a exceção da etapa vence a da cidade', () => {
    const sp = linha({ cidade: 'SP' });
    const et = linha({ etapa: 'Outono', _cidade: sp._id });
    const r = gerar({
      formato: 'tapume_etapa_praca',
      modelos: { tapume: '', praca: '<p>@cidade_1</p>', etapa: '<section id="kit">k</section>' },
      cidades: [sp],
      etapas: [et],
      secoes: { porLinha: { [sp._id]: { 'etapa#kit': false }, [et._id]: { 'etapa#kit': true } } },
    });
    expect(r.paginas[2].html).toBe('<section id="kit">k</section>');
  });

  it('K6: o mesmo id em tipos de página diferentes é independente', () => {
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '<section id="kit">t</section>', praca: '<section id="kit">p</section>' },
      cidades: [linha({ cidade: 'SP' })],
      secoes: { ocultas: ['praca#kit'] },
    });
    expect(r.paginas.map((p) => p.html)).toEqual(['<section id="kit">t</section>', '']);
  });
});
