// P. Modo automático: depois do último dia (mais as horas configuradas), a cidade fica "realizado"
import { describe, expect, it } from 'vitest';
import { estaRealizado, gerar } from '../src/index';
import { linha } from './ajuda';

// horário de Brasília (UTC−3): 23/10/2026 08:00 BRT = 11:00 UTC
const em = (iso: string) => new Date(iso);

describe('P. Modo automático', () => {
  const card =
    '<p>@total_realizado realizada(s)</p><!-- @repetir cidades --><div><!-- @se status = realizado -->@cidade: realizado<!-- @senao --><!-- @se status = aberta -->@cidade: aberta<!-- @senao -->@cidade: em breve<!-- @fim --><!-- @fim --></div><!-- @fim -->';
  const cotia = linha({ cidade: 'Cotia', status: 'aberta', data_inicio: '13/10/2026', data_fim: '23/10/2026' });
  const ibiuna = linha({ cidade: 'Ibiúna', data_inicio: '23/10/2026' });
  const piedade = linha({ cidade: 'Piedade', status: 'aberta', data_inicio: '01/11/2026', data_fim: '05/11/2026' });
  const semData = linha({ cidade: 'Sem data', status: 'aberta' });
  const base = { formato: 'unica' as const, modelos: { unica: card }, cidades: [cotia, ibiuna, piedade, semData] };

  it('P1: no último dia, passadas as horas configuradas, vira "realizado" em todos os lugares', () => {
    const antes = gerar({ ...base, automacao: { ativo: true, horas: 8 }, agora: em('2026-10-23T10:59:00Z') }).paginas[0].html;
    expect(antes).toBe('<p>0 realizada(s)</p><div>Cotia: aberta</div><div>Ibiúna: em breve</div><div>Piedade: aberta</div><div>Sem data: aberta</div>');
    const depois = gerar({ ...base, automacao: { ativo: true, horas: 8 }, agora: em('2026-10-23T11:00:00Z') }).paginas[0].html;
    // Cotia (fim 23/10) e Ibiúna (só início 23/10) passaram; Piedade ainda não; sem data não muda
    expect(depois).toBe('<p>2 realizada(s)</p><div>Cotia: realizado</div><div>Ibiúna: realizado</div><div>Piedade: aberta</div><div>Sem data: aberta</div>');
  });

  it('P2: manual não muda nada; as horas são configuráveis', () => {
    const manual = gerar({ ...base, automacao: { ativo: false, horas: 8 }, agora: em('2027-01-01T00:00:00Z') }).paginas[0].html;
    expect(manual).toContain('<div>Cotia: aberta</div>');
    expect(estaRealizado(cotia, { ativo: true, horas: 0 }, em('2026-10-23T03:00:00Z'))).toBe(true);
    expect(estaRealizado(cotia, { ativo: true, horas: 0 }, em('2026-10-23T02:59:00Z'))).toBe(false);
    expect(estaRealizado(cotia, { ativo: true, horas: 30 }, em('2026-10-24T08:59:00Z'))).toBe(false);
    expect(estaRealizado(cotia, { ativo: true, horas: 30 }, em('2026-10-24T09:00:00Z'))).toBe(true);
    expect(estaRealizado(semData, { ativo: true, horas: 8 }, em('2030-01-01T00:00:00Z'))).toBe(false);
  });

  it('P3: "realizado" é um status conhecido; aviso se o automático está ligado e o HTML não mostra "realizado"', () => {
    const r = gerar({ ...base, automacao: { ativo: true, horas: 8 }, agora: em('2026-10-01T00:00:00Z') });
    expect(r.deteccao.opcoes.status).toContain('realizado');
    expect(r.avisos.some((a) => a.codigo === 'sem-realizado')).toBe(false);
    const semRealizado = gerar({
      formato: 'unica',
      modelos: { unica: '<!-- @repetir cidades --><!-- @se status = aberta -->@cidade<!-- @fim --><!-- @fim -->' },
      cidades: [cotia],
      automacao: { ativo: true, horas: 8 },
      agora: em('2026-10-01T00:00:00Z'),
    });
    expect(semRealizado.avisos.find((a) => a.codigo === 'sem-realizado')).toMatchObject({ nivel: 'alerta' });
    expect(semRealizado.deteccao.opcoes.status).toContain('realizado');
  });
});
