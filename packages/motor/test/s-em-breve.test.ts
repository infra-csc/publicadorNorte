// S. Página de cidade/etapa "em breve" não abre no site publicado
import { describe, expect, it } from 'vitest';
import { gerar } from '../src/index';
import { linha } from './ajuda';

const PRACA = '<html><head><title>@cidade_1</title></head><body><h1>@cidade_1</h1><!-- @se status = aberta -->aberta<!-- @senao -->breve<!-- @fim --></body></html>';
const TAPUME = '<!-- @repetir cidades --><p>@cidade</p><!-- @fim -->';

describe('S. Em breve não abre', () => {
  it('S1: na publicação, a cidade em breve vira um aviso que leva para a home (sem indexar); aberta e realizado abrem', () => {
    const sp = linha({ cidade: 'São Paulo', status: 'aberta' });
    const rj = linha({ cidade: 'Rio de Janeiro' });
    const bh = linha({ cidade: 'BH', status: 'realizado' });
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: TAPUME, praca: PRACA }, cidades: [sp, rj, bh], fecharEmBreve: true });
    const [, pSP, pRJ, pBH] = r.paginas;
    expect(pSP.html).toContain('<h1>São Paulo</h1>');
    expect(pBH.html).toContain('<h1>BH</h1>');
    expect(pRJ.fechada).toBe(true);
    expect(pRJ.arquivo).toBe('rio-de-janeiro.html');
    expect(pRJ.html).not.toContain('<h1>');
    expect(pRJ.html).toContain('url=index.html');
    expect(pRJ.html).toContain('name="robots" content="noindex"');
    // o tapume continua listando todas
    expect(r.paginas[0].html).toContain('Rio de Janeiro');
  });

  it('S2: na prévia (sem fecharEmBreve) a página aparece normal', () => {
    const rj = linha({ cidade: 'Rio de Janeiro' });
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: TAPUME, praca: PRACA }, cidades: [rj] });
    expect(r.paginas[1].html).toContain('<h1>Rio de Janeiro</h1>');
    expect(r.paginas[1].fechada).toBeFalsy();
  });

  it('S3: sem status no HTML nada fecha; status das etapas fecha só a etapa', () => {
    const rj = linha({ cidade: 'Rio de Janeiro' });
    const sem = gerar({ formato: 'tapume_praca', modelos: { tapume: TAPUME, praca: '<h1>@cidade_1</h1>' }, cidades: [rj], fecharEmBreve: true });
    expect(sem.paginas[1].fechada).toBeFalsy();
    const c = linha({ cidade: 'Rio' });
    const e1 = linha({ etapa: 'Outono', _cidade: c._id, status: 'aberta' });
    const e2 = linha({ etapa: 'Inverno', _cidade: c._id });
    const r = gerar({
      formato: 'tapume_etapa_praca', fecharEmBreve: true, cidades: [c], etapas: [e1, e2],
      modelos: { tapume: TAPUME, praca: '<h1>@cidade_1</h1><!-- @repetir etapas -->@etapa<!-- @fim -->', etapa: '<h1>@etapa_1</h1><!-- @se status = aberta -->a<!-- @fim -->' },
      vars: { status: { dono: 'etapa', manual: true } },
    });
    const porTitulo = Object.fromEntries(r.paginas.map((p) => [p.titulo, p]));
    expect(porTitulo['Rio'].fechada).toBeFalsy();
    expect(porTitulo['Rio · Outono'].fechada).toBeFalsy();
    expect(porTitulo['Rio · Inverno'].fechada).toBe(true);
  });
});
