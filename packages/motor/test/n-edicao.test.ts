// N. Edição na prévia: o motor marca de onde vem cada texto (só quando pedido)
import { describe, expect, it } from 'vitest';
import { gerar } from '../src/index';
import { linha } from './ajuda';

const html =
  '<html><head><title>@evento</title><style>.a{content:"@evento"}</style></head><body>' +
  '<h1 class="t">@evento</h1><img src="x.png" alt="Foto @evento">' +
  '<a href="@link" title="ir">Ver @evento</a>' +
  '<ul><!-- @repetir cidades --><li>@cidade (@total_cidades)</li><!-- @fim --></ul>' +
  '<script>var e = "@evento";</script></body></html>';

describe('N. Edição na prévia', () => {
  const cotia = linha({ cidade: 'Cotia' });
  const base = { formato: 'unica' as const, modelos: { unica: html }, gerais: { evento: 'Cuidar', link: 'https://x.com' }, cidades: [cotia] };

  it('N1: sem pedir, a página sai sem marcas', () => {
    const p = gerar(base).paginas[0].html;
    expect(p).not.toContain('pub-v');
    expect(p).not.toMatch(/[-]/);
    expect(p).toContain('<h1 class="t">Cuidar</h1>');
  });

  it('N2: com marcarEdicao, só o texto visível vira <pub-v> com a variável e a linha', () => {
    const p = gerar({ ...base, marcarEdicao: true }).paginas[0].html;
    expect(p).toContain('<h1 class="t"><pub-v data-v="evento" data-l="">Cuidar</pub-v></h1>');
    expect(p).toContain(`<li><pub-v data-v="cidade" data-l="${cotia._id}">Cotia</pub-v> (1)</li>`);
    expect(p).toContain('>Ver <pub-v data-v="evento" data-l="">Cuidar</pub-v></a>');
    // atributos, <title>, <style> e <script> ficam com o valor puro
    expect(p).toContain('<title>Cuidar</title>');
    expect(p).toContain('alt="Foto Cuidar"');
    expect(p).toContain('href="https://x.com"');
    expect(p).toContain('content:"Cuidar"');
    expect(p).toContain('var e = "Cuidar";');
    // contagens automáticas não são editáveis
    expect(p).not.toContain('data-v="total_cidades"');
    expect(p).not.toMatch(/[-]/);
  });
});
