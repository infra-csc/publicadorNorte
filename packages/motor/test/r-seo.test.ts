// R. SEO e compartilhamento
import { describe, expect, it } from 'vitest';
import { aplicarSeo, gerar, lerSeo, refsDeArquivo } from '../src/index';
import { linha } from './ajuda';

const PAG = '<!doctype html><html><head><meta charset="utf-8"><title>Velho</title><meta name="description" content="desc velha"><meta property="og:title" content="og velho"><link rel="icon" href="_media/velho.ico"></head><body><header><img src="_media/logo.svg"></header><h1>Oi</h1><p>Curto.</p><p>O Cuidar leva saúde para mais perto das pessoas, com avaliações, atividades físicas orientadas e informação sobre saúde para toda a família, em vários lugares.</p><img src="_media/pagina/hero/foto.jpg"></body></html>';

describe('R. SEO e compartilhamento', () => {
  it('R1: tudo vazio → automático: título e descrição do HTML; compartilhamento copia; imagem = primeira foto da página', () => {
    const h = aplicarSeo(PAG, { nomeEvento: 'Cuidar' }, {});
    const s = lerSeo(h);
    expect(s.titulo).toBe('Velho');
    expect(s.descricao).toBe('desc velha');
    expect(s.ogTitulo).toBe('Velho');
    expect(s.ogDescricao).toBe('desc velha');
    expect(s.ogImagem).toBe('_media/pagina/hero/foto.jpg');
    expect(s.favicon).toBe('_media/velho.ico');
    expect(h.match(/<title>/g)).toHaveLength(1);
    expect(h.match(/og:title/g)).toHaveLength(1);
    expect(h).toContain('name="twitter:card" content="summary_large_image"');
  });

  it('R2: sem title nem meta no HTML → nome do evento e o primeiro parágrafo de verdade (até ~155 caracteres, sem cortar palavra)', () => {
    const sem = PAG.replace(/<title>.*?<\/title>|<meta name="description"[^>]*>/g, '');
    const s = lerSeo(aplicarSeo(sem, { nomeEvento: 'Cuidar' }, {}));
    expect(s.titulo).toBe('Cuidar');
    expect(s.descricao!.startsWith('O Cuidar leva saúde')).toBe(true);
    expect(s.descricao!.length).toBeLessThanOrEqual(156);
    expect(s.descricao!.endsWith('…')).toBe(true);
    // página de cidade: "evento · cidade"
    expect(lerSeo(aplicarSeo(sem, { nomeEvento: 'Cuidar' }, { cidade: 'Cotia' })).titulo).toBe('Cuidar · Cotia');
  });

  it('R3: preenchido vale; {cidade}/{evento} trocados; aspas e < escapados; favicon e imagem com o caminho da mídia', () => {
    const seo = {
      nomeEvento: 'Cuidar', titulo: '{evento} <grátis>', descricao: 'Venha "já"',
      favicon: '_media/seo/icone.png', share: { imagem: '_media/seo/share.jpg', titulo: '{evento} chegou', descricao: '' },
      interna: { titulo: '{evento} em {cidade}' },
    };
    const h = aplicarSeo(PAG, seo, {});
    const s = lerSeo(h);
    expect(s.titulo).toBe('Cuidar <grátis>');
    expect(h).toContain('<title>Cuidar &lt;grátis&gt;</title>');
    // página da cidade: os campos das cidades; compartilhamento com o título da própria página, mesma imagem
    const c = lerSeo(aplicarSeo(PAG, seo, { cidade: 'Cotia' }));
    expect(c.titulo).toBe('Cuidar em Cotia');
    expect(c.ogTitulo).toBe('Cuidar em Cotia');
    expect(c.ogImagem).toBe('_media/seo/share.jpg');
    expect(h).toContain('content="Venha &quot;já&quot;"');
    expect(s.ogTitulo).toBe('Cuidar chegou');
    expect(s.ogDescricao).toBe('Venha "já"');
    expect(s.favicon).toBe('_media/seo/icone.png');
    expect(h).not.toContain('velho.ico');
    // os arquivos vão para o site
    expect(refsDeArquivo(h)).toEqual(expect.arrayContaining(['_media/seo/icone.png', '_media/seo/share.jpg']));
  });

  it('R4: com o endereço do site, og:image e og:url ficam absolutos (redes sociais exigem)', () => {
    const h = aplicarSeo(PAG, { nomeEvento: 'Cuidar', share: { imagem: '_media/seo/share.jpg' } }, { urlSite: 'https://circuitocuidar.com.br/', arquivo: 'cotia.html' });
    expect(lerSeo(h).ogImagem).toBe('https://circuitocuidar.com.br/_media/seo/share.jpg');
    expect(h).toContain('property="og:url" content="https://circuitocuidar.com.br/cotia.html"');
    const home = aplicarSeo(PAG, { nomeEvento: 'Cuidar' }, { urlSite: 'https://circuitocuidar.com.br/', arquivo: 'index.html' });
    expect(home).toContain('property="og:url" content="https://circuitocuidar.com.br/"');
  });

  it('R5: no gerar, só com seo informado; a página interna usa os campos das cidades', () => {
    const sp = linha({ cidade: 'São Paulo' });
    const base = { formato: 'tapume_praca' as const, modelos: { tapume: '<html><head><title>T</title></head><body><p>x</p></body></html>', praca: '<html><head></head><body><h1>@cidade_1</h1></body></html>' }, cidades: [sp] };
    expect(gerar(base).paginas[1].html).not.toContain('og:title');
    const r = gerar({ ...base, seo: { nomeEvento: 'Combo', titulo: 'Combo 2027', interna: { titulo: 'Combo em {cidade}' } } });
    expect(lerSeo(r.paginas[0].html).titulo).toBe('Combo 2027');
    expect(lerSeo(r.paginas[1].html).titulo).toBe('Combo em São Paulo');
  });
});
