// Q. Módulo de imagem (passo Seções)
import { describe, expect, it } from 'vitest';
import { colocarModulos, gerar, limparSvg, refsDeArquivo, secoesDe, type ModuloImagem } from '../src/index';
import { linha } from './ajuda';

const HTML = '<main><section id="topo"><h1>Topo</h1></section><section id="faq"><h2>Dúvidas</h2></section></main><footer>rodapé</footer>';
const png = (x: Partial<ModuloImagem> = {}): ModuloImagem => ({ id: 'pub-img-a', nome: 'faixa.png', arquivo: '_media/modulos/faixa.png', largura: 60, ...x });
const SVG = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><script>alert(1)</script><rect width="10" height="10" fill="#ff0000" onclick="x()"/><path d="M0 0" stroke="blue" fill="none"/><a href="javascript:alert(1)"><circle r="2" style="fill:#00f"/></a></svg>';

describe('Q. Módulo de imagem', () => {
  it('Q1: entra como <section> de primeiro nível depois da última seção, com nome para a lista', () => {
    const h = colocarModulos(HTML, [png({ nome: 'faixa.png' })]);
    expect(h.indexOf('id="pub-img-a"')).toBeGreaterThan(h.indexOf('id="faq"'));
    expect(h.indexOf('id="pub-img-a"')).toBeLessThan(h.indexOf('</main>'));
    expect(secoesDe(h).map((s) => s.id)).toEqual(['topo', 'faq', 'pub-img-a']);
    expect(secoesDe(h)[2].nome).toBe('Imagem: faixa.png');
    // sem seções no HTML: antes do </body> (ou no fim)
    expect(colocarModulos('<body><p>x</p></body>', [png()])).toMatch(/pub-img-a[\s\S]*<\/body>$/);
    expect(colocarModulos(HTML, [])).toBe(HTML);
  });

  it('Q2: arrastar (ordem), esconder no evento e por cidade valem para o módulo como para as seções', () => {
    const sp = linha({ cidade: 'SP' });
    const rj = linha({ cidade: 'RJ' });
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '', praca: HTML },
      cidades: [sp, rj],
      secoes: { modulos: { praca: [png()] }, ordem: { praca: ['topo', 'pub-img-a', 'faq'] }, porLinha: { [rj._id]: { 'praca#pub-img-a': false } } },
    });
    const [, pSP, pRJ] = r.paginas;
    expect(pSP.html.indexOf('pub-img-a')).toBeLessThan(pSP.html.indexOf('id="faq"'));
    expect(pSP.html.indexOf('pub-img-a')).toBeGreaterThan(pSP.html.indexOf('id="topo"'));
    expect(pRJ.html).not.toContain('pub-img-a');
    // o módulo é só da página em que foi criado
    expect(r.paginas[0].html).not.toContain('pub-img');
  });

  it('Q3: PNG/JPG: <img> com o caminho da mídia (vai para o site), largura, fundo e espaço responsivos', () => {
    const h = colocarModulos(HTML, [png({ largura: 40, fundo: '#112233', espaco: 'g', alt: 'Faixa "x"' })]);
    expect(refsDeArquivo(h)).toContain('_media/modulos/faixa.png');
    expect(h).toContain('--pub-larg:40%');
    expect(h).toContain('--pub-fundo:#112233');
    expect(h).toContain('alt="Faixa &quot;x&quot;"');
    expect(h).toMatch(/@media \(max-width:\s*640px\)/);
    // valores fora do esperado não entram
    const ruim = colocarModulos(HTML, [png({ largura: 500, fundo: 'red;}</style><script>', espaco: 'x' as never })]);
    expect(ruim).toContain('--pub-larg:100%');
    expect(ruim).not.toContain('<script>');
    expect(ruim).not.toContain('--pub-fundo:red');
  });

  it('Q4: SVG vai embutido e limpo (sem script, on*, javascript:); a cor única pinta tudo, sem cor fica o original', () => {
    const limpo = limparSvg(SVG);
    expect(limpo.startsWith('<svg')).toBe(true);
    expect(limpo).not.toMatch(/script|onclick|javascript:/i);
    expect(limpo).toContain('viewBox="0 0 200 100"');
    const original = colocarModulos(HTML, [{ id: 'pub-img-s', nome: 'logo.svg', svg: limpo, largura: 30 }]);
    expect(original).toContain('fill="#ff0000"');
    const pintado = colocarModulos(HTML, [{ id: 'pub-img-s', nome: 'logo.svg', svg: limpo, largura: 30, cor: '#00aa00' }]);
    expect(pintado).toContain('color:#00aa00');
    expect(pintado).not.toContain('#ff0000');
    expect(pintado).toContain('stroke="currentColor"');
    expect(pintado).toContain('fill="none"');
    expect(pintado).toMatch(/fill:\s*currentColor/);
  });

  it('Q5: o módulo entra depois das variáveis (@ dentro do SVG não vira variável)', () => {
    const svg = limparSvg('<svg viewBox="0 0 1 1"><text>@cidade_1 contato@x.com</text></svg>');
    const r = gerar({ formato: 'unica', modelos: { unica: HTML }, cidades: [], secoes: { modulos: { unica: [{ id: 'pub-img-t', svg, largura: 50 }] } } });
    expect(r.paginas[0].html).toContain('@cidade_1 contato@x.com');
  });
});
