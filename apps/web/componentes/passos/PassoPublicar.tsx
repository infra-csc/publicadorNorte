'use client';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import type { Evento, Publicacao } from '@/lib/comum/tipos';
import type { EstadoSite } from '@/lib/servidor/destino';
import { api } from '../api';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { Avisos } from './PassoConferir';

const quando = (iso: string) => {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
};

export function PassoPublicar() {
  const { evento, modelos, arquivos, salvarJa, substituir, banco } = useEditor();
  const ev = useDeferredValue(evento);
  const r = useMemo(() => gerarEvento(ev, modelos, arquivos, banco), [ev, modelos, arquivos, banco]);
  const [site, setSite] = useState<EstadoSite | null>(null);
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [esperando, setEsperando] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const ativa = evento.publicacoes.find((p) => p.versao === evento.versaoAtiva);

  const lerSite = () => api<EstadoSite>('/api/site').then(setSite, (e) => setErro(e.message));
  useEffect(() => { lerSite(); }, []);

  // depois de publicar, acompanha o GitHub Pages até o site novo estar no ar
  useEffect(() => {
    if (!esperando) return;
    const t = setInterval(async () => {
      const s = await api<EstadoSite>('/api/site').catch(() => null);
      if (!s) return;
      setSite(s);
      if (s.situacao === 'no-ar' && s.commit === esperando) setEsperando(null);
      if (s.situacao === 'erro') setEsperando(null);
    }, 5000);
    return () => clearInterval(t);
  }, [esperando]);

  async function publicar() {
    setErro('');
    setOcupado('Salvando…');
    try {
      await salvarJa();
      setOcupado('Publicando…');
      const res = await api<{ publicacao: Publicacao; evento: Evento; versao: string }>(`/api/hotsites/${evento.slug}/publicar`, { method: 'POST' });
      substituir(res.evento, res.versao);
      setEsperando(res.publicacao.commit);
      lerSite();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado('');
    }
  }

  async function voltar(v: number) {
    setConfirmar(null);
    setErro('');
    setOcupado('Voltando…');
    try {
      await salvarJa();
      const res = await api<{ evento: Evento; versao: string }>(`/api/hotsites/${evento.slug}/publicacoes/${v}`, { method: 'POST' });
      substituir(res.evento, res.versao);
      const s = await api<EstadoSite>('/api/site').catch(() => null);
      if (s) setSite(s);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado('');
    }
  }

  async function baixarZip() {
    await salvarJa();
    location.href = `/api/hotsites/${evento.slug}/zip`;
  }

  const hist = [...evento.publicacoes].reverse();
  return (
    <>
      <Cabecalho passo="publicar" titulo="Publicar">Gera todas as páginas com o que está salvo e coloca o site no ar. Cada publicação vira uma versão: dá para voltar para uma anterior.</Cabecalho>

      {ativa && (
        <section className="card stack">
          <div className="row between">
            <div>
              <span className="eyebrow">No ar · versão {ativa.versao}</span>
              <p style={{ fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}><a href={ativa.url} target="_blank" rel="noreferrer">{ativa.url}</a></p>
            </div>
            {esperando ? <span className="pill warn">Atualizando o site… (cerca de 1 minuto)</span> : site?.situacao === 'erro' ? <span className="pill bad">O GitHub não conseguiu atualizar</span> : site?.ligado ? <span className="pill ok">No ar</span> : null}
          </div>
        </section>
      )}

      {site && !site.ligado && evento.publicacoes.length > 0 && (
        <section className="card stack">
          <b>Falta ligar o site no GitHub (só uma vez)</b>
          <ol className="passos-num">
            <li>Abra o repositório no GitHub e clique em <b>Settings</b>.</li>
            <li>No menu da esquerda, clique em <b>Pages</b>.</li>
            <li>Em <b>Build and deployment → Source</b>, deixe <b>Deploy from a branch</b>.</li>
            <li>Em <b>Branch</b>, escolha <b>gh-pages</b> e a pasta <b>/ (root)</b>. Clique em <b>Save</b>.</li>
            <li>Espere 1 ou 2 minutos e clique em “Conferir de novo”.</li>
          </ol>
          <div><button className="btn sm" type="button" onClick={lerSite}>Conferir de novo</button></div>
        </section>
      )}

      <section className="card stack">
        <div className="row between">
          <div>
            <h2 style={{ fontSize: 20 }}>{r.paginas.length} página(s)</h2>
            <p className="small muted">As páginas e só os arquivos de mídia que elas usam, nos mesmos caminhos do HTML.</p>
          </div>
          <span className="row">
            <button className="btn ghost" type="button" onClick={baixarZip} disabled={r.bloqueado || !r.paginas.length}>Baixar .zip</button>
            <button className="btn pri" type="button" onClick={publicar} disabled={!!ocupado || r.bloqueado || !r.paginas.length}>{ocupado || (ativa ? 'Publicar de novo' : 'Publicar')}</button>
          </span>
        </div>
        {erro && <div className="w-item bad"><span className="ic">✕</span><div><b>Não deu para publicar</b>{erro}</div></div>}
        {!!evento.pendencia?.motivos.length && (
          <div className="w-item warn"><span className="ic">!</span><div>
            <b>Atualização pendente: o site no ar ainda não tem estas mudanças</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{evento.pendencia.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
            Publique de novo para levar ao ar.
          </div></div>
        )}
        {r.bloqueado ? <Avisos avisos={r.avisos.filter((a) => a.nivel === 'bloqueia')} /> : r.avisos.length > 0 && (
          <div className="w-item warn"><span className="ic">!</span><div><b>{r.avisos.length} aviso(s) em aberto</b>Dá para publicar assim mesmo: as variáveis sem valor saem em branco. Veja no passo Conferir.</div></div>
        )}
        <ul className="files">{r.paginas.map((p) => <li key={p.arquivo}>{p.arquivo}</li>)}</ul>
      </section>

      <section className="stack">
        <span className="eyebrow">Histórico</span>
        {hist.length ? (
          <div className="card hist">
            {hist.map((h) => (
              <div key={h.versao}>
                <span><b>Versão {h.versao}</b> · {quando(h.em)} · {h.paginas} página(s){h.avisos ? ` · ${h.avisos} aviso(s)` : ''}</span>
                {h.versao === evento.versaoAtiva ? <span className="pill ok">no ar</span> : confirmar === h.versao ? (
                  <span className="row" style={{ gap: 6 }}>
                    <span className="small">O site volta a mostrar esta versão.</span>
                    <button className="btn sm pri" type="button" onClick={() => voltar(h.versao)}>Confirmar</button>
                    <button className="btn sm ghost" type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
                  </span>
                ) : <button className="btn sm" type="button" disabled={!!ocupado} onClick={() => setConfirmar(h.versao)}>Voltar para esta versão</button>}
              </div>
            ))}
          </div>
        ) : <p className="muted small">Nenhuma publicação ainda.</p>}
      </section>
      <NavPassos passo="publicar" />
    </>
  );
}
