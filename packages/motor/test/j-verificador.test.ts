// J. Verificador de HTML
import { describe, expect, it } from 'vitest';
import { verificarHtml, type CodigoProblema } from '../src/index';
import { fixture } from './ajuda';

const codigos = (html: string) => verificarHtml(html, 'praca').map((p) => p.codigo);
const so = (html: string, c: CodigoProblema) => verificarHtml(html, 'praca').filter((p) => p.codigo === c);

describe('J. Verificador de HTML', () => {
  it('J1: preço testado antes do gratuito, com a linha', () => {
    const html = '<p>início</p>\n<p><!-- @se preco_vista -->R$@preco_vista_1<!-- @senao --><!-- @se gratuito = sim -->Grátis<!-- @senao -->A confirmar<!-- @fim --><!-- @fim --></p>';
    const p = so(html, 'preco-antes-do-gratuito');
    expect(p).toHaveLength(1);
    expect(p[0].linha).toBe(2);
    expect(p[0].mensagem).toContain('@se preco_vista');
  });

  it('J2: R$@preco_vista_1 fora de bloco @se gratuito', () => {
    const p = so('<h1>Kit</h1>\n<b>R$@preco_vista_1</b>\n<i>@{parcelamento_1}x R$@valor_parcelado_1</i>', 'preco-fora-do-gratuito');
    expect(p.map((x) => x.linha)).toEqual([2, 3]);
    expect(so('<!-- @se gratuito = sim -->Grátis<!-- @senao -->R$@preco_vista_1<!-- @fim -->', 'preco-fora-do-gratuito')).toEqual([]);
    expect(so('<!-- @se gratuito != sim -->R$@preco_vista_1<!-- @fim -->', 'preco-fora-do-gratuito')).toEqual([]);
    // dentro do "sim" do gratuito também está errado
    expect(so('<!-- @se gratuito = sim -->R$@preco_vista_1<!-- @fim -->', 'preco-fora-do-gratuito')).toHaveLength(1);
  });

  it('J3: gratuito decidido no <script>', () => {
    const p = so('<p>x</p>\n<script>\nif (gratuito === \'sim\') el.textContent = \'Grátis\';\n</script>', 'decisao-em-script');
    expect(p).toHaveLength(1);
    expect(p[0].linha).toBe(3);
    expect(codigos('<script>el.textContent = "A confirmar"</script>')).toContain('decisao-em-script');
    expect(codigos('<div data-gratuito="@gratuito_1"></div>')).toContain('decisao-em-atributo');
    expect(codigos('<script type="application/ld+json">{"@type":"Event","isAccessibleForFree":"gratuito"}</script>')).toEqual([]);
  });

  it('J4: "A confirmar" fora de @senao', () => {
    const p = so('<p>Preço: A confirmar</p>', 'a-confirmar-fixo');
    expect(p).toHaveLength(1);
    expect(so('<!-- @se preco_vista -->x<!-- @senao -->A confirmar<!-- @fim -->', 'a-confirmar-fixo')).toEqual([]);
    expect(so('<!-- nota: "A confirmar" só no senao -->', 'a-confirmar-fixo')).toEqual([]);
    expect(so('<p>Medidas em centímetros, a confirmar.</p>', 'a-confirmar-fixo')).toEqual([]);
  });

  it('J5: status testado contra "aberto"', () => {
    const p = so('<!-- @se status = aberto -->x<!-- @fim -->', 'status-invalido');
    expect(p).toHaveLength(1);
    expect(p[0].mensagem).toContain('"aberta"');
    expect(so('<!-- @se status = aberta -->x<!-- @fim --><!-- @se status = em breve -->y<!-- @fim -->', 'status-invalido')).toEqual([]);
  });

  it('J6: nomes fora da base', () => {
    const p = so('<p>@valor_1 @preco_1 @municipio_1 @gratis_1 @data_1</p>', 'nome-fora-da-base');
    expect(p.map((x) => x.mensagem.split(':')[0])).toEqual(['@valor_1', '@preco_1', '@municipio_1', '@gratis_1', '@data_1']);
    expect(p[2].mensagem).toContain('@cidade_1');
    expect(so('<!-- @se gratis = sim -->x<!-- @fim -->', 'nome-fora-da-base')).toHaveLength(1);
  });

  it('J7: @media_ dentro de <picture>', () => {
    expect(codigos('<picture><img src="@media_hero_desktop_1"></picture>')).toEqual(['midia-em-picture']);
    expect(codigos('<picture><img src="_media/praca/hero/a.webp"></picture>')).toEqual([]);
  });

  it('J8: mídia em base64 e fora de _media', () => {
    expect(codigos('<img src="data:image/png;base64,iVBORw0KGgo=">')).toEqual(['base64']);
    expect(codigos('<img src="assets/foto.webp">')).toEqual(['midia-fora-da-pasta']);
    expect(codigos('<img src="_media/praca/kit/foto.webp"><img src="_images/praca/kit/a.png">')).toEqual([]);
  });

  it('J13: scrollIntoView no script', () => {
    expect(codigos('<p>x</p><script>tab.scrollIntoView({ block: "nearest" });</script>')).toEqual(['rolagem-em-script']);
    expect(codigos('<p>x</p><script>barra.scrollTo({ left: 10 });</script>')).toEqual([]);
  });

  it('J9: HTML do guia copiado à risca não tem problema', () => {
    expect(verificarHtml(fixture('guia-secao-12.html'), 'praca')).toEqual([]);
  });

  it('blocos sem @fim, @total_ próprio e sintaxe do @se', () => {
    const p = verificarHtml('<p>\n<!-- @se gratuito_1 == "sim" -->x\n@total_categorias_1</p>', 'praca');
    expect(p.map((x) => [x.codigo, x.linha])).toEqual([
      ['bloco-mal-fechado', 2],
      ['sintaxe-se', 2],
      ['total-proprio', 3],
    ]);
  });
});
