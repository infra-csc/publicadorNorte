import { describe, expect, it } from 'vitest';
import { semEsperarCss } from './Previa';

describe('prévia: CSS de fora não segura o desenho', () => {
  it('Google Fonts entra quando chegar, com a media original', () => {
    const h = semEsperarCss('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend">');
    expect(h).toContain('media="print"');
    expect(h).toContain('data-pub-media="all"');
    expect(h).toContain('onload="this.media=this.dataset.pubMedia"');
    expect(semEsperarCss(`<link rel='stylesheet' media='screen' href='//x.com/a.css' />`)).toContain('data-pub-media="screen"');
  });

  it('CSS local, preconnect e link que já tem onload ficam como estão', () => {
    for (const t of ['<link rel="stylesheet" href="css/site.css">', '<link rel="preconnect" href="https://fonts.googleapis.com">', '<link rel="stylesheet" href="https://a.com/x.css" media="print" onload="this.media=\'all\'">']) {
      expect(semEsperarCss(t)).toBe(t);
    }
  });
});
