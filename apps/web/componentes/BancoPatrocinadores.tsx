'use client';
// Patrocínios: o cadastro geral de patrocinadores (um só para todos os sites), em cards.
// Clicar num card mostra onde o logo aparece (evento, página e cota) com edição rápida.
// Nada aqui publica: os eventos publicados afetados ficam com "atualização pendente".
import { slug as limpar, TAMANHOS, type Cota, type Tamanho } from '@norte/motor';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { arquivosDoBanco, gerarEvento } from '@/lib/comum/montagem';
import type { AplicacaoPatrocinador, ArquivoMidia, BancoPatrocinios, Evento, EventoPatrocinavel, PatrocinadorBanco, UsoPatrocinadores } from '@/lib/comum/tipos';
import { api, ErroApi, json } from './api';
import { ehImagemLogo, novoPatrocinador, porNome, subirLogo, urlLogo } from './patrocinadores';
import { PreviaSolta } from './Previa';
import { Alca, mover, useReordenar } from './Reordenar';
import { Seletor, type Opcao } from './Seletor';

/** tamanho do card do logo no site (desktop) */
const MEDIDA: Record<Tamanho, string> = { GG: '246×180', G: '202×150', M: '172×137', P: '127×103' };
const NOME_TAMANHO: Record<Tamanho, string> = { GG: 'Extra grande', G: 'Grande', M: 'Médio', P: 'Pequeno' };

type Dados = { banco: BancoPatrocinios; versao: string; uso: UsoPatrocinadores; eventos: EventoPatrocinavel[] };
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

const opcoesCota = (cotas: Cota[]): Opcao[] => cotas.map((c) => ({ valor: c.id, rotulo: c.nome, detalhe: c.tamanho }));

/** pôr o logo em páginas de um evento (tapume e cidades) numa cota */
function Adicionar({ p, eventos, usos, adicionar, ocupado }: { p: PatrocinadorBanco; eventos: EventoPatrocinavel[]; usos: UsoPatrocinadores[string]; adicionar: (slug: string, paginas: string[], cota: string) => Promise<boolean>; ocupado: boolean }) {
  const [slug, setSlug] = useState('');
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [cota, setCota] = useState('');
  const ev = eventos.find((e) => e.slug === slug);
  const jaTem = new Set(usos.find((u) => u.slug === slug)?.aplicacoes.map((a) => a.pagina));
  const livres = ev?.paginas.filter((pg) => !jaTem.has(pg.id)) || [];
  const cotaFinal = cota || ev?.cotas[0]?.id || '';
  const trocarEvento = (s: string) => { setSlug(s); setMarcadas(new Set()); setCota(''); };
  const alternar = (id: string) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  if (!eventos.length) return <p className="small muted">Nenhum evento com páginas de praça ainda.</p>;
  return (
    <div className="onde-add">
      <b className="small">Adicionar {p.nome} em um evento</b>
      <div className="row" style={{ gap: 8 }}>
        <Seletor rotulo="Evento" vazio="Escolha o evento…" largura={260} valor={slug} desativado={ocupado} mudar={trocarEvento}
          opcoes={eventos.map((e) => ({ valor: e.slug, rotulo: e.nome, detalhe: e.publicado ? 'no ar' : undefined }))} />
        {ev && <Seletor rotulo="Cota" largura={200} valor={cotaFinal} desativado={ocupado} mudar={setCota} opcoes={opcoesCota(ev.cotas)} />}
      </div>
      {ev && (
        <>
          <div className="row" style={{ gap: 6 }}>
            {livres.length > 1 && (
              <button type="button" className="btn sm ghost" onClick={() => setMarcadas(marcadas.size === livres.length ? new Set() : new Set(livres.map((x) => x.id)))}>
                {marcadas.size === livres.length ? 'Desmarcar todas' : 'Marcar todas'}
              </button>
            )}
            {ev.paginas.map((pg) => (
              <label key={pg.id} className={'pg-chip' + (marcadas.has(pg.id) ? ' on' : '') + (jaTem.has(pg.id) ? ' tem' : '')} title={jaTem.has(pg.id) ? 'Já está nesta página' : undefined}>
                <input type="checkbox" checked={jaTem.has(pg.id) || marcadas.has(pg.id)} disabled={jaTem.has(pg.id) || ocupado} onChange={() => alternar(pg.id)} />
                {pg.nome}{jaTem.has(pg.id) ? ' (já está)' : ''}
              </label>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm pri" type="button" disabled={!marcadas.size || !cotaFinal || ocupado}
              onClick={async () => { if (await adicionar(ev.slug, [...marcadas], cotaFinal)) setMarcadas(new Set()); }}>
              {ocupado ? 'Adicionando…' : `Adicionar em ${marcadas.size || ''} página(s)`.replace('em  ', 'em ')}
            </button>
            {!livres.length && <span className="small muted">Já está em todas as páginas deste evento.</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** onde o logo aparece, com troca de cota e retirada (não publica) */
function OndeAparece({ p, usos, eventos, recarregar, visualizar }: { p: PatrocinadorBanco; usos: UsoPatrocinadores[string]; eventos: EventoPatrocinavel[]; recarregar: () => Promise<unknown>; visualizar: (slug: string, nome: string, pagina: string) => void }) {
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState(false);

  async function adicionar(slug: string, paginas: string[], cota: string) {
    setOcupado('+' + slug);
    setErro('');
    try {
      await api(`/api/eventos/${slug}/patrocinios`, json('PATCH', { acao: 'adicionar', patrocinador: p.id, nome: p.nome, paginas, cota }));
      await recarregar();
      setFeito(true);
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setOcupado('');
    }
  }

  async function editar(slug: string, a: AplicacaoPatrocinador, pedido: { acao: 'cota' | 'remover'; cota?: string }) {
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
      {!usos.length && <p className="small muted">Este logo ainda não está em nenhum evento.</p>}
      {usos.map((u) => (
        <div key={u.slug} className="onde-ev">
          <div className="row" style={{ gap: 8 }}>
            <b>{u.nome}</b>
            {u.publicado ? <span className="pill ok">no ar</span> : <span className="pill">rascunho</span>}
            {u.pendente && <span className="pill warn">atualização pendente</span>}
            <button className="btn sm ghost" type="button" style={{ marginLeft: 'auto' }} onClick={() => visualizar(u.slug, u.nome, u.aplicacoes[0]?.pagina || 'tapume')}>Visualizar</button>
          </div>
          {u.aplicacoes.map((a) => {
            const ocupada = ocupado === u.slug + a.pagina;
            return (
              <div key={a.pagina + a.bloco} className="onde-pg" style={{ opacity: ocupada ? 0.5 : 1 }}>
                <span>{a.nomePagina}</span>
                <Seletor rotulo={`Cota em ${a.nomePagina}`} largura={200} valor={a.cota} desativado={!!ocupado} mudar={(v) => editar(u.slug, a, { acao: 'cota', cota: v })}
                  opcoes={[...(u.cotas.some((c) => c.id === a.cota) ? [] : [{ valor: a.cota, rotulo: a.cotaNome }]), ...opcoesCota(u.cotas)]} />
                <button className="btn sm ghost danger" type="button" disabled={!!ocupado} onClick={() => { if (confirm(`Tirar ${p.nome} de ${a.nomePagina} (${u.nome})?`)) editar(u.slug, a, { acao: 'remover' }); }}>Tirar</button>
              </div>
            );
          })}
        </div>
      ))}
      <Adicionar p={p} eventos={eventos} usos={usos} adicionar={adicionar} ocupado={ocupado.startsWith('+')} />
    </div>
  );
}

/** prévia de uma página do evento (celular/desktop), sem abrir o editor */
function Visualizar({ slug, nome, pagina: inicial, banco, fechar }: { slug: string; nome: string; pagina: string; banco: BancoPatrocinios; fechar: () => void }) {
  const [dados, setDados] = useState<{ evento: Evento; modelos: Partial<Record<string, string>>; arquivos: ArquivoMidia[] } | null>(null);
  const [erro, setErro] = useState('');
  const [pagina, setPagina] = useState(inicial);
  useEffect(() => { api<NonNullable<typeof dados>>(`/api/eventos/${slug}`).then(setDados, (e) => setErro(e.message)); }, [slug]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [fechar]);
  const resultado = useMemo(() => (dados ? gerarEvento(dados.evento, dados.modelos, dados.arquivos, banco) : null), [dados, banco]);
  const arquivos = useMemo(() => [...(dados?.arquivos || []), ...arquivosDoBanco(banco)], [dados, banco]);
  const paginas: Opcao[] = dados ? [{ valor: 'tapume', rotulo: 'Tapume (home)' }, ...dados.evento.cidades.map((c, i) => ({ valor: c._id, rotulo: String(c.cidade || c.praca || c.nome || `Cidade ${i + 1}`) }))] : [];
  const pag = resultado?.paginas.find((p) => (pagina === 'tapume' ? p.tipo === 'tapume' : p.tipo === 'praca' && p.cidadeId === pagina));
  return (
    <div className="janela-fundo" onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className="janela" role="dialog" aria-modal="true" aria-label={`Prévia de ${nome}`}>
        <div className="row between">
          <span className="row" style={{ gap: 10 }}>
            <b>{nome}</b>
            {dados && <Seletor rotulo="Página" largura={220} valor={pagina} mudar={setPagina} opcoes={paginas} />}
          </span>
          <button className="btn sm ghost" type="button" onClick={fechar}>Fechar</button>
        </div>
        {erro ? <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>
          : !dados ? <p className="muted">Montando a prévia…</p>
          : <PreviaSolta html={pag?.html ?? null} titulo={pag ? `${pag.titulo} · ${pag.arquivo}` : 'Prévia'} altura={Math.max(360, (typeof window === 'undefined' ? 800 : window.innerHeight) - 200)} arquivos={arquivos} baseUrl={dados.evento.baseUrl} />}
        <p className="small muted">Prévia com o que está salvo. O site no ar só muda quando o evento for publicado.</p>
      </div>
    </div>
  );
}

/** cotas gerais: valem para todos os eventos */
function Cotas({ banco, uso, salvar }: { banco: BancoPatrocinios; uso: UsoPatrocinadores; salvar: Salvar }) {
  const cotas = banco.cotas;
  const [nova, setNova] = useState('');
  const [tamanhoNova, setTamanhoNova] = useState<Tamanho>('P');
  const moverCota = (de: number, para: number) => salvar((b) => { b.cotas = mover(b.cotas, de, para); });
  const { alca, alvo } = useReordenar(moverCota);
  const mudar = (id: string, fn: (c: Cota) => void) => salvar((b) => { const c = b.cotas.find((x) => x.id === id); if (c) fn(c); });
  // eventos que usam cada cota
  const usoCota = new Map<string, Set<string>>();
  for (const us of Object.values(uso)) for (const u of us) for (const a of u.aplicacoes) usoCota.set(a.cota, (usoCota.get(a.cota) || new Set()).add(u.nome));
  const tamanhos: Opcao[] = TAMANHOS.map((t) => ({ valor: t, rotulo: `${t} · ${NOME_TAMANHO[t]}`, detalhe: MEDIDA[t] }));

  function criar() {
    const nome = nova.trim();
    if (!nome) return;
    salvar((b) => {
      const base = limpar(nome) || 'cota';
      let id = base;
      for (let i = 2; b.cotas.some((x) => x.id === id); i++) id = `${base}-${i}`;
      // entra antes da Ticketeria (perto das de tamanho P), ou no fim
      const ondeT = b.cotas.findIndex((x) => x.id === 'ticketeria');
      const c: Cota = { id, nome, tamanho: tamanhoNova };
      if (ondeT >= 0) b.cotas.splice(ondeT, 0, c); else b.cotas.push(c);
    }).then(() => setNova(''), () => {});
  }

  return (
    <section className="card stack">
      <div>
        <h2 style={{ fontSize: 18 }}>Cotas</h2>
        <p className="small muted">Valem para todos os eventos. A ordem aqui é a ordem na página (arraste para mudar). O tamanho define o card de cada logo da cota (largura × altura no desktop; no celular fica menor).</p>
      </div>
      <div className="lista-secoes">
        {cotas.map((c, i) => {
          const usam = usoCota.get(c.id);
          return (
            <div key={c.id} className="secao-item" {...alvo(i)}>
              <Alca i={i} total={cotas.length} alca={alca} mover={moverCota} rotulo={c.nome} />
              <div className="row" style={{ gap: 10 }}>
                <input className="inp" style={{ maxWidth: 220 }} defaultValue={c.nome} aria-label="Nome da cota" onBlur={(e) => { const v = e.target.value.trim(); if (!v) e.target.value = c.nome; else if (v !== c.nome) mudar(c.id, (x) => { x.nome = v; }); }} />
                <Seletor rotulo={`Tamanho da cota ${c.nome}`} largura={230} valor={c.tamanho} opcoes={tamanhos} mudar={(v) => mudar(c.id, (x) => { x.tamanho = v as Tamanho; })} />
                <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={!!c.aoLado} disabled={i === 0} onChange={(e) => { const v = e.target.checked; mudar(c.id, (x) => { x.aoLado = v; }); }} />Ao lado da cota anterior</label>
                <span className="small muted">{usam ? `Em ${usam.size} evento(s)` : 'Sem uso'}</span>
                <button className="iconbtn" type="button" style={{ marginLeft: 'auto' }} aria-label={`Apagar a cota ${c.nome}`}
                  onClick={() => { if (confirm(usam ? `A cota ${c.nome} está em uso em ${[...usam].join(', ')}. Apagar mesmo assim? Esses logos deixam de aparecer.` : `Apagar a cota ${c.nome}?`)) salvar((b) => { b.cotas = b.cotas.filter((x) => x.id !== c.id); }); }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row">
        <input className="inp" style={{ maxWidth: 260 }} placeholder="Nova cota (ex.: Apoio de mídia)" aria-label="Nome da nova cota" value={nova} onChange={(e) => setNova(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && criar()} />
        <Seletor rotulo="Tamanho da nova cota" largura={230} valor={tamanhoNova} opcoes={tamanhos} mudar={(v) => setTamanhoNova(v as Tamanho)} />
        <button className="btn sm pri" type="button" disabled={!nova.trim()} onClick={criar}>+ Criar cota</button>
      </div>
    </section>
  );
}

export function BancoPatrocinadores() {
  const [aba, setAba] = useState<'patrocinadores' | 'cotas'>('patrocinadores');
  const [previa, setPrevia] = useState<{ slug: string; nome: string; pagina: string } | null>(null);
  useEffect(() => { if (new URLSearchParams(location.search).get('aba') === 'cotas') setAba('cotas'); }, []);
  const trocarAba = (a: typeof aba) => { setAba(a); history.replaceState(null, '', a === 'cotas' ? '?aba=cotas' : location.pathname); };
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
    if (imagens.length) { setRascunhos((rs) => [...rs, ...imagens.map(novoRascunho)]); trocarAba('patrocinadores'); }
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
        <p>{aba === 'cotas'
          ? 'As cotas e os tamanhos dos logos, iguais para todos os eventos.'
          : 'Um cadastro só para todos os sites. Arraste vários logos de uma vez para a página. Clique num patrocinador para ver em que eventos e páginas ele aparece e mudar a cota por ali.'}</p>
      </div>
      <div className="subabas" role="tablist" aria-label="Patrocínios">
        <button type="button" role="tab" aria-selected={aba === 'patrocinadores'} onClick={() => trocarAba('patrocinadores')}>Patrocinadores</button>
        <button type="button" role="tab" aria-selected={aba === 'cotas'} onClick={() => trocarAba('cotas')}>Cotas</button>
      </div>
      {erro && <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>}
      {aba === 'cotas' ? <Cotas banco={banco} uso={uso} salvar={salvar} /> : <>
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
            {aberto === p.id && <OndeAparece p={p} usos={uso[p.id] || []} eventos={dados.eventos || []} recarregar={ler} visualizar={(slug, nome, pagina) => setPrevia({ slug, nome, pagina })} />}
          </Fragment>
        ))}
        {!lista.length && busca && <p className="muted small">Nenhum patrocinador com esse nome.</p>}
      </div>
      </>}
      {previa && <Visualizar {...previa} banco={banco} fechar={() => setPrevia(null)} />}
    </div>
  );
}
