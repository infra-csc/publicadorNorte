// AA. Texto formatado, blocos ocultos e movidos, links em nova aba
import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { ajustarLinks, gerar, limparRico, montarRodape, RODAPE_PADRAO, varsDeLink, varsTextoSimples } from '../src/index';
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

  it('AA4b: o bloco que se move é o primeiro elemento em volta do texto que tem irmão (um <span> sozinho no <h2> move o <h2>)', () => {
    const roda = (html: string) => {
      const { document } = parseHTML(html);
      const js = /<script id="pub-mover">([\s\S]*?)<\/script>/.exec(html)![1];
      new Function('document', js)(document);
      return [...document.querySelectorAll('section')].map((e) => e.textContent).join('|');
    };
    const html = '<html><body><section><h2><span>@a</span></h2><p>@b</p><a href="#">x</a></section></body></html>';
    const h = unica(html, { a: 'A', b: 'B' }, { a: { dono: 'geral', mover: 2 } });
    const { document } = parseHTML(h);
    new Function('document', /<script id="pub-mover">([\s\S]*?)<\/script>/.exec(h)![1])(document);
    expect([...document.querySelector('section')!.children].map((e) => e.tagName + ':' + e.textContent).join('|')).toBe('P:B|A:x|H2:A');
    // sozinho na seção: a seção inteira troca de lugar com a de baixo
    const h2 = unica('<html><body><section><div><h1>@a</h1></div></section><section><p>@b</p></section></body></html>', { a: 'A', b: 'B' }, { a: { dono: 'geral', mover: 1 } });
    expect(roda(h2)).toBe('B|A');
  });

  it('AA4e: campo arrastado no Cadastro ("junto"): o bloco vai para antes/depois do bloco do outro campo, no mesmo card', () => {
    const html = '<html><body><div class="c"><h3>@n1</h3><p>@l1</p><p><b>@f1</b></p></div><div class="c"><h3>@n2</h3><p>@l2</p><p><b>@f2</b></p></div></body></html>';
    const h = unica(html, { n1: 'N1', l1: 'L1', f1: 'F1', n2: 'N2', l2: 'L2', f2: 'F2' }, {
      f1: { dono: 'geral', junto: { de: 'n1' } }, f2: { dono: 'geral', junto: { de: 'l2', depois: true } }, n2: { dono: 'geral', junto: { de: 'l2', depois: true } },
    });
    expect(h).toContain('<pub-o data-campo="n1"></pub-o>N1');
    expect(h).toContain('<pub-o data-junto="n1"></pub-o>F1');
    const { document } = parseHTML(h);
    new Function('document', /<script id="pub-mover">([\s\S]*?)<\/script>/.exec(h)![1])(document);
    expect([...document.querySelectorAll('.c')].map((c) => c.textContent).join('|')).toBe('F1N1L1|L2F2N2');
  });

  it('AA4c: campos que só ficam em atributos ou scripts são texto simples (sem formatação, ocultar ou mover)', () => {
    const html = '<button aria-label="@menu_abrir"></button><p>@titulo</p><img alt="@titulo"><script>var x="@msg"</script><!-- @se status = aberta --><title>@nome</title>';
    expect([...varsTextoSimples({ unica: html })].sort()).toEqual(['menu_abrir', 'msg', 'nome']);
  });

  it('AA4d: rodapé aceita o texto do editor (HTML limpo) e continua aceitando **negrito**', () => {
    const r = montarRodape({ ...RODAPE_PADRAO, descricao: 'Uma <b>carreta</b><script>x</script>', tituloLinks: '<i>Dúvidas</i>', links: [{ texto: '<u>Regulamento</u>', url: 'https://x.com' }] });
    expect(r).toContain('<p class="pub-rodape__desc">Uma <b>carreta</b>x</p>');
    expect(r).toContain('<p class="pub-rodape__titulo"><i>Dúvidas</i></p>');
    expect(r).toContain('aria-label="Dúvidas"');
    expect(r).toContain('<u>Regulamento</u></a>');
    expect(montarRodape({ ...RODAPE_PADRAO, descricao: 'Circuito **das Estações** <3' })).toContain('Circuito <strong>das Estações</strong> &lt;3');
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
