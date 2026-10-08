'use client';
// Patrocínios: o cadastro geral de patrocinadores (um só para todos os sites), em cards.
// Clicar num card mostra onde o logo aparece (evento, página e cota) com edição rápida.
// Nada aqui publica: os eventos publicados afetados ficam com "atualização pendente".
import { TAMANHOS, type Tamanho } from '@norte/motor';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { AplicacaoPatrocinador, BancoPatrocinios, PatrocinadorBanco, UsoPatrocinadores } from '@/lib/comum/tipos';
import { api, ErroApi, json } from './api';
import { novoPatrocinador, porNome, subirLogo, urlLogo } from './patrocinadores';

type Dados = { banco: BancoPatrocinios; versao: string; uso: UsoPatrocinadores };
type Salvar = (fn: (b: BancoPatrocinios) => void) => Promise<void>;

const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** clique dentro de campo ou botão não abre/fecha o card */
const ehControle = (t: EventTarget) => t instanceof Element && !!t.closest('input, select, button, label, a, textarea');

function NovoCard({ salvar, fechar }: { salvar: Salvar; fechar: () => void }) {
  const [nome, setNome] = useState('');
  const [url, setUrl] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const previa = arquivo ? URL.createObjectURL(arquivo) : '';
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);
  async function criar() {
    if (!nome.trim()) return setMsg('O nome é obrigatório.');
    if (!arquivo) return setMsg('Escolha o logo.');
    setMsg('Salvando…');
    try {
      const logo = await subirLogo(nome, arquivo);
      await salvar((b) => { b.patrocinadores.push(novoPatrocinador(b, { nome, url, ...logo })); });
      fechar();
    } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <div className="banco-card aberto" style={{ cursor: 'default' }}>
      <label className="banco-logo" style={{ cursor: 'pointer' }} title="Escolher o logo">
        {previa ? <img src={previa} alt="" /> : <span className="small muted">+ Logo (SVG ou PNG)</span>}
        <input type="file" accept="image/*" hidden onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
      </label>
      <input className={'inp nome' + (msg === 'O nome é obrigatório.' ? ' erro' : '')} autoFocus placeholder="Nome (obrigatório)" aria-label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <input className="inp mono" placeholder="Link (opcional) https://…" aria-label="Link" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm pri" type="button" onClick={criar}>Cadastrar</button>
        <button className="btn sm ghost" type="button" onClick={fechar}>Cancelar</button>
      </div>
      {msg && <p className="small" style={{ color: msg === 'Salvando…' ? 'var(--mute)' : 'var(--bad)' }}>{msg}</p>}
    </div>
  );
}

function Card({ p, usos, aberto, abrir, salvar }: { p: PatrocinadorBanco; usos: UsoPatrocinadores[string]; aberto: boolean; abrir: () => void; salvar: Salvar }) {
  const [nome, setNome] = useState(p.nome);
  const [url, setUrl] = useState(p.url);
  const [msg, setMsg] = useState('');
  useEffect(() => { setNome(p.nome); setUrl(p.url); }, [p.nome, p.url]);
  const mudar = (fn: (x: PatrocinadorBanco) => void) => salvar((b) => { const x = b.patrocinadores.find((y) => y.id === p.id); if (x) fn(x); });
  const aplicacoes = usos.reduce((n, u) => n + u.aplicacoes.length, 0);

  async function gravarNome() {
    const v = nome.trim();
    if (!v) { setMsg('O nome é obrigatório.'); setNome(p.nome); return; }
    setMsg('');
    if (v !== p.nome) await mudar((x) => { x.nome = v; }).catch(() => setNome(p.nome));
  }
  async function gravarUrl() {
    const v = url.trim();
    if (v && !/^https?:\/\//i.test(v)) { setMsg('O link precisa começar com https://'); return; }
    setMsg('');
    if (v !== p.url) await mudar((x) => { x.url = v; }).catch(() => setUrl(p.url));
  }
  async function trocarLogo(f: File | undefined) {
    if (!f) return;
    setMsg('Enviando o logo…');
    try { const logo = await subirLogo(p.nome, f); await mudar((x) => Object.assign(x, logo)); setMsg(''); } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div className={'banco-card' + (p.ativo ? '' : ' inativo') + (aberto ? ' aberto' : '')} onClick={(e) => { if (!ehControle(e.target)) abrir(); }}
      role="group" aria-label={p.nome}>
      <div className="banco-logo"><img src={urlLogo(p)} alt="" loading="lazy" /></div>
      <input className="inp nome" aria-label="Nome (obrigatório)" value={nome} onChange={(e) => setNome(e.target.value)} onBlur={gravarNome} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      <input className="inp mono" aria-label="Link (opcional)" placeholder="Link (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={gravarUrl} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      {msg && <span className="small" style={{ color: msg.startsWith('Enviando') ? 'var(--mute)' : 'var(--bad)' }}>{msg}</span>}
      <button type="button" className="small" style={{ all: 'unset', cursor: 'pointer', color: usos.length ? 'var(--accent)' : 'var(--mute)', fontSize: 13 }} onClick={abrir} aria-expanded={aberto}>
        {usos.length ? `Em ${usos.length} evento(s), ${aplicacoes} página(s) ${aberto ? '▴' : '▾'}` : 'Não usado em nenhum evento'}
        {!p.ativo && ' · desativado'}
      </button>
      <div className="row" style={{ gap: 6 }}>
        <label className="btn sm ghost">Trocar logo<input type="file" accept="image/*" hidden onChange={(e) => trocarLogo(e.target.files?.[0])} /></label>
        <button className="btn sm ghost" type="button" onClick={() => mudar((x) => { x.ativo = !x.ativo; })}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
        {!usos.length && <button className="btn sm ghost danger" type="button" onClick={() => { if (confirm(`Apagar ${p.nome} do cadastro?`)) salvar((b) => { b.patrocinadores = b.patrocinadores.filter((y) => y.id !== p.id); }); }}>Apagar</button>}
      </div>
    </div>
  );
}

/** onde o logo aparece, com troca de cota/tamanho e retirada (não publica) */
function OndeAparece({ p, usos, recarregar }: { p: PatrocinadorBanco; usos: UsoPatrocinadores[string]; recarregar: () => Promise<unknown> }) {
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState(false);

  async function editar(slug: string, a: AplicacaoPatrocinador, pedido: { acao: 'cota' | 'tamanho' | 'remover'; cota?: string; tamanho?: Tamanho | '' }) {
    setOcupado(slug + a.pagina);
    setErro('');
    try {
      await api(`/api/eventos/${slug}/patrocinios`, json('PATCH', { pagina: a.pagina, patrocinador: p.id, nome: p.nome, ...pedido }));
      await recarregar();
      setFeito(true);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado('');
    }
  }

  return (
    <div className="onde">
      <div className="row between">
        <b>Onde {p.nome} aparece</b>
        <span className="small muted">As mudanças aqui não publicam o site: o evento fica com “atualização pendente”.</span>
      </div>
      {erro && <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>}
      {feito && <div className="w-item info"><span className="ic">✓</span><div>Salvo. Os eventos já publicados mudam no ar só quando forem publicados de novo.</div></div>}
      {!usos.length && <p className="small muted">Este logo ainda não está em nenhum evento. Para usar, abra o evento e vá em Patrocínios.</p>}
      {usos.map((u) => (
        <div key={u.slug} className="onde-ev">
          <div className="row" style={{ gap: 8 }}>
            <b>{u.nome}</b>
            {u.publicado ? <span className="pill ok">no ar</span> : <span className="pill">rascunho</span>}
            {u.pendente && <span className="pill warn">atualização pendente</span>}
            <Link className="small" href={`/eventos/${u.slug}/patrocinios`} style={{ marginLeft: 'auto' }}>Abrir no evento →</Link>
          </div>
          {u.aplicacoes.map((a) => {
            const ocupada = ocupado === u.slug + a.pagina;
            return (
              <div key={a.pagina + a.bloco} className="onde-pg" style={{ opacity: ocupada ? 0.5 : 1 }}>
                <span>{a.nomePagina}</span>
                <select className="inp" aria-label={`Cota em ${a.nomePagina}`} value={a.cota} disabled={!!ocupado} onChange={(e) => editar(u.slug, a, { acao: 'cota', cota: e.target.value })}>
                  {!u.cotas.some((c) => c.id === a.cota) && <option value={a.cota}>{a.cotaNome}</option>}
                  {u.cotas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <select className="inp" aria-label={`Tamanho em ${a.nomePagina}`} value={a.tamanho} disabled={!!ocupado} onChange={(e) => editar(u.slug, a, { acao: 'tamanho', tamanho: e.target.value as Tamanho | '' })}>
                  <option value="">{a.tamanhoCota} (da cota)</option>
                  {TAMANHOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button className="btn sm ghost danger" type="button" disabled={!!ocupado} onClick={() => { if (confirm(`Tirar ${p.nome} de ${a.nomePagina} (${u.nome})?`)) editar(u.slug, a, { acao: 'remover' }); }}>Tirar</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BancoPatrocinadores() {
  const [dados, setDados] = useState<Dados | null>(null);
  const ref = useRef<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const ler = useCallback(() => api<Dados>('/api/patrocinadores').then((d) => { ref.current = d; setDados(d); return d; }), []);
  useEffect(() => { ler().catch((e) => setErro(e.message)); }, [ler]);

  /** muda e grava o cadastro (o servidor marca os eventos publicados afetados como pendentes) */
  const salvar = useCallback<Salvar>(async (fn) => {
    setErro('');
    for (let tentativa = 0; ; tentativa++) {
      const atual = ref.current!;
      const novoBanco = structuredClone(atual.banco);
      fn(novoBanco);
      try {
        const r = await api<{ versao: string }>('/api/patrocinadores', json('PUT', { banco: novoBanco, versao: atual.versao }));
        ref.current = { ...atual, banco: novoBanco, versao: r.versao };
        setDados(ref.current);
        ler().catch(() => {}); // atualiza o uso e as pendências
        return;
      } catch (e) {
        if (e instanceof ErroApi && e.status === 409 && tentativa < 2) { await ler(); continue; }
        setErro((e as Error).message);
        throw e;
      }
    }
  }, [ler]);

  if (!dados) return <p className="muted">{erro || 'Carregando os patrocínios…'}</p>;
  const { banco, uso } = dados;
  const lista = banco.patrocinadores.filter((p) => semAcento(p.nome).includes(semAcento(busca))).sort(porNome);

  return (
    <>
      <div className="head">
        <h1>Patrocínios</h1>
        <p>Um cadastro só para todos os sites. Clique num patrocinador para ver em que eventos e páginas ele aparece e mudar a cota por ali.</p>
      </div>
      {erro && <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>}
      <div className="row between">
        <span className="small muted">{banco.patrocinadores.length} patrocinador(es)</span>
        <input className="inp" style={{ width: 240 }} placeholder="Buscar…" aria-label="Buscar patrocinador" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="banco-grade">
        {novo ? <NovoCard salvar={salvar} fechar={() => setNovo(false)} /> : (
          <button className="banco-card novo" type="button" onClick={() => setNovo(true)}>+ Novo patrocinador</button>
        )}
        {lista.map((p) => (
          <Fragment key={p.id}>
            <Card p={p} usos={uso[p.id] || []} aberto={aberto === p.id} abrir={() => setAberto(aberto === p.id ? null : p.id)} salvar={salvar} />
            {aberto === p.id && <OndeAparece p={p} usos={uso[p.id] || []} recarregar={ler} />}
          </Fragment>
        ))}
        {!lista.length && busca && <p className="muted small">Nenhum patrocinador com esse nome.</p>}
      </div>
    </>
  );
}
