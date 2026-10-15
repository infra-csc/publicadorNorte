// AA. Texto formatado, blocos ocultos e movidos, links em nova aba
import { describe, expect, it } from 'vitest';
import { ajustarLinks, gerar, limparRico, varsDeLink } from '../src/index';
import { linha } from './ajuda';

const unica = (html: string, gerais: Record<string, string>, vars: Record<string, object> = {}) =>
  gerar({ formato: 'unica', modelos: { unica: html }, gerais, vars: vars as never }).paginas[0].html;

describe('AA. Formatação, ocultar, mover e nova aba', () => {
  it('AA1: texto formatado sai como HTML limpo na tela e como texto puro em atributos e no <title>', () => {
    const v = 'Complete<br>sua <span class="hl" style="color:#caf34a;font-size:1.2em">mandala.</span>';
    const h = unica('<title>@t</title><h1>@t</h1><img alt="@t">', { t: v });
    expect(h).toContain('<h1>Complete<br>sua <span class="hl" style="color:#caf34a;font-size:1.2em">mandala.</span></h1>');
    expect(h).toContain('<title>Complete sua mandala.</title>');
    expect(h).toContain('alt="Complete sua mandala."');
  });

  it('AA2: só tags e estilos aceitos; o resto sai e o texto fica; texto comum com "<" continua escapado', () => {
    expect(limparRico('<b>A</b><script>x</script><i onclick="y">B</i><span style="color:red;background:url(x);position:fixed">C</span>')).toBe('<b>A</b>x<i>B</i><span style="color:red">C</span>');
    expect(limparRico('<div>linha 1</div><div>linha 2</div>')).toBe('linha 1<br>linha 2');
    expect(limparRico('<font color="#ff0000">vermelho</font> <b>sem fechar')).toBe('<span style="color:#ff0000">vermelho</span> <b>sem fechar</b>');
    expect(unica('<p>@t</p>', { t: 'eu <3 corrida & você' })).toContain('<p>eu &lt;3 corrida &amp; você</p>');
  });

  it('AA3: ocultar o texto mantém o bloco (visibility); ocultar o bloco tira o bloco (CSS :has) e o resto sobe', () => {
    const html = '<html><head></head><body><h2>@a</h2><p>@b</p><p>@c</p></body></html>';
    const h = unica(html, { a: 'Título', b: 'Some', c: 'Fica' }, { a: { dono: 'geral', ocultar: 'texto' }, b: { dono: 'geral', ocultar: 'bloco' } });
    expect(h).toContain('<h2><span style="visibility:hidden">Título</span></h2>');
    expect(h).toContain('<p><pub-o data-bloco></pub-o></p>');
    expect(h).not.toContain('Some');
    expect(h).toContain('id="pub-blocos"');
    expect(h).toContain('<p>Fica</p>');
    expect(unica(html, { a: 'x', b: 'y', c: 'z' })).not.toContain('pub-blocos');
  });

  it('AA4: mover o bloco: marcador no bloco e o script que troca de lugar com os irmãos (só quando usado)', () => {
    const h = unica('<html><body><p>@a</p><p>@b</p></body></html>', { a: 'A', b: 'B' }, { b: { dono: 'geral', mover: -1 } });
    expect(h).toContain('<p><pub-o data-mover="-1"></pub-o>B</p>');
    expect(h).toContain('id="pub-mover"');
  });

  it('AA5: link externo abre em nova aba; âncora e página do site, não; o campo com "nova aba" desligado fica na mesma aba', () => {
    const html = '<a href="@link_compra">a</a><a href="@link_regulamento" target="_blank">b</a><a href="#compra">c</a><a href="@url_1">d</a><a href="https://norte.com">e</a>';
    const h = gerar({
      formato: 'tapume_praca', modelos: { tapume: '<p>x</p>', praca: html },
      gerais: { link_compra: 'https://loja.com/c', link_regulamento: 'https://site.com/r' },
      vars: { link_regulamento: { dono: 'geral', novaAba: false } } as never, cidades: [linha({ cidade: 'Rio' })],
    }).paginas.find((p) => p.tipo === 'praca')!.html;
    expect(h).toContain('<a href="https://loja.com/c" target="_blank" rel="noopener">a</a>');
    expect(h).toContain('<a href="https://site.com/r">b</a>');
    expect(h).toContain('<a href="#compra">c</a>');
    expect(h).toContain('<a href="rio.html">d</a>');
    expect(h).toContain('<a href="https://norte.com" target="_blank" rel="noopener">e</a>');
    expect(ajustarLinks('<a href="https://x.com" rel="nofollow">y</a>', () => true)).toBe('<a href="https://x.com" rel="nofollow noopener" target="_blank">y</a>');
    expect([...varsDeLink({ praca: html })].sort()).toEqual(['link_compra', 'link_regulamento', 'url']);
  });
});
