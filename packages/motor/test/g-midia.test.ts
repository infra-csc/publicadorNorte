// G. Mídia
import { describe, expect, it } from 'vitest';
import { ajustarTagsMidia, arquivoAceito, CSS_MIDIA, detectar, gerar, opcoesMidia, padraoMidia, refsDeArquivo, acharArquivo } from '../src/index';
import { linha, semEspacos } from './ajuda';

const HERO = ['site/_media/praca/hero/hero_desktop.webp', 'site/_media/praca/hero/hero_desktop.mp4', 'site/_media/praca/hero/mobile/hero.webp'];
const detPraca = (html: string) => detectar({ tapume: '', praca: html }, 'tapume_praca');
const caminhos = (base: string, html: string, arquivos: string[]) => opcoesMidia(base, detPraca(html), arquivos).map((o) => o.caminho);

describe('G. Mídia', () => {
  it('G1: @media_hero_desktop só vê os arquivos de desktop', () => {
    expect(caminhos('media_hero_desktop', '<img src="@media_hero_desktop">', HERO)).toEqual(['_media/praca/hero/hero_desktop.mp4', '_media/praca/hero/hero_desktop.webp']);
    expect(caminhos('media_hero_mobile', '<img src="@media_hero_mobile">', HERO)).toEqual(['_media/praca/hero/mobile/hero.webp']);
  });

  it('G2: sem escolha, o padrão é a imagem', () => {
    const det = detPraca('<img src="@media_hero_desktop">');
    expect(padraoMidia('media_hero_desktop', opcoesMidia('media_hero_desktop', det, HERO))).toBe('_media/praca/hero/hero_desktop.webp');
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: '', praca: '<img src="@media_hero_desktop">' }, cidades: [linha({ cidade: 'SP' })], arquivos: HERO });
    expect(r.paginas[1].html).toBe('<img src="_media/praca/hero/hero_desktop.webp">');
  });

  it('G2b: arquivo com o mesmo nome do fim da variável vence', () => {
    const arqs = ['_media/praca/kit/a.webp', '_media/praca/kit/camiseta.mp4', '_media/praca/kit/camiseta.webp'];
    const det = detPraca('<img src="@media_kit_camiseta">');
    expect(padraoMidia('media_kit_camiseta', opcoesMidia('media_kit_camiseta', det, arqs))).toBe('_media/praca/kit/camiseta.webp');
  });

  it('G3: @img_ só aceita imagens; @video_ só vídeos', () => {
    const arqs = ['_media/praca/kit/foto.webp', '_media/praca/kit/foto.mp4'];
    expect(caminhos('img_kit_foto', '<img src="@img_kit_foto">', arqs)).toEqual(['_media/praca/kit/foto.webp']);
    expect(caminhos('video_kit_foto', '<img src="@video_kit_foto">', arqs)).toEqual(['_media/praca/kit/foto.mp4']);
  });

  it('G4: <img> com vídeo vira <video>, mantendo atributos', () => {
    const out = ajustarTagsMidia('<html><head></head><body><img class="a" src="x.mp4" alt="H" loading="lazy"></body></html>');
    expect(out).toContain('<video class="a" aria-label="H" src="x.mp4" data-pub-midia autoplay muted loop playsinline></video>');
    expect(out).toContain(CSS_MIDIA + '</head>');
  });

  it('G12: o estilo injetado não vence o CSS da página (desktop e mobile em duas tags)', () => {
    // a página esconde a versão de outra tela pela classe (.hero__bg--desk{display:none});
    // o estilo do publicador tem de ter especificidade zero para não mostrar as duas versões
    expect(CSS_MIDIA).toBe('<style>:where(video[data-pub-midia],img[data-pub-midia]){display:block;width:100%;height:100%;object-fit:cover}</style>');
    const out = ajustarTagsMidia('<head><style>.bg--desk{display:none}</style></head><img class="bg bg--desk" src="d.mp4"><img class="bg bg--mob" src="m.mp4">');
    expect(out.match(/<style>[^<]*<\/style>/g)).toEqual(['<style>.bg--desk{display:none}</style>', CSS_MIDIA]);
  });

  it('G5: <picture> cujo <img> é vídeo vira um <video> inteiro', () => {
    const out = ajustarTagsMidia('<picture><source srcset="m.webp"><img src="x.mp4"></picture>');
    expect(out).toBe(CSS_MIDIA + '<video src="x.mp4" data-pub-midia autoplay muted loop playsinline></video>');
  });

  it('G6: <source> de vídeo dentro de <picture> sai, a imagem fica', () => {
    const out = ajustarTagsMidia('<picture><source srcset="x.mp4"><img src="a.webp"></picture>');
    expect(out).toBe(CSS_MIDIA + '<picture><img src="a.webp"></picture>');
  });

  it('G7: data-src não conta como src', () => {
    const html = '<img data-src="z.mp4" src="a.webp">';
    expect(ajustarTagsMidia(html)).toBe(html);
  });

  it('G8: <video> com imagem vira <img data-pub-midia>', () => {
    const out = ajustarTagsMidia('<video class="b" src="a.webp" autoplay muted loop playsinline aria-label="Foto"></video>');
    expect(out).toBe(CSS_MIDIA + '<img class="b" alt="Foto" src="a.webp" data-pub-midia>');
  });

  it('G9: caminhos dentro de JavaScript são detectados', () => {
    const refs = refsDeArquivo('<script>const v = window.innerWidth < 700 ? "_media/praca/hero/m.mp4" : "_media/praca/hero/d.mp4"</script>');
    expect(refs).toEqual(['_media/praca/hero/m.mp4', '_media/praca/hero/d.mp4']);
  });

  it('referências de arquivo: src, srcset, url(), poster; externos e .html ignorados', () => {
    const refs = refsDeArquivo(
      '<img src="_media/a.webp" srcset="_media/b.webp 1x, _media/c.webp 2x"><div style="background:url(\'_media/d.png\')"></div>' +
        '<video poster="_media/e.jpg"></video><a href="recife.html">x</a><a href="https://x.com/f.png">y</a><img src="@img_kit_foto"><a href="#topo">t</a>',
    );
    expect(refs.sort()).toEqual(['_media/a.webp', '_media/b.webp', '_media/c.webp', '_media/d.png', '_media/e.jpg']);
    const arqs = ['site/_media/praca/kit/foto.webp', 'outra/logo.svg'];
    expect(acharArquivo('_media/praca/kit/foto.webp', arqs)).toBe('site/_media/praca/kit/foto.webp');
    expect(acharArquivo('./img/logo.svg?v=2', arqs)).toBe('outra/logo.svg');
    expect(acharArquivo('nada.png', arqs)).toBe(null);
  });

  it('G10: pasta antiga _images é aceita como _media', () => {
    expect(caminhos('img_kit_foto', '<img src="@img_kit_foto">', ['site/_images/praca/kit/foto.webp'])).toEqual(['_images/praca/kit/foto.webp']);
  });

  it('G11: mídia por cidade tem escolha diferente em cada linha', () => {
    const arqs = ['_media/praca/hero/a.webp', '_media/praca/hero/b.webp'];
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '', praca: '<img src="@media_hero_fundo_1">' },
      cidades: [linha({ cidade: 'SP', media_hero_fundo: '_media/praca/hero/b.webp' }), linha({ cidade: 'RJ' })],
      arquivos: arqs,
    });
    expect(r.vars.media_hero_fundo.dono).toBe('cidade');
    expect(r.paginas[1].html).toBe('<img src="_media/praca/hero/b.webp">');
    expect(r.paginas[2].html).toBe('<img src="_media/praca/hero/a.webp">');
  });

  it('mídia geral usa a escolha de "imagens"; escolha fora das opções volta ao padrão', () => {
    const arqs = ['_media/praca/kit/a.webp', '_media/praca/kit/b.webp'];
    const base = { formato: 'tapume_praca' as const, modelos: { tapume: '', praca: '<img src="@img_kit_foto">' }, cidades: [linha({ cidade: 'SP' })], arquivos: arqs };
    expect(gerar({ ...base, imagens: { img_kit_foto: '_media/praca/kit/b.webp' } }).paginas[1].html).toBe('<img src="_media/praca/kit/b.webp">');
    expect(gerar({ ...base, imagens: { img_kit_foto: '_media/praca/kit/sumiu.webp' } }).paginas[1].html).toBe('<img src="_media/praca/kit/a.webp">');
  });

  it('variável de mídia sem arquivo gera aviso com a pasta esperada', () => {
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: '', praca: '<img src="@img_kit_foto">' }, cidades: [linha({ cidade: 'SP' })] });
    expect(r.avisos.find((a) => a.codigo === 'midia-sem-arquivo')?.detalhe).toContain('_media/praca/kit/');
  });

  it('vídeo escolhido numa <img> vira <video> na página gerada', () => {
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '', praca: '<head></head><img class="hero" src="@media_hero_desktop_1" alt="Largada">' },
      cidades: [linha({ cidade: 'SP', media_hero_desktop: '_media/praca/hero/hero_desktop.mp4' })],
      arquivos: HERO,
    });
    expect(semEspacos(r.paginas[1].html)).toBe(
      '<head>' + CSS_MIDIA + '</head><video class="hero" aria-label="Largada" src="_media/praca/hero/hero_desktop.mp4" data-pub-midia autoplay muted loop playsinline></video>',
    );
  });

  it('arquivos aceitos: tipos conhecidos, sem ocultos', () => {
    expect(arquivoAceito('_media/praca/hero/a.webp')).toBe(true);
    expect(arquivoAceito('_media/praca/hero/.DS_Store')).toBe(false);
    expect(arquivoAceito('_media/.oculta/a.webp')).toBe(false);
    expect(arquivoAceito('_media/praca/hero/notas.txt')).toBe(false);
  });
});
