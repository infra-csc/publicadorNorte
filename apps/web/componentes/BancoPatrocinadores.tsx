'use client';
// Patrocínios: o cadastro geral de patrocinadores (um só para todos os sites), em cards.
// Clicar num card mostra onde o logo aparece (evento, página e cota) com edição rápida.
// Nada aqui publica: os eventos publicados afetados ficam com "atualização pendente".
import { TAMANHOS, type Tamanho } from '@norte/motor';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { AplicacaoPatrocinador, BancoPatrocinios, PatrocinadorBanco, UsoPatrocinadores } from '@/lib/comum/tipos';
import { api, ErroApi, json } from './api';
import { ehImagemLogo, novoPatrocinador, porNome, subirLogo, urlLogo } from './patrocinadores';

type Dados = { banco: BancoPatrocinios; versao: string; uso: UsoPatrocinadores };
type Salvar = (fn: (b: BancoPatrocinios) => void) => Promise<void>;

const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** clique dentro de campo ou botão não abre/fecha o card */
const ehControle = (t: EventTarget) => t instanceof Element && !!t.closest('input, select, button, label, a, textarea');

/** logo solto na página, esperando nome e link antes de entrar no cadastro */
type Rascunho = { id: string; arquivo: File; previa: string; nome: string; url: string; msg: string };

/** "patrocinador_xpto-2025.png" → "patrocinador xpto 2025" */
const nomeDoArquivo = (f: string) => f.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
const novoRascunho = (f: File): Rascunho => ({ id: crypto.randomUUID(), arquivo: f, previa: URL.createObjectURL(f), nome: nomeDoArquivo(f.name), url: '', msg: '' });
const problemaRascunho = (r: Rascunho) =>
  !r.nome.trim() ? 'O nome é obrigatório.' : r.url.trim() && !/^https?:\/\//i.test(r.url.trim()) ? 'O link precisa começar com https://' : '';

function CardRascunho({ r, mudar, tirar, cadastrar, ocupado }: { r: Rascunho; mudar: (m: Partial<Rascunho>) => void; tirar: () => void; cadastrar: () => void; ocupado: boolean }) {
  return (
    <div className="banco-card aberto rascunho" style={{ cursor: 'default' }}>
      <label className="banco-logo" style={{ cursor: 'pointer' }} title="Trocar a imagem">
        <img src={r.previa} alt="" />
        <input type="file" accept="image/*" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!ehImagemLogo(f.name)) return mudar({ msg: 'O logo precisa ser uma imagem (svg, png, webp ou jpg).' });
          URL.revokeObjectURL(r.previa);
          mudar({ arquivo: f, previa: URL.createObjectURL(f), msg: '' });
        }} />
      </label>
      <input className={'inp nome' + (r.msg === 'O nome é obrigatório.' ? ' erro' : '')} placeholder="Nome (obrigatório)" aria-label="Nome (obrigatório)" value={r.nome} disabled={ocupado}
        onChange={(e) => mudar({ nome: e.target.value, msg: '' })} onKeyDown={(e) => e.key === 'Enter' && cadastrar()} />
      <input className={'inp mono' + (r.msg.startsWith('O link') ? ' erro' : '')} placeholder="Link (opcional) https://…" aria-label="Link (opcional)" value={r.url} disabled={ocupado}
        onChange={(e) => mudar({ url: e.target.value, msg: '' })} onKeyDown={(e) => e.key === 'Enter' && cadastrar()} />
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm pri" type="button" disabled={ocupado} onClick={cadastrar}>Cadastrar</button>
        <button className="btn sm ghost" type="button" disabled={ocupado} onClick={tirar}>Descartar</button>
      </div>
      {r.msg && <p className="small" style={{ color: r.msg.endsWith('…') ? 'var(--mute)' : 'var(--bad)' }}>{r.msg}</p>}
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
  const [rascunhos, setRascunhos] = useState<Rascunho[]>([]);
  const [enviando, setEnviando] = useState<Set<string>>(new Set());
  const [arrastando, setArrastando] = useState(false);
  const profundidade = useRef(0);
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

  /** imagens soltas ou escolhidas viram rascunhos (um por imagem) */
  function receber(arquivos: FileList | File[] | null | undefined) {
    const todos = [...(arquivos || [])];
    const imagens = todos.filter((f) => ehImagemLogo(f.name));
    if (todos.length > imagens.length) setErro(`${todos.length - imagens.length} arquivo(s) ignorado(s): só imagens (svg, png, webp ou jpg).`);
    else setErro('');
    if (imagens.length) setRascunhos((rs) => [...rs, ...imagens.map(novoRascunho)]);
  }
  const mudarRascunho = (id: string, m: Partial<Rascunho>) => setRascunhos((rs) => rs.map((r) => (r.id === id ? { ...r, ...m } : r)));
  function tirarRascunho(id: string) {
    setRascunhos((rs) => {
      const r = rs.find((x) => x.id === id);
      if (r) URL.revokeObjectURL(r.previa);
      return rs.filter((x) => x.id !== id);
    });
  }
  /** sobe os logos e grava todos no cadastro de uma vez */
  async function cadastrar(ids: string[]) {
    const alvo = rascunhos.filter((r) => ids.includes(r.id));
    let ok = true;
    for (const r of alvo) { const p = problemaRascunho(r); if (p) { mudarRascunho(r.id, { msg: p }); ok = false; } }
    if (!ok || !alvo.length) return;
    setEnviando((s) => new Set([...s, ...ids]));
    const prontos: { r: Rascunho; logo: Awaited<ReturnType<typeof subirLogo>> }[] = [];
    for (const r of alvo) {
      mudarRascunho(r.id, { msg: 'Enviando o logo…' });
      try { prontos.push({ r, logo: await subirLogo(r.nome, r.arquivo) }); } catch (e) { mudarRascunho(r.id, { msg: (e as Error).message }); }
    }
    if (prontos.length) {
      prontos.forEach(({ r }) => mudarRascunho(r.id, { msg: 'Salvando…' }));
      try {
        await salvar((b) => { for (const { r, logo } of prontos) b.patrocinadores.push(novoPatrocinador(b, { nome: r.nome, url: r.url, ...logo })); });
        prontos.forEach(({ r }) => tirarRascunho(r.id));
      } catch (e) {
        prontos.forEach(({ r }) => mudarRascunho(r.id, { msg: (e as Error).message }));
      }
    }
    setEnviando((s) => new Set([...s].filter((id) => !ids.includes(id))));
  }

  if (!dados) return <p className="muted">{erro || 'Carregando os patrocínios…'}</p>;
  const { banco, uso } = dados;
  const lista = banco.patrocinadores.filter((p) => semAcento(p.nome).includes(semAcento(busca))).sort(porNome);
  const temArquivos = (e: React.DragEvent) => e.dataTransfer.types.includes('Files');

  return (
    <div
      className={'patro-solta' + (arrastando ? ' ativa' : '')}
      onDragEnter={(e) => { if (temArquivos(e)) { e.preventDefault(); profundidade.current++; setArrastando(true); } }}
      onDragOver={(e) => { if (temArquivos(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
      onDragLeave={(e) => { if (temArquivos(e) && --profundidade.current <= 0) { profundidade.current = 0; setArrastando(false); } }}
      onDrop={(e) => { if (!temArquivos(e)) return; e.preventDefault(); profundidade.current = 0; setArrastando(false); receber(e.dataTransfer.files); }}
    >
      {arrastando && <div className="patro-solta-aviso">Solte os logos: cada imagem vira um patrocinador</div>}
      <div className="head">
        <h1>Patrocínios</h1>
        <p>Um cadastro só para todos os sites. Arraste vários logos de uma vez para a página. Clique num patrocinador para ver em que eventos e páginas ele aparece e mudar a cota por ali.</p>
      </div>
      {erro && <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>}
      <div className="row between">
        <span className="small muted">{banco.patrocinadores.length} patrocinador(es)</span>
        <span className="row" style={{ gap: 8 }}>
          {rascunhos.length > 1 && (
            <button className="btn sm pri" type="button" disabled={enviando.size > 0} onClick={() => cadastrar(rascunhos.map((r) => r.id))}>
              {enviando.size ? 'Cadastrando…' : `Cadastrar todos (${rascunhos.length})`}
            </button>
          )}
          <input className="inp" style={{ width: 240 }} placeholder="Buscar…" aria-label="Buscar patrocinador" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </span>
      </div>
      <div className="banco-grade">
        <label className="banco-card novo" title="Escolher imagens (pode ser várias)">
          <span>+ Novos patrocinadores</span>
          <span className="small muted" style={{ fontWeight: 400, textAlign: 'center' }}>Arraste os logos para cá<br />ou clique para escolher (pode ser vários)</span>
          <input type="file" accept="image/*" multiple hidden onChange={(e) => { receber(e.target.files); e.target.value = ''; }} />
        </label>
        {rascunhos.map((r) => (
          <CardRascunho key={r.id} r={r} ocupado={enviando.has(r.id)} mudar={(m) => mudarRascunho(r.id, m)} tirar={() => tirarRascunho(r.id)} cadastrar={() => cadastrar([r.id])} />
        ))}
        {lista.map((p) => (
          <Fragment key={p.id}>
            <Card p={p} usos={uso[p.id] || []} aberto={aberto === p.id} abrir={() => setAberto(aberto === p.id ? null : p.id)} salvar={salvar} />
            {aberto === p.id && <OndeAparece p={p} usos={uso[p.id] || []} recarregar={ler} />}
          </Fragment>
        ))}
        {!lista.length && busca && <p className="muted small">Nenhum patrocinador com esse nome.</p>}
      </div>
    </div>
  );
}
