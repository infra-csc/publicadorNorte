import { describe, expect, it } from 'vitest';
import type { Evento } from '../comum/tipos';
import { capaDoEvento } from './armazenamento';

const ev = (seo?: Evento['seo']) => ({ slug: 'combo', seo } as Evento);
const arvore = (itens: [string, string, number][]) => new Map(itens.map(([p, sha, size]) => [p, { sha, size }]));

describe('capa do evento na lista', () => {
  const todos = arvore([
    ['eventos/combo/arquivos/_media/logo.png', 'a'.repeat(40), 5_000],
    ['eventos/combo/arquivos/_media/galeria/foto1.jpg', 'b'.repeat(40), 900_000],
    ['eventos/combo/arquivos/_media/hero-desktop.webp', 'c'.repeat(40), 300_000],
    ['eventos/combo/arquivos/_media/seo/compartilhar.jpg', 'd'.repeat(40), 120_000],
    ['eventos/outro/arquivos/_media/capa.jpg', 'e'.repeat(40), 500_000],
  ]);

  it('usa a imagem de compartilhar do SEO', () => {
    expect(capaDoEvento(ev({ share: { imagem: '_media/seo/compartilhar.jpg' } }), todos)).toBe(`/api/arquivos/${'d'.repeat(40)}?n=compartilhar.jpg`);
  });
  it('sem SEO: imagem de nome de capa antes da maior; ignora outros eventos e ícones', () => {
    expect(capaDoEvento(ev(), todos)).toBe(`/api/arquivos/${'c'.repeat(40)}?n=hero-desktop.webp`);
    const semHero = new Map([...todos].filter(([p]) => !p.includes('hero') && !p.includes('seo/')));
    expect(capaDoEvento(ev(), semHero)).toBe(`/api/arquivos/${'b'.repeat(40)}?n=foto1.jpg`);
  });
  it('sem imagem: null', () => {
    expect(capaDoEvento(ev(), arvore([['eventos/combo/arquivos/_media/logo.png', 'a'.repeat(40), 5_000]]))).toBeNull();
  });
});
