// U. Galeria: lista de fotos com a cidade de cada uma (@repetir galeria)
import { describe, expect, it } from 'vitest';
import { detectar, galeriasDe, gerar, refsDeArquivo, type FotoGaleria } from '../src/index';
import { linha } from './ajuda';

const ITEM = '<figure data-cidade="@galeria_cidade" data-n="@galeria_numero"><img src="@galeria_foto" alt="@galeria_legenda"><!-- @se galeria_legenda --><figcaption>@galeria_legenda</figcaption><!-- @fim --></figure>';
const sp = linha({ cidade: 'São Paulo' });
const rj = linha({ cidade: 'Rio de Janeiro' });
const FOTOS: FotoGaleria[] = [
  { id: 'a', arquivo: '_media/pagina/galeria/sp1.webp', cidade: sp._id, legenda: 'Aula em SP' },
  { id: 'b', arquivo: '_media/pagina/galeria/rj1.webp', cidade: rj._id },
  { id: 'c', arquivo: '_media/pagina/galeria/geral.webp', cidade: '' },
  { id: 'd', arquivo: '_media/pagina/galeria/sp2.webp', cidade: sp._id },
];

describe('U. Galeria', () => {
  it('U1: fora de cidade, todas as fotos na ordem; @galeria_cidade = nome; legenda opcional; arquivos vão para o site', () => {
    const r = gerar({ formato: 'unica', modelos: { unica: `<div class="g"><!-- @repetir galeria -->${ITEM}<!-- @fim --></div>` }, cidades: [sp, rj], galerias: { galeria: FOTOS } });
    const h = r.paginas[0].html;
    expect((h.match(/<figure/g) || []).length).toBe(4);
    expect(h.indexOf('sp1.webp')).toBeLessThan(h.indexOf('rj1.webp'));
    expect(h).toContain('data-cidade="São Paulo" data-n="1"');
    expect(h).toContain('data-cidade="" data-n="3"');
    expect(h).toContain('<figcaption>Aula em SP</figcaption>');
    expect((h.match(/figcaption/g) || []).length).toBe(2);
    expect(refsDeArquivo(h)).toEqual(expect.arrayContaining(['_media/pagina/galeria/sp1.webp', '_media/pagina/galeria/geral.webp']));
  });

  it('U2: dentro de @repetir cidades, cada cidade vê as suas e as "todas"', () => {
    const html = `<!-- @repetir cidades --><section data-c="@cidade"><!-- @repetir galeria -->${ITEM}<!-- @fim --></section><!-- @fim -->`;
    const h = gerar({ formato: 'unica', modelos: { unica: html }, cidades: [sp, rj], galerias: { galeria: FOTOS } }).paginas[0].html;
    const [hsp, hrj] = h.split('</section>');
    expect(hsp).toContain('sp1.webp');
    expect(hsp).toContain('sp2.webp');
    expect(hsp).toContain('geral.webp');
    expect(hsp).not.toContain('rj1.webp');
    expect(hrj).toContain('rj1.webp');
    expect(hrj).not.toContain('sp1.webp');
  });

  it('U3: na página da cidade (praça) só as dela e as "todas"; galerias com nome separadas', () => {
    const r = gerar({
      formato: 'tapume_praca', cidades: [sp, rj],
      modelos: { tapume: '<p>x</p>', praca: `<!-- @repetir galeria -->${ITEM}<!-- @fim --><!-- @repetir galeria_bastidores --><i>@galeria_foto</i><!-- @fim -->` },
      galerias: { galeria: FOTOS, galeria_bastidores: [{ id: 'z', arquivo: '_media/praca/bastidores/x.webp' }] },
    });
    const pRJ = r.paginas.find((p) => p.titulo === 'Rio de Janeiro')!.html;
    expect(pRJ).toContain('rj1.webp');
    expect(pRJ).not.toContain('sp1.webp');
    expect(pRJ).toContain('<i>_media/praca/bastidores/x.webp</i>');
  });

  it('U4: as variáveis da foto não viram coluna; galeriasDe lista as galerias dos HTMLs', () => {
    const det = detectar({ unica: `<!-- @repetir galeria -->${ITEM}<!-- @fim --><p>@titulo</p>` }, 'unica');
    expect([...det.variaveis.keys()]).toEqual(['titulo']);
    expect(galeriasDe({ unica: '<!-- @repetir galeria --><!-- @fim --><!-- @repetir galeria_bastidores --><!-- @fim -->', praca: null })).toEqual(['galeria', 'galeria_bastidores']);
  });
});
