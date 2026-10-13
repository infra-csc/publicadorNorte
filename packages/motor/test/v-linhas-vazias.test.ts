// V. Linhas vazias no cadastro (ex.: sobra de planilha): ficam de fora do site
import { describe, expect, it } from 'vitest';
import { gerar, linhaVazia } from '../src/index';
import { linha } from './ajuda';

const LISTA = '<p>@total_cidades</p><!-- @repetir cidades --><button>@cidade</button><!-- @fim -->';

describe('V. Linhas vazias', () => {
  it('V1: One page: linha só com id não entra na lista nem no total; aviso diz quantas', () => {
    const r = gerar({ formato: 'unica', modelos: { unica: LISTA }, cidades: [linha({ cidade: 'Fortaleza' }), linha(), linha({ cidade: '', local: ' ' }), linha({ cidade: 'Salvador' })] });
    const h = r.paginas[0].html;
    expect(h).toContain('<p>2</p>');
    expect((h.match(/<button>/g) || []).length).toBe(2);
    expect(h).not.toContain('<button></button>');
    expect(r.avisos.find((a) => a.codigo === 'linhas-vazias')?.titulo).toContain('2 cidade');
  });

  it('V2: praça: linha vazia continua virando página (cidade-N.html, como no protótipo)', () => {
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: '<p>x</p>', praca: '<p>@cidade @local</p>' }, cidades: [linha({ cidade: 'Fortaleza' }), linha()] });
    expect(r.paginas.filter((p) => p.tipo === 'praca')).toHaveLength(2);
    expect(r.avisos.some((a) => a.codigo === 'linhas-vazias')).toBe(false);
    expect(linhaVazia({ _id: 'x', _arquivo: 'a.html' })).toBe(true);
    expect(linhaVazia({ _id: 'x', status: 'aberta' })).toBe(false);
  });
});
