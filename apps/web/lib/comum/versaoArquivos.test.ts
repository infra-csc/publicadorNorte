// Site publicado: ?v= com o conteúdo do arquivo, para quem já abriu o site baixar o que mudou
import { describe, expect, it } from 'vitest';
import { comVersaoNosArquivos } from './montagem';
import type { ArquivoMidia } from './tipos';

const usados = new Map<string, ArquivoMidia>([
  ['_media/a.webp', { caminho: '_media/a.webp', sha: 'aaaaaaaaaaaaaaaa' }],
  ['_media/b c.png', { caminho: '_media/b c.png', sha: 'bbbbbbbbbbbbbbbb' }],
  ['_media/f.woff2', { caminho: '_media/f.woff2', sha: 'ffffffffffffffff' }],
] as [string, ArquivoMidia][]);

describe('versão nos endereços dos arquivos', () => {
  it('src, srcset, url() e href ganham ?v=; externo, página e JavaScript ficam iguais', () => {
    const h = comVersaoNosArquivos(
      `<img src="_media/a.webp"><img srcset="./_media/a.webp 1x, _media/b%20c.png 2x"><div style="background:url('_media/a.webp')"></div>` +
      `<style>@font-face{src:url(_media/f.woff2) format("woff2")}</style><a href="cotia.html">x</a><img src="https://x.com/a.webp"><script>v="_media/a.webp"</script>`,
      usados,
    );
    expect(h).toContain('<img src="_media/a.webp?v=aaaaaaaaaa">');
    expect(h).toContain('srcset="./_media/a.webp?v=aaaaaaaaaa 1x, _media/b%20c.png?v=bbbbbbbbbb 2x"');
    expect(h).toContain("url('_media/a.webp?v=aaaaaaaaaa')");
    expect(h).toContain('url(_media/f.woff2?v=ffffffffff)');
    expect(h).toContain('href="cotia.html"');
    expect(h).toContain('src="https://x.com/a.webp"');
    expect(h).toContain('v="_media/a.webp"');
  });

  it('já com ? ou #: entra junto; "Forçar atualização" muda o endereço de todos', () => {
    expect(comVersaoNosArquivos('<img src="_media/a.webp?x=1#y">', usados)).toContain('src="_media/a.webp?x=1&v=aaaaaaaaaa#y"');
    expect(comVersaoNosArquivos('<img src="_media/a.webp">', usados, 'k9')).toContain('src="_media/a.webp?v=aaaaaaaaaa.k9"');
  });
});
