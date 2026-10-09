// O. Datas: o cadastro guarda a data; o HTML escolhe como mostrar
import { describe, expect, it } from 'vitest';
import { deISO, formatarData, gerar, paraISO, periodo } from '../src/index';
import { linha } from './ajuda';

describe('O. Datas', () => {
  it('O1: cada variação do nome mostra a data de um jeito', () => {
    const v = '13/10/2026';
    expect(formatarData(v, 'dia')).toBe('13');
    expect(formatarData(v, 'mes')).toBe('10');
    expect(formatarData(v, 'mes_nome')).toBe('outubro');
    expect(formatarData(v, 'mes_abrev')).toBe('out');
    expect(formatarData(v, 'ano')).toBe('2026');
    expect(formatarData(v, 'curta')).toBe('13/10');
    expect(formatarData(v, 'semana')).toBe('terça-feira');
    expect(formatarData(v, 'semana_abrev')).toBe('ter');
    expect(formatarData(v, 'extenso')).toBe('13 de outubro de 2026');
    // sem ano: o que dá para mostrar; o que não é data sai como foi digitado
    expect(formatarData('12/03', 'mes_nome')).toBe('março');
    expect(formatarData('12/03', 'ano')).toBe('');
    expect(formatarData('a definir', 'dia')).toBe('a definir');
    // campo de data do navegador ↔ cadastro
    expect(paraISO('13/10/2026')).toBe('2026-10-13');
    expect(deISO('2026-10-13')).toBe('13/10/2026');
  });

  it('O2: @periodo junta início e fim sem repetir mês e ano', () => {
    expect(periodo('13/10/2026', '23/10/2026')).toBe('13 a 23 out 2026');
    expect(periodo('28/09/2026', '03/10/2026')).toBe('28 set a 3 out 2026');
    expect(periodo('30/12/2026', '02/01/2027')).toBe('30 dez 2026 a 2 jan 2027');
    expect(periodo('13/10/2026', '')).toBe('13 out 2026');
    expect(periodo('13/10/2026', '13/10/2026')).toBe('13 out 2026');
    expect(periodo('13/10/2026', '23/10/2026', true)).toBe('13 a 23 de outubro de 2026');
    expect(periodo('', '23/10/2026')).toBe('');
  });

  it('O3: na página, a coluna da data vem sozinha e as variações saem prontas', () => {
    const sp = linha({ cidade: 'SP', data_inicio: '13/10/2026', data_fim: '23/10/2026' });
    const r = gerar({
      formato: 'tapume_praca',
      modelos: {
        tapume: '<!-- @repetir cidades --><p>@cidade: @periodo</p><!-- @fim -->',
        praca: '<b>@data_inicio_dia_1</b> <i>@data_inicio_mes_abrev_1</i> · @periodo_extenso_1 · @data_fim_1',
      },
      cidades: [sp],
    });
    // data_inicio e data_fim viram colunas da cidade mesmo sem aparecer puras no HTML
    expect(r.vars.data_inicio.dono).toBe('cidade');
    expect(r.vars.data_fim.dono).toBe('cidade');
    expect(r.vars.data_inicio_dia.dono).toBe('auto');
    expect(r.vars.periodo.dono).toBe('auto');
    expect(r.paginas[0].html).toBe('<p>SP: 13 a 23 out 2026</p>');
    expect(r.paginas[1].html).toBe('<b>13</b> <i>out</i> · 13 a 23 de outubro de 2026 · 23/10/2026');
  });

  it('O4: na prévia editável, só a data digitada é editável (as variações não)', () => {
    const r = gerar({
      formato: 'unica',
      modelos: { unica: '<p>@data_evento_dia de @data_evento_mes_nome</p><p>@data_evento</p>' },
      gerais: { data_evento: '05/11/2026' },
      marcarEdicao: true,
    });
    expect(r.paginas[0].html).toBe('<p>5 de novembro</p><p><pub-v data-v="data_evento" data-l="">05/11/2026</pub-v></p>');
  });
});
