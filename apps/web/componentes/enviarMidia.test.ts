import { describe, expect, it } from 'vitest';
import { juntar, nomeLivre, repetidos } from './enviarMidia';

describe('nome dos arquivos arrastados para a mídia', () => {
  const pasta = '_media/praca/arena/';

  it('solto num lugar: recebe o nome do lugar; se já existir, -2, -3…', () => {
    const ocupados = new Set([pasta + 'desktop.mp4']);
    expect(nomeLivre(pasta, 'desktop', 'Meu Vídeo Final.MP4', ocupados)).toBe(pasta + 'desktop-2.mp4');
    expect(nomeLivre(pasta, 'desktop', 'outro.mp4', ocupados)).toBe(pasta + 'desktop-3.mp4');
    expect(nomeLivre(pasta, 'desktop', 'foto.JPEG', ocupados)).toBe(pasta + 'desktop.jpg');
  });

  it('solto na seção: nome do arquivo sem acento, espaço ou maiúscula', () => {
    expect(nomeLivre(pasta, 'Praia ao Pôr do Sol (2)', 'x.webp', new Set())).toBe(pasta + 'praia-ao-por-do-sol-2.webp');
  });
});

describe('enviar a pasta de mídia de novo', () => {
  const guardados = [
    { caminho: '_media/praca/hero/capa.webp', sha: 'a'.repeat(40), bytes: 10 },
    { caminho: '_media/praca/hero/igual.webp', sha: 'b'.repeat(40), bytes: 10 },
    { caminho: '_media/praca/extra/adicionada.webp', sha: 'c'.repeat(40), bytes: 10 },
  ];
  const pasta = [
    { caminho: '_media/praca/hero/capa.webp', sha: 'd'.repeat(40) },
    { caminho: '_media/praca/hero/igual.webp', sha: 'b'.repeat(40) },
    { caminho: '_media/praca/hero/nova.webp', sha: 'e'.repeat(40) },
  ];

  it('lista só os de mesmo nome com conteúdo diferente', () => {
    expect(repetidos(pasta, guardados)).toEqual(['_media/praca/hero/capa.webp']);
  });

  it('o que não veio na pasta nova continua no projeto', () => {
    const novos = [{ caminho: '_media/praca/hero/nova.webp', sha: 'e'.repeat(40), bytes: 5 }];
    expect(juntar(guardados, novos).map((a) => a.caminho)).toEqual([
      '_media/praca/extra/adicionada.webp', '_media/praca/hero/capa.webp', '_media/praca/hero/igual.webp', '_media/praca/hero/nova.webp',
    ]);
  });
});
