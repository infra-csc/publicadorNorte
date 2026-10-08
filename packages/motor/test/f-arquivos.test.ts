// F. Arquivos e URLs
import { describe, expect, it } from 'vitest';
import { gerar } from '../src/index';
import { linha, tapume } from './ajuda';

const gerarPracas = (cidades: ReturnType<typeof linha>[], praca = '<h1>@cidade_1 @uf_1</h1>') =>
  gerar({ formato: 'tapume_praca', modelos: { tapume: '<!-- @repetir cidades --><a href="@url">@cidade</a><!-- @fim -->', praca }, cidades });

describe('F. Arquivos e URLs', () => {
  it('F1: "São Paulo" vira sao-paulo.html, e o @url do card aponta para ele', () => {
    const r = gerarPracas([linha({ cidade: 'São Paulo' })]);
    expect(r.paginas.map((p) => p.arquivo)).toEqual(['index.html', 'sao-paulo.html']);
    expect(r.paginas[0].html).toBe('<a href="sao-paulo.html">São Paulo</a>');
  });

  it('F2: cidade sem nome na linha 3 vira cidade-3.html', () => {
    const r = gerarPracas([linha({ cidade: 'A' }), linha({ cidade: 'B' }), linha({ cidade: '' })]);
    expect(r.paginas.map((p) => p.arquivo)).toEqual(['index.html', 'a.html', 'b.html', 'cidade-3.html']);
  });

  it('F3: coluna de nome vazia não usa a UF como nome', () => {
    const r = gerarPracas([linha({ cidade: '', uf: 'SP' })]);
    expect(r.paginas[1].titulo).toBe('Cidade 1');
    expect(r.paginas[1].arquivo).toBe('cidade-1.html');
  });

  it('F3b: sem coluna de nome, usa a primeira coluna preenchida', () => {
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: '', praca: '<h1>@uf_1</h1>' }, cidades: [linha({ uf: 'SP' })] });
    expect(r.paginas[1].titulo).toBe('SP');
    expect(r.paginas[1].arquivo).toBe('sp.html');
  });

  it('F4: duas cidades "Recife" geram aviso bloqueante de arquivo duplicado', () => {
    const r = gerarPracas([linha({ cidade: 'Recife' }), linha({ cidade: 'Recife' })]);
    expect(r.avisos[0]).toMatchObject({ codigo: 'arquivo-duplicado', nivel: 'bloqueia' });
    expect(r.avisos[0].detalhe).toContain('recife.html');
    expect(r.bloqueado).toBe(true);
  });

  it('F5: etapa "Outono" de "São Paulo" vira sao-paulo-outono.html', () => {
    const sp = linha({ cidade: 'São Paulo' });
    const r = gerar({
      formato: 'tapume_etapa_praca',
      modelos: { tapume: '', praca: '<p>@cidade_1</p>', etapa: '<p>@etapa_1</p>' },
      cidades: [sp],
      etapas: [linha({ etapa: 'Outono', _cidade: sp._id })],
    });
    expect(r.paginas.map((p) => p.arquivo)).toEqual(['index.html', 'sao-paulo.html', 'sao-paulo-outono.html']);
    expect(r.paginas[2].titulo).toBe('São Paulo · Outono');
    expect(r.paginas[2].nivel).toBe(1);
  });

  it('F5b: etapa usa o arquivo digitado da cidade', () => {
    const sp = linha({ cidade: 'São Paulo', _arquivo: 'sp.html' });
    const r = gerar({
      formato: 'tapume_etapa_praca',
      modelos: { tapume: '', praca: '<p>@cidade_1</p>', etapa: '<p>@etapa_1</p>' },
      cidades: [sp],
      etapas: [linha({ etapa: 'Outono', _cidade: sp._id })],
    });
    expect(r.paginas[2].arquivo).toBe('sp-outono.html');
  });

  it('F6: _arquivo digitado é usado', () => {
    const r = gerarPracas([linha({ cidade: 'São Paulo', _arquivo: 'sp.html' })]);
    expect(r.paginas[1].arquivo).toBe('sp.html');
    expect(r.paginas[0].html).toBe('<a href="sp.html">São Paulo</a>');
  });

  it('F7: tapume com @cidade_3 e 2 cidades: vazio e aviso de espaços sobrando', () => {
    const t = tapume('<p>@cidade_1|@cidade_2|@cidade_3|<a href="@url_3">x</a></p>', [linha({ cidade: 'A' }), linha({ cidade: 'B' })]);
    expect(t.html).toBe('<p>A|B||<a href="">x</a></p>');
    const a = t.avisos.find((x) => x.codigo === 'espacos-sobrando');
    expect(a?.detalhe).toContain('@cidade_3');
    expect(a?.detalhe).toContain('@url_3');
  });

  it('etapas sem cidade avisam e não geram página', () => {
    const r = gerar({
      formato: 'tapume_etapa_praca',
      modelos: { tapume: '', praca: '<p>@cidade_1</p>', etapa: '<p>@etapa_1</p>' },
      cidades: [linha({ cidade: 'SP' })],
      etapas: [linha({ etapa: 'Solta' })],
    });
    expect(r.avisos.find((a) => a.codigo === 'etapas-sem-cidade')?.detalhe).toContain('Solta');
    expect(r.paginas.map((p) => p.arquivo)).toEqual(['index.html', 'sp.html']);
  });

  it('falta de HTML e formato One page', () => {
    const r = gerar({ formato: 'tapume_praca', modelos: { praca: '<p>@cidade_1</p>' }, cidades: [linha({ cidade: 'SP' })] });
    expect(r.avisos[0]).toMatchObject({ codigo: 'falta-html', nivel: 'bloqueia' });
    // One page: uma página só (index.html), com os campos gerais e a linha única do cadastro
    const pag = linha({ cidade: 'SP', local: 'Parque' });
    const u = gerar({ formato: 'unica', modelos: { unica: '<p>@evento em @cidade_1 (@local_1) e contato@norte.com</p>' }, gerais: { evento: 'Makai' }, cidades: [pag] });
    expect(u.paginas).toHaveLength(1);
    expect(u.paginas[0]).toMatchObject({ tipo: 'unica', arquivo: 'index.html', cidadeId: pag._id, html: '<p>Makai em SP (Parque) e contato@norte.com</p>' });
    expect(u.bloqueado).toBe(false);
    // sem a linha do cadastro, a página sai com os campos vazios e aviso (não bloqueia)
    const v = gerar({ formato: 'unica', modelos: { unica: '<p>@cidade_1</p>' } });
    expect(v.paginas[0].html).toBe('<p></p>');
    expect(v.bloqueado).toBe(false);
    expect(v.avisos.map((a) => [a.codigo, a.nivel])).toEqual([['sem-cidades', 'alerta']]);
  });

  it('gerais vazios e variável excluída', () => {
    const r = gerar({
      formato: 'tapume_praca',
      modelos: { tapume: '<h1>@evento @ano</h1>', praca: '<p>@cidade_1 @local_1</p>' },
      cidades: [linha({ cidade: 'SP', local: 'Parque' })],
      gerais: { evento: 'Makai' },
      vars: { local: { dono: 'cidade', excluida: true } },
    });
    expect(r.paginas[0].html).toBe('<h1>Makai </h1>');
    expect(r.paginas[1].html).toBe('<p>SP </p>');
    expect(r.avisos.find((a) => a.codigo === 'gerais-vazios')?.detalhe).toContain('@ano');
  });

  it('variável marcada "não é variável" fica como está escrita', () => {
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: '<p>@marca</p>', praca: '' }, cidades: [linha({ cidade: 'SP' })], vars: { marca: { dono: 'geral', ignorar: true } } });
    expect(r.paginas[0].html).toBe('<p>@marca</p>');
  });

  it('valores são escapados no HTML', () => {
    const t = tapume('<!-- @repetir cidades --><a title="@cidade">@cidade</a><!-- @fim -->', [linha({ cidade: 'A & "B"' })]);
    expect(t.html).toBe('<a title="A &amp; &quot;B&quot;">A &amp; &quot;B&quot;</a>');
  });

  it('o motor não altera a entrada', () => {
    const cidades = [linha({ cidade: 'SP' })];
    const vars = {};
    const e = { formato: 'tapume_praca' as const, modelos: { tapume: '<p>@cidade_1</p>', praca: '<p>@cidade_1</p>' }, cidades, vars };
    const copia = JSON.stringify(e);
    gerar(e);
    expect(JSON.stringify(e)).toBe(copia);
  });
});
