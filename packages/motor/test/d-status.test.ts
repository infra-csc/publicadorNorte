// D. Status e contagens
import { describe, expect, it } from 'vitest';
import { colunas, detectar, novaLinha, sincronizarVars } from '../src/index';
import { linha, praca, tapume } from './ajuda';

const SE_ABERTA = '<!-- @se status = aberta -->Aberta<!-- @senao -->Em breve<!-- @fim -->';

describe('D. Status e contagens', () => {
  it('D1: cidade sem status cai no @senao', () => {
    expect(praca(SE_ABERTA, {})).toBe('Em breve');
    expect(praca(SE_ABERTA, { status: '' })).toBe('Em breve');
    expect(praca(SE_ABERTA, { status: 'aberta' })).toBe('Aberta');
  });

  it('D2: contagens por status (vazio conta como breve)', () => {
    const t = tapume('<p>@total_aberta|@total_breve</p>', [linha({ cidade: 'A', status: 'aberta' }), linha({ cidade: 'B', status: '' }), linha({ cidade: 'C' })]);
    expect(t.html).toBe('<p>1|2</p>');
  });

  it('D2b: @total_breve conta vazio como breve mesmo sem @se status no HTML', () => {
    const t = tapume('<p>@total_breve</p>', [linha({ cidade: 'A' }), linha({ cidade: 'B', status: 'aberta' })]);
    expect(t.html).toBe('<p>1</p>');
  });

  it('D3: @se status = em breve é verdadeiro com status vazio', () => {
    const m = '<!-- @se status = em breve -->Breve<!-- @senao -->Outro<!-- @fim -->';
    expect(praca(m, { status: '' })).toBe('Breve');
    expect(praca(m, {})).toBe('Breve');
    expect(praca(m.replace('em breve', 'breve'), {})).toBe('Breve');
    expect(praca(m, { status: 'aberta' })).toBe('Outro');
  });

  it('D4: status "em breve" digitado conta em @total_breve e não gera aviso', () => {
    const t = tapume('<p>@total_breve</p>' + SE_ABERTA.replace('Aberta', ''), [linha({ cidade: 'A', status: 'em breve' })]);
    expect(t.html.startsWith('<p>1</p>')).toBe(true);
    expect(t.avisos.find((a) => a.codigo === 'valor-desconhecido')).toBeUndefined();
  });

  it('D5: opções de status com HTML testando só "aberta"', () => {
    const det = detectar({ tapume: '', praca: SE_ABERTA }, 'tapume_praca');
    expect(det.opcoes.status).toEqual(['em breve', 'aberta', 'realizado']);
  });

  it('D6: linha nova copiada de uma linha "aberta" volta ao status padrão', () => {
    const det = detectar({ tapume: '', praca: '<p>@cidade_1 @uf_1</p>' + SE_ABERTA }, 'tapume_praca');
    const cols = colunas('cidade', det, sincronizarVars(det));
    const base = linha({ cidade: 'São Paulo', uf: 'SP', status: 'aberta', _arquivo: 'sp.html' });
    const nova = novaLinha('cidade', base, cols, 'nova');
    expect(nova).toEqual({ _id: 'nova', cidade: '', uf: 'SP' });
    expect(base.status).toBe('aberta');
  });

  it('D7: @total_cidades dentro de @agrupar conta só o grupo', () => {
    const m = '<!-- @agrupar por regiao --><h3>@regiao @total_cidades</h3><!-- @fim -->';
    const t = tapume(m, [linha({ cidade: 'SP', regiao: 'Sudeste' }), linha({ cidade: 'Recife', regiao: 'Nordeste' }), linha({ cidade: 'RJ', regiao: 'Sudeste' })]);
    expect(t.html).toBe('<h3>Sudeste 2</h3><h3>Nordeste 1</h3>');
  });

  it('D8: valor que o HTML não conhece gera aviso', () => {
    const t = tapume(SE_ABERTA, [linha({ cidade: 'Recife', status: 'aberto' })]);
    const a = t.avisos.find((x) => x.codigo === 'valor-desconhecido');
    expect(a?.nivel).toBe('alerta');
    expect(a?.titulo).toContain('@status');
    expect(a?.detalhe).toContain('Recife = “aberto”');
  });
});
