import { describe, expect, it } from 'vitest';
import { nomeLivre } from './enviarMidia';

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
