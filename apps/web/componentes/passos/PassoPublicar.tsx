'use client';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import type { Evento, Publicacao } from '@/lib/comum/tipos';
import type { EstadoDominio } from '@/lib/servidor/cloudflare';
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
      <Cabecalho passo="publicar" titulo="Publicar">Publicar coloca o site no endereço de <b>teste</b>. Com a versão aprovada, leve-a para a <b>produção</b> (o domínio próprio do evento). Cada publicação vira uma versão: dá para voltar para uma anterior.</Cabecalho>

      {ativa && (
        <section className="card stack">
          <div className="row between">
            <div>
              <span className="eyebrow">Teste · versão {ativa.versao}</span>
              <p style={{ fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}><a href={ativa.url} target="_blank" rel="noreferrer">{ativa.url}</a></p>
            </div>
            {esperando ? <span className="pill warn">Atualizando o site… (cerca de 1 minuto)</span> : site?.situacao === 'erro' ? <span className="pill bad">O GitHub não conseguiu atualizar</span> : site?.ligado ? <span className="pill ok">No ar</span> : null}
          </div>
        </section>
      )}

      {ativa && <SecaoProducao ocupadoFora={!!ocupado} />}

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
                <span className="row" style={{ gap: 6 }}>
                {h.versao === evento.producao?.versao && <span className="pill ok">produção</span>}
                {h.versao === evento.versaoAtiva ? <span className="pill ok">teste</span> : confirmar === h.versao ? (
                  <span className="row" style={{ gap: 6 }}>
                    <span className="small">O endereço de teste volta a mostrar esta versão.</span>
                    <button className="btn sm pri" type="button" onClick={() => voltar(h.versao)}>Confirmar</button>
                    <button className="btn sm ghost" type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
                  </span>
                ) : <button className="btn sm" type="button" disabled={!!ocupado} onClick={() => setConfirmar(h.versao)}>Voltar o teste para esta versão</button>}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="muted small">Nenhuma publicação ainda.</p>}
      </section>
      <NavPassos passo="publicar" />
    </>
  );
}

type InfoDominios = { cloudflare: boolean; dominios: { dominio: string; estado: EstadoDominio; erro?: string }[] };
const ROTULO: Record<EstadoDominio, [string, string]> = {
  conectado: ['ok', 'ligado'],
  desligado: ['warn', 'falta ligar'],
  'sem-zona': ['bad', 'fora da conta da Cloudflare'],
  desconhecido: ['', 'ligação não conferida'],
};

/** produção: domínio próprio do evento, com a versão escolhida (já publicada no teste) */
function SecaoProducao({ ocupadoFora }: { ocupadoFora: boolean }) {
  const { evento, substituir, salvarJa } = useEditor();
  const p = evento.producao;
  const dominios = p?.dominios || [];
  const [info, setInfo] = useState<InfoDominios | null>(null);
  const [texto, setTexto] = useState(dominios.join(', '));
  const [editando, setEditando] = useState(!dominios.length);
  const [confirmar, setConfirmar] = useState<'levar' | 'tirar' | null>(null);
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [avisos, setAvisos] = useState<string[]>([]);
  const url = `/api/hotsites/${evento.slug}/producao`;

  useEffect(() => { api<InfoDominios>(url).then(setInfo, () => {}); }, [url]);

  async function pedir(corpo: object, rotulo: string) {
    setErro(''); setAvisos([]); setConfirmar(null); setOcupado(rotulo);
    try {
      await salvarJa();
      const r = await api<{ evento: Evento; versao: string; avisos: string[]; dominios: InfoDominios['dominios'] }>(url, { method: 'POST', body: JSON.stringify(corpo) });
      substituir(r.evento, r.versao);
      setAvisos(r.avisos || []);
      setInfo((i) => ({ cloudflare: i?.cloudflare ?? false, dominios: r.dominios }));
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setOcupado('');
    }
  }

  const lista = texto.split(/[\s,;]+/).filter(Boolean);
  const removidos = dominios.filter((d) => !lista.map((x) => x.toLowerCase()).includes(d));
  const principal = dominios[0];
  const noAr = p?.versao != null;
  const atrasada = noAr && p!.versao !== evento.versaoAtiva;
  const estado = (d: string) => info?.dominios.find((x) => x.dominio === d);
  const falta = !!info && dominios.some((d) => estado(d)?.estado !== 'conectado');
  const semZona = dominios.filter((d) => estado(d)?.estado === 'sem-zona');

  return (
    <section className="card stack">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="eyebrow">Produção{noAr ? ` · versão ${p!.versao}` : ''}</span>
          {noAr && principal ? (
            <p style={{ fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}><a href={`https://${principal}/`} target="_blank" rel="noreferrer">https://{principal}/</a></p>
          ) : <p className="muted small" style={{ margin: '4px 0 0' }}>{dominios.length ? 'Fora do ar: nenhuma versão em produção.' : 'Coloque o domínio próprio do evento para publicar em produção.'}</p>}
          {noAr && p?.em && <p className="small muted" style={{ margin: 0 }}>Desde {quando(p.em)}</p>}
        </div>
        {noAr && (atrasada ? <span className="pill warn">O teste está na versão {evento.versaoAtiva}</span> : <span className="pill ok">Igual ao teste</span>)}
      </div>

      {editando ? (
        <div className="stack" style={{ gap: 8 }}>
          <label className="small"><b>Domínio</b> (o primeiro é o principal; os outros, como o www, levam para ele)</label>
          <input className="inp mono" value={texto} placeholder="cuidar.com.br, www.cuidar.com.br" onChange={(e) => setTexto(e.target.value)} />
          {removidos.length > 0 && noAr && <div className="w-item warn"><span className="ic">!</span><div>{removidos.join(', ')} vai sair do ar.</div></div>}
          <span className="row" style={{ gap: 8 }}>
            <button className="btn sm pri" type="button" disabled={!!ocupado || ocupadoFora} onClick={async () => { if (await pedir({ acao: 'dominios', dominios: lista }, 'Salvando…')) setEditando(false); }}>{ocupado || 'Salvar domínio'}</button>
            {dominios.length > 0 && <button className="btn sm ghost" type="button" onClick={() => { setTexto(dominios.join(', ')); setEditando(false); }}>Cancelar</button>}
          </span>
        </div>
      ) : (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {dominios.map((d, i) => {
            const e = estado(d);
            const [cls, rot] = ROTULO[e?.estado || 'desconhecido'];
            return <span key={d} className="pill" title={e?.erro}>{d}{i === 0 && dominios.length > 1 ? ' (principal)' : ''}{info && <span className={'pill ' + cls} style={{ padding: '0 6px' }}>{rot}</span>}</span>;
          })}
          <button className="btn sm ghost" type="button" onClick={() => { setTexto(dominios.join(', ')); setEditando(true); }}>Mudar domínio</button>
        </div>
      )}

      {dominios.length > 0 && !editando && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {confirmar === 'levar' ? (
            <>
              <span className="small">{principal} passa a mostrar a versão {evento.versaoAtiva}, a mesma do teste.</span>
              <button className="btn sm pri" type="button" onClick={() => pedir({ acao: 'levar', versao: evento.versaoAtiva }, 'Levando…')}>Confirmar</button>
              <button className="btn sm ghost" type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
            </>
          ) : confirmar === 'tirar' ? (
            <>
              <span className="small">{principal} deixa de mostrar o site.</span>
              <button className="btn sm pri" type="button" onClick={() => pedir({ acao: 'tirar' }, 'Tirando…')}>Confirmar</button>
              <button className="btn sm ghost" type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
            </>
          ) : (
            <>
              <button className="btn pri" type="button" disabled={!!ocupado || ocupadoFora || (noAr && !atrasada)} onClick={() => setConfirmar('levar')}>{ocupado || `Levar a versão ${evento.versaoAtiva} para produção`}</button>
              {noAr && <button className="btn ghost" type="button" disabled={!!ocupado || ocupadoFora} onClick={() => setConfirmar('tirar')}>Tirar do ar</button>}
            </>
          )}
        </div>
      )}

      {erro && <div className="w-item bad"><span className="ic">✕</span><div><b>Não deu certo</b>{erro}</div></div>}
      {avisos.map((a) => <div key={a} className="w-item warn"><span className="ic">!</span><div>{a}</div></div>)}

      {falta && !editando && (
        <div className="w-item warn"><span className="ic">!</span><div>
          {info!.cloudflare ? (
            <><b>Falta ligar o domínio. </b>{semZona.length
              ? `${semZona.join(', ')} não está na conta da Cloudflare da Norte: adicione lá (Add a domain) e depois clique em “Mudar domínio” → “Salvar domínio”.`
              : 'Clique em “Mudar domínio” → “Salvar domínio” para tentar de novo.'}</>
          ) : (
            <>
              <b>Ligar o domínio na Cloudflare (uma vez por domínio)</b>
              <ol className="passos-num" style={{ margin: '6px 0 0' }}>
                <li>O domínio precisa estar na conta da Cloudflare da Norte (<b>Add a domain</b>, se ainda não estiver).</li>
                <li>Abra <b>Workers &amp; Pages</b> → <b>publicador-norte</b> → <b>Settings</b> → <b>Domains &amp; Routes</b>.</li>
                <li>Clique em <b>Add</b> → <b>Custom domain</b> e digite {dominios.map((d, i) => <span key={d}>{i ? ' e ' : ''}<b>{d}</b></span>)}, um de cada vez.</li>
                <li>A Cloudflare cria o DNS e o certificado sozinha. Em alguns minutos o site abre no domínio.</li>
              </ol>
            </>
          )}
        </div></div>
      )}
    </section>
  );
}
