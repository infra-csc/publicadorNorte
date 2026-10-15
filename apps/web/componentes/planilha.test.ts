// Enviar planilha: CSV de gerais (variavel;valor) e linhas vazias
import { Cadastro, detectar, sincronizarVars } from '@norte/motor';
import { describe, expect, it } from 'vitest';
import type { Evento } from '@/lib/comum/tipos';
import { lerPlanilha } from './planilha';

const HTML = '<h1>@evento</h1><p>@publico</p><!-- @repetir cidades --><b>@cidade @local</b><!-- @fim -->';
const det = detectar({ unica: HTML }, 'unica');
const evento = { formato: 'unica', gerais: {}, cidades: [{ _id: 'a', cidade: 'Fortaleza' }, { _id: 'v1' }, { _id: 'v2' }], etapas: [] } as unknown as Evento;
const cad = new Cadastro(det, { vars: sincronizarVars(det, {}), cidades: evento.cidades });
const csv = (t: string, nome = 'x.csv') => new File([t], nome, { type: 'text/csv' });

describe('planilha', () => {
  it('CSV "variavel;valor" vai para os gerais e não mexe nas cidades', async () => {
    const p = await lerPlanilha(csv('﻿variavel;valor\nevento;"Pequeno Chef"\n@publico;"16+"\nnao_existe;x\n'), evento, cad);
    expect(p.gerais).toEqual({ evento: 'Pequeno Chef', publico: '16+' });
    expect(p.cidades).toBe(evento.cidades);
    expect(p.avisos.join(' ')).toContain('nao_existe');
  });

  it('linhas só com id não viram cidade; as vazias de antes saem contadas', async () => {
    const p = await lerPlanilha(csv('cidade;local;id (não altere)\nFortaleza;Centro;a\n;;v1\n;;v2\n'), evento, cad);
    expect(p.cidades.map((c) => c.cidade)).toEqual(['Fortaleza']);
    expect(p.resumo[0]).toMatchObject({ atualizadas: 1, novas: 0, removidas: ['2 sem nada preenchido'] });
  });

  it('cabeçalho como no HTML (cidade_1, @local_1) vale como a coluna', async () => {
    const p = await lerPlanilha(csv('cidade_1;@local_1;id (não altere)\nFortaleza;Praia;a\n'), evento, cad);
    expect(p.cidades[0]).toMatchObject({ cidade: 'Fortaleza', local: 'Praia' });
    expect(p.avisos.join(' ')).not.toContain('ignorada');
  });

  it('texto do card repetido (coluna da cidade) que vem na aba de gerais passa a ser geral; nome da base, não', async () => {
    const h = '<!-- @repetir cidades --><a>@cidade <span>@tag_aberta</span></a><!-- @fim -->';
    const d = detectar({ unica: h }, 'unica');
    const ev = { formato: 'unica', gerais: {}, cidades: [], etapas: [] } as unknown as Evento;
    const p = await lerPlanilha(csv('variavel;valor\ntag_aberta;inscreva-se\ncidade;Rio\n'), ev, new Cadastro(d, { vars: sincronizarVars(d, {}), cidades: [] }));
    expect(p.gerais).toEqual({ tag_aberta: 'inscreva-se' });
    expect(p.paraGeral).toEqual(['tag_aberta']);
    expect(p.avisos.join(' ')).toContain('“cidade” não existe');
  });

  it('aba sem nenhuma coluna do cadastro: erro em vez de criar cidades vazias', async () => {
    await expect(lerPlanilha(csv('foo;bar\n1;2\n'), evento, cad)).rejects.toThrow(/nenhuma coluna/);
  });
});
