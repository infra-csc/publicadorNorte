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

  it('N3: @a_confirmar é sempre geral (até dentro de @repetir), sai "A confirmar" por padrão e é editável', () => {
    const tpl = '<ul><!-- @repetir cidades --><li><!-- @se local -->@local<!-- @senao -->@a_confirmar<!-- @fim --></li><!-- @fim --></ul>';
    const sp = linha({ cidade: 'SP', local: 'Parque' });
    const rj = linha({ cidade: 'RJ' });
    const r = gerar({ formato: 'unica', modelos: { unica: tpl }, cidades: [sp, rj], marcarEdicao: true });
    expect(r.vars.a_confirmar.dono).toBe('geral');
    expect(r.paginas[0].html).toBe(
      `<ul><li><pub-v data-v="local" data-l="${sp._id}">Parque</pub-v></li><li><pub-v data-v="a_confirmar" data-l="">A confirmar</pub-v></li></ul>`,
    );
    // o texto digitado no cadastro vale para todos os lugares
    const r2 = gerar({ formato: 'unica', modelos: { unica: tpl }, cidades: [rj], gerais: { a_confirmar: 'Em breve' } });
    expect(r2.paginas[0].html).toBe('<ul><li>Em breve</li></ul>');
  });
});
