import { describe, expect, it } from 'vitest';
import type { Evento } from '@/lib/comum/tipos';
import { ordemJunto, porJunto, trocarItens } from './passos/PassoCadastro';

const ev = (p: Partial<Evento>) => ({ gerais: {}, imagens: {}, vars: {}, ...p }) as Evento;

describe('arrastar no Cadastro', () => {
  it('item da lista arrastado: textos e imagens com o mesmo número vão junto', () => {
    const e = ev({
      gerais: { etapa1_nome: 'Outono', etapa1_frase: 'F1', etapa2_nome: 'Inverno', etapa2_frase: 'F2', etapa3_nome: 'Primavera', titulo: 'fica' },
      imagens: { img_etapa1_kit: 'a.webp', img_etapa2_kit: 'b.webp' },
    });
    // a etapa 3 vai para o primeiro lugar: 1 ← 3, 2 ← 1, 3 ← 2
    trocarItens(e, 'etapa', new Map([[1, 3], [2, 1], [3, 2]]));
    expect(e.gerais).toEqual({ etapa1_nome: 'Primavera', etapa2_nome: 'Outono', etapa2_frase: 'F1', etapa3_nome: 'Inverno', etapa3_frase: 'F2', titulo: 'fica' });
    expect(e.imagens).toEqual({ img_etapa2_kit: 'a.webp', img_etapa3_kit: 'b.webp' });
  });

  it('campo arrastado: fica ao lado do outro na tela e no evento (sem o mover das setas)', () => {
    const e = ev({ vars: { a: { dono: 'geral', mover: 1 }, b: { dono: 'geral', junto: { de: 'a' } }, c: { dono: 'geral' } } as never });
    porJunto(e, [['a', 'c']], true);
    expect(e.vars.a).toEqual({ dono: 'geral', junto: { de: 'c', depois: true } });
    expect(ordemJunto(['a', 'b', 'c'], e.vars)).toEqual(['c', 'b', 'a']);
  });
});
