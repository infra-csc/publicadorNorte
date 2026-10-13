// T. Variável de arquivo (@arquivo_): link de download (PDF) escolhido no passo Mídia
import { describe, expect, it } from 'vitest';
import { detectar, ehMidia, gerar, opcoesMidia, refsDeArquivo } from '../src/index';

const HTML = '<a class="btn" href="@arquivo_material_aula" download>Baixar o material</a><img src="@img_material_capa">';
const ARQ = ['_media/pagina/material/aula.pdf', '_media/pagina/material/capa.webp', '_media/pagina/material/fonte.woff2', '_media/pagina/outra/x.pdf'];

describe('T. @arquivo_', () => {
  it('T1: é variável de mídia; opções = arquivos da pasta da seção (PDF e imagens; fontes não)', () => {
    expect(ehMidia('arquivo_material_aula')).toBe(true);
    const det = detectar({ unica: HTML }, 'unica');
    expect(opcoesMidia('arquivo_material_aula', det, ARQ).map((o) => o.caminho)).toEqual(['_media/pagina/material/aula.pdf', '_media/pagina/material/capa.webp']);
  });

  it('T2: o padrão é o de nome igual (aula.pdf); sai no href e o arquivo vai para o site', () => {
    const r = gerar({ formato: 'unica', modelos: { unica: HTML }, cidades: [], arquivos: ARQ });
    expect(r.paginas[0].html).toContain('href="_media/pagina/material/aula.pdf"');
    expect(refsDeArquivo(r.paginas[0].html)).toContain('_media/pagina/material/aula.pdf');
    // a imagem continua <img> (não vira vídeo nem link)
    expect(r.paginas[0].html).toContain('<img src="_media/pagina/material/capa.webp">');
  });
});

describe('T. Galeria: espaço numerado e subpasta da cidade', () => {
  const GAL = '<!-- @repetir cidades --><div><!-- @se img_galeria_foto1 --><img src="@img_galeria_foto1"><!-- @fim --><!-- @se img_galeria_foto2 --><img src="@img_galeria_foto2"><!-- @fim --><!-- @se img_galeria_foto3 --><img src="@img_galeria_foto3"><!-- @fim --></div><!-- @fim -->';
  const FOTOS = ['_media/pagina/galeria/sao-paulo/foto1.webp', '_media/pagina/galeria/sao-paulo/foto2.webp', '_media/pagina/galeria/rio-de-janeiro/foto1.webp'];

  it('T3: cada cidade pega as fotos da sua subpasta; espaço sem arquivo de mesmo nome some (não repete a primeira)', () => {
    const r = gerar({ formato: 'unica', modelos: { unica: GAL }, cidades: [{ _id: 'a', cidade: 'São Paulo' }, { _id: 'b', cidade: 'Rio de Janeiro' }], arquivos: FOTOS });
    const h = r.paginas[0].html;
    const [sp, rj] = h.split('</div>');
    expect(sp).toContain('galeria/sao-paulo/foto1.webp');
    expect(sp).toContain('galeria/sao-paulo/foto2.webp');
    expect(rj).toContain('galeria/rio-de-janeiro/foto1.webp');
    expect(rj).not.toContain('foto2');
    expect(h).not.toContain('foto3');
  });
});
