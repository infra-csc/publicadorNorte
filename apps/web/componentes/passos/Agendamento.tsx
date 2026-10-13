'use client';
// Publicação agendada: na data e hora marcadas, o publicador publica o que estiver salvo no teste e, se marcado,
// leva para a produção (lib/servidor/automacao.ts, rodada pelo cron a cada 5 minutos).
import { useEffect, useState } from 'react';
import type { Evento, EventoCompleto } from '@/lib/comum/tipos';
import { api, json } from '../api';
import { useEditor } from '../Editor';

const pad = (n: number) => String(n).padStart(2, '0');
/** Date → valor do <input type="datetime-local"> (hora deste computador) */
const paraCampo = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dataHora = (iso: string) => { const t = new Date(iso).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }); return t.charAt(0).toUpperCase() + t.slice(1); };
const fuso = () => {
  const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return z === 'America/Sao_Paulo' ? 'horário de Brasília' : `fuso ${z}`;
};

export function SecaoAgendamento({ bloqueado, ocupadoFora }: { bloqueado: boolean; ocupadoFora: boolean }) {
  const { evento, salvarJa, substituir } = useEditor();
  const ag = evento.agendamento;
  const ult = evento.ultimoAgendamento;
  const dominio = evento.producao?.dominios[0];
  const [quando, setQuando] = useState('');
  const [producao, setProducao] = useState(true);
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [agora, setAgora] = useState(() => Date.now());
  const url = `/api/hotsites/${evento.slug}/agendar`;
  const passou = !!ag && Date.parse(ag.em) <= agora;

  // relógio da tela; passada a hora, acompanha até a automação publicar e traz o evento novo
  useEffect(() => {
    if (!ag) return;
    const t = setInterval(async () => {
      setAgora(Date.now());
      if (Date.parse(ag.em) > Date.now()) return;
      const r = await api<EventoCompleto>(`/api/hotsites/${evento.slug}`).catch(() => null);
      if (r && !r.evento.agendamento) substituir(r.evento, r.versao);
    }, passou ? 20_000 : 30_000);
    return () => clearInterval(t);
  }, [ag, passou, evento.slug, substituir]);

  async function enviar(metodo: 'POST' | 'DELETE', rotulo: string) {
    setErro('');
    setOcupado(rotulo);
    try {
      await salvarJa();
      const corpo = metodo === 'POST' ? { em: new Date(quando).toISOString(), producao: producao && !!dominio } : {};
      const r = await api<{ evento: Evento; versao: string }>(url, json(metodo, corpo));
      substituir(r.evento, r.versao);
      setQuando('');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado('');
    }
  }

  const minimo = paraCampo(new Date(Date.now() + 5 * 60_000));
  return (
    <section className="card stack agenda">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Publicação agendada</h2>
          <p className="small muted" style={{ margin: 0 }}>Na data e hora marcadas, o site é publicado sozinho com o que estiver salvo no cadastro naquele momento.</p>
        </div>
        {ag && <span className={'pill ' + (passou ? 'warn' : 'ok')}>{passou ? 'Publicando…' : 'Agendado'}</span>}
      </div>

      {ag ? (
        <div className="agenda__marcado">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <div style={{ flex: 1 }}>
            <b>{dataHora(ag.em)}</b>
            <span className="small muted"> ({fuso()})</span>
            <p className="small" style={{ margin: 0 }}>
              {ag.producao ? <>Publica no <b>teste</b> e leva para a <b>produção</b> ({dominio || 'sem domínio: só o teste'}).</> : <>Publica só no <b>teste</b>.</>}
              {passou ? ' A hora chegou: o site sai em até 5 minutos.' : ' Pode sair até 5 minutos depois do horário.'}
            </p>
          </div>
          {!passou && <button className="btn sm ghost" type="button" disabled={!!ocupado || ocupadoFora} onClick={() => enviar('DELETE', 'Cancelando…')}>{ocupado || 'Cancelar'}</button>}
        </div>
      ) : (
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="f" style={{ flex: '0 1 240px' }}>Data e hora <small>{fuso()}</small>
            <input className="inp" type="datetime-local" min={minimo} value={quando} onChange={(e) => setQuando(e.target.value)} />
          </label>
          <label className="agenda__prod">
            <input type="checkbox" checked={producao && !!dominio} disabled={!dominio} onChange={(e) => setProducao(e.target.checked)} />
            <span>Levar também para a produção{dominio ? <> (<b>{dominio}</b>)</> : <small className="muted"> (precisa de domínio, acima)</small>}</span>
          </label>
          <button className="btn pri" type="button" disabled={!quando || !!ocupado || ocupadoFora} onClick={() => enviar('POST', 'Agendando…')}>{ocupado || 'Agendar'}</button>
        </div>
      )}

      {bloqueado && <div className="w-item warn"><span className="ic">!</span><div><b>Hoje este site não pode ser publicado</b>Resolva os itens do passo Conferir antes da hora marcada, senão o agendamento não publica.</div></div>}
      {erro && <div className="w-item bad"><span className="ic">✕</span><div><b>Não deu para agendar</b>{erro}</div></div>}
      {!ag && ult && (
        <div className={'w-item ' + (ult.ok ? 'ok' : 'bad')}>
          <span className="ic">{ult.ok ? '✓' : '✕'}</span>
          <div><b>Último agendamento · {new Date(ult.em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</b>{ult.mensagem}</div>
        </div>
      )}
    </section>
  );
}
