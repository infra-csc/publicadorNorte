// Y. Pós-evento: outro HTML que entra no lugar da página (mesmo arquivo) quando ativado
import { describe, expect, it } from 'vitest';
import { detectar, gerar, pastasMidia, soNoPos } from '../src/index';
import { linha } from './ajuda';

describe('Y. Pós-evento', () => {
  it('Y1: One page: desligado mostra a página; ligado, o pós no mesmo index.html; variável só do pós é geral', () => {
    const modelos = { unica: '<h1>@evento</h1><p>@hero_texto</p>', pos_unica: '<h1>@evento</h1><p>@pos_texto</p>' };
    const base = { formato: 'unica' as const, modelos, gerais: { evento: 'Chef', hero_texto: 'Vem aí', pos_texto: 'Obrigado!' } };
    const antes = gerar(base).paginas;
    expect(antes).toHaveLength(1);
    expect(antes[0].html).toContain('Vem aí');
    expect(antes[0].pos).toBeUndefined();
    const depois = gerar({ ...base, pos: { ativos: ['unica'] } }).paginas;
    expect(depois.map((p) => [p.arquivo, p.tipo, p.pos])).toEqual([['index.html', 'unica', true]]);
    expect(depois[0].html).toContain('<h1>Chef</h1><p>Obrigado!</p>');
    const det = detectar(modelos, 'unica');
    expect(soNoPos(det.variaveis.get('pos_texto'))).toBe(true);
    expect(soNoPos(det.variaveis.get('evento'))).toBe(false);
    expect(gerar(base).vars.pos_texto.dono).toBe('geral');
  });

  it('Y2: tapume + praça: uma praça por vez, pelo "realizado" ou todas na prévia; o tapume não muda', () => {
    const sp = linha({ cidade: 'São Paulo', status: 'aberta' });
    const rj = linha({ cidade: 'Rio', status: 'realizado' });
    const modelos = { tapume: '<p>home @cidade_1</p>', praca: '<p>praça @cidade_1 @status_1</p>', pos_praca: '<p>pós @cidade_1: @pos_texto_1</p>' };
    const g = (pos?: object) => gerar({ formato: 'tapume_praca', modelos, cidades: [{ ...sp, pos_texto: 'fotos SP' }, rj], pos }).paginas;
    const ativa = g({ ativos: [sp._id] });
    expect(ativa.find((p) => p.arquivo === 'sao-paulo.html')!.html).toContain('pós São Paulo: fotos SP');
    expect(ativa.find((p) => p.arquivo === 'rio.html')!.html).toContain('praça Rio');
    expect(ativa.find((p) => p.tipo === 'tapume')!.html).toContain('home');
    const real = g({ comRealizado: true });
    expect(real.find((p) => p.arquivo === 'rio.html')!.pos).toBe(true);
    expect(real.find((p) => p.arquivo === 'sao-paulo.html')!.pos).toBeUndefined();
    expect(g({ previa: true }).filter((p) => p.pos).map((p) => p.arquivo)).toEqual(['sao-paulo.html', 'rio.html']);
    expect(gerar({ formato: 'tapume_praca', modelos, cidades: [sp] }).vars.pos_texto.dono).toBe('cidade');
  });

  it('Y3: pós ligado numa cidade "em breve" abre no site (não leva para a home)', () => {
    const c = linha({ cidade: 'Rio' });
    const r = gerar({ formato: 'tapume_praca', modelos: { tapume: '<p>x</p>', praca: '<p>@status_1</p><!-- @se status = em breve -->b<!-- @fim -->', pos_praca: '<p>pós</p>' }, cidades: [c], fecharEmBreve: true, pos: { ativos: [c._id] } });
    const p = r.paginas.find((x) => x.tipo === 'praca')!;
    expect(p.fechada).toBeUndefined();
    expect(p.html).toContain('pós');
  });

  it('Y4: tapume + praça + etapa: pós por etapa; variável só do pós da etapa é da etapa; sem HTML de pós, nada muda', () => {
    const c = linha({ cidade: 'Rio' });
    const e1 = { ...linha({ etapa: 'Verão', pos_resultado: '1º lugar' }), _cidade: c._id };
    const e2 = { ...linha({ etapa: 'Inverno' }), _cidade: c._id };
    const modelos = { tapume: '<p>t</p>', praca: '<p>@cidade_1</p>', etapa: '<p>etapa @etapa_1</p>', pos_etapa: '<p>pós @etapa_1 @pos_resultado_1</p>' };
    const r = gerar({ formato: 'tapume_etapa_praca', modelos, cidades: [c], etapas: [e1, e2], pos: { ativos: [e1._id] } });
    expect(r.paginas.find((p) => p.etapaId === e1._id)!.html).toContain('pós Verão 1º lugar');
    expect(r.paginas.find((p) => p.etapaId === e2._id)!.html).toContain('etapa Inverno');
    expect(r.vars.pos_resultado.dono).toBe('etapa');
    const sem = gerar({ formato: 'tapume_etapa_praca', modelos: { ...modelos, pos_etapa: undefined }, cidades: [c], etapas: [e1], pos: { ativos: [e1._id] } });
    expect(sem.paginas.some((p) => p.pos)).toBe(false);
  });

  it('Y5: mídia do pós-evento fica em _media/pos/<seção>/', () => {
    const det = detectar({ unica: '<p>x</p>', pos_unica: '<img src="@img_resultados_podio">' }, 'unica');
    expect(pastasMidia('img_resultados_podio', det)).toContain('_media/pos/resultados/');
  });
});
