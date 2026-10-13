// Automação: publicação agendada (teste e produção) e modo automático, com armazenamento e destino em memória
import { describe, expect, it } from 'vitest';
import type { Evento, EventoCompleto, ResumoEvento } from '@/lib/comum/tipos';
import type { Armazenamento } from './armazenamento';
import { BANCO_VAZIO } from './armazenamento';
import type { DestinoPublicacao } from './destino';
import { rodarAutomacao } from './automacao';

const AGORA = new Date('2026-10-14T12:00:00Z');

function evento(extra: Partial<Evento> = {}): Evento {
  return {
    id: 'x', slug: 'chef', nome: 'Chef', formato: 'unica', paginas: {}, vars: {}, gerais: { titulo: 'Oi' }, cidades: [], etapas: [], ordem: {}, imagens: {}, baseUrl: '',
    publicacoes: [], versaoAtiva: null, criadoEm: '', atualizadoEm: '', ...extra,
  } as Evento;
}

function memoria(e: Evento, modelos: Record<string, string> = { unica: '<h1>@titulo</h1>' }) {
  let atual: Evento = structuredClone(e);
  const publicados: number[] = [];
  const gravar = (fn: (e: Evento) => void) => { const n = structuredClone(atual); fn(n); atual = n; return { evento: n, versao: 'v' }; };
  const arm = {
    listar: async (): Promise<ResumoEvento[]> => [{ slug: atual.slug, nome: atual.nome, formato: atual.formato, cidades: 0, atualizadoEm: '', url: null, pendente: false, agendado: atual.agendamento?.em || null, automatico: !!atual.automacao?.ativo }],
    ler: async (): Promise<EventoCompleto> => ({ evento: structuredClone(atual), modelos, arquivos: [], versao: 'v' } as unknown as EventoCompleto),
    lerBanco: async () => ({ banco: BANCO_VAZIO(), versao: '' }),
    atualizar: async (_s: string, fn: (e: Evento) => void) => gravar(fn),
    atualizarProducao: async (_s: string, fn: (e: Evento) => void) => gravar(fn),
  } as unknown as Armazenamento;
  const dest = {
    publicar: async (_s: string, v: number) => { publicados.push(v); return { commit: 'c' + v }; },
    url: async () => 'https://teste/chef/',
  } as unknown as DestinoPublicacao;
  return { arm, dest, publicados, atual: () => atual };
}

const producao = { dominios: ['chef.com.br'], versao: 1, commit: 'c1', historico: [] };
const v1 = { versao: 1, commit: 'c1', em: '', paginas: 1, avisos: 0, url: 'https://teste/chef/' };

describe('automação', () => {
  it('agendamento vencido: publica no teste e leva para a produção; o agendamento sai e o resultado fica', async () => {
    const m = memoria(evento({ publicacoes: [v1], versaoAtiva: 1, producao: { ...producao, versao: null, commit: null }, agendamento: { em: '2026-10-14T11:58:00Z', producao: true, criadoEm: '' } }));
    const r = await rodarAutomacao(m.arm, m.dest, AGORA);
    expect(m.publicados).toEqual([2]);
    expect(m.atual().producao).toMatchObject({ versao: 2, commit: 'c2' });
    expect(m.atual().agendamento).toBeUndefined();
    expect(m.atual().ultimoAgendamento).toMatchObject({ ok: true, versao: 2, mensagem: 'Versão 2 publicada no teste e na produção.' });
    expect(r[0].resultado).toContain('agendado');
  });

  it('agendamento no futuro: nada', async () => {
    const m = memoria(evento({ agendamento: { em: '2026-10-14T12:03:00Z', producao: true, criadoEm: '' } }));
    expect(await rodarAutomacao(m.arm, m.dest, AGORA)).toEqual([]);
    expect(m.publicados).toEqual([]);
    expect(m.atual().agendamento).toBeDefined();
  });

  it('só teste (ou sem domínio): a produção não muda', async () => {
    const m = memoria(evento({ publicacoes: [v1], versaoAtiva: 1, producao, agendamento: { em: '2026-10-14T11:00:00Z', producao: false, criadoEm: '' } }));
    await rodarAutomacao(m.arm, m.dest, AGORA);
    expect(m.atual().versaoAtiva).toBe(2);
    expect(m.atual().producao?.versao).toBe(2); // a produção estava na versão do teste: acompanha (como no modo automático)
    const s = memoria(evento({ agendamento: { em: '2026-10-14T11:00:00Z', producao: true, criadoEm: '' } }));
    await rodarAutomacao(s.arm, s.dest, AGORA);
    expect(s.atual().producao).toBeUndefined();
    expect(s.atual().ultimoAgendamento?.mensagem).toContain('não tem domínio');
  });

  it('não dá para publicar: o agendamento sai e o motivo fica', async () => {
    // tapume + praça sem nenhuma cidade: bloqueia
    const m = memoria(evento({ formato: 'tapume_praca', agendamento: { em: '2026-10-14T11:00:00Z', producao: true, criadoEm: '' } }), { tapume: '<p>x</p>', praca: '<p>@cidade</p>' });
    const r = await rodarAutomacao(m.arm, m.dest, AGORA);
    expect(m.publicados).toEqual([]);
    expect(m.atual().agendamento).toBeUndefined();
    expect(m.atual().ultimoAgendamento).toMatchObject({ ok: false });
    expect(r[0].resultado).toContain('não publicou');
  });
});
