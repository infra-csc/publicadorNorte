// W. Séries numeradas (blocos do Cadastro e verificador)
import { describe, expect, it } from 'vitest';
import { faltasNaSerie, gerar, separarSeries } from '../src/index';

describe('W. Séries numeradas', () => {
  it('W1: lista com 3+ itens ou 2 com os mesmos campos; nome inteiro antes do número separa as listas', () => {
    const { soltas, series } = separarSeries(['faq1_pergunta', 'faq2_pergunta', 'faq3_pergunta', 'equipe1_nome', 'equipe1_funcao', 'equipe2_nome', 'equipe2_funcao', 'material_capa_linha1', 'material_capa_linha2', 'hero_destaque1', 'hero_destaque2_gratuito', 'carreta_ponto1_titulo', 'hero_ponto1_titulo', 'carreta_ponto2_titulo', 'carreta_ponto3_titulo']);
    expect(series.map((s) => s.chave)).toEqual(['faq', 'equipe', 'carreta_ponto']);
    expect(soltas).toEqual(['material_capa_linha1', 'material_capa_linha2', 'hero_destaque1', 'hero_destaque2_gratuito', 'hero_ponto1_titulo']);
  });

  it('W2: campos na ordem do item 1; faltas de cada item', () => {
    const { series } = separarSeries(['faq2_resposta', 'faq2_pergunta', 'faq1_pergunta', 'faq1_resposta_gratuito', 'faq1_resposta', 'faq3_pergunta', 'faq3_link']);
    const s = series[0];
    expect(s.campos).toEqual(['faq#_pergunta', 'faq#_resposta_gratuito', 'faq#_resposta', 'faq#_link']);
    expect([...s.itens.get(2)!.keys()]).toEqual(['faq#_pergunta', 'faq#_resposta']);
    expect([...faltasNaSerie(s)]).toEqual([[1, ['faq#_link']], [2, ['faq#_resposta_gratuito', 'faq#_link']], [3, ['faq#_resposta_gratuito', 'faq#_resposta']]]);
  });

  it('W3: variação opcional dentro de @se (padrão do guia) funciona', () => {
    const html = '<p><!-- @se gratuito = sim --><!-- @se faq1_resposta_gratuito -->@faq1_resposta_gratuito<!-- @senao -->@faq1_resposta<!-- @fim --><!-- @senao -->@faq1_resposta<!-- @fim --></p>';
    const g = (gerais: Record<string, string>) => gerar({ formato: 'unica', modelos: { unica: html }, gerais }).paginas[0].html;
    expect(g({ gratuito: 'sim', faq1_resposta: 'R', faq1_resposta_gratuito: 'G' })).toContain('<p>G</p>');
    expect(g({ gratuito: 'sim', faq1_resposta: 'R' })).toContain('<p>R</p>');
    expect(g({ gratuito: '', faq1_resposta: 'R', faq1_resposta_gratuito: 'G' })).toContain('<p>R</p>');
  });
});
