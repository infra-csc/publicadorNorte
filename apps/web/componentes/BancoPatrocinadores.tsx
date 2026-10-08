'use client';
// Banco geral de patrocinadores: alimenta todos os eventos. Tela separada (no futuro, acesso só do setor de patrocínios).
import { TAMANHOS, slug, type Cota, type Tamanho } from '@norte/motor';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BancoPatrocinios, PatrocinadorBanco, UsoPatrocinadores } from '@/lib/comum/tipos';
import { api, ErroApi, json } from './api';
import { novoPatrocinador, porNome, subirLogo, urlLogo } from './patrocinadores';
import { Alca, mover, useReordenar } from './Reordenar';

type Dados = { banco: BancoPatrocinios; versao: string; uso: UsoPatrocinadores };

function FormPatrocinador({ inicial, salvar, cancelar }: { inicial?: PatrocinadorBanco; salvar: (d: { nome: string; url: string; arquivo: File | null }) => Promise<void>; cancelar: () => void }) {
  const [nome, setNome] = useState(inicial?.nome || '');
  const [url, setUrl] = useState(inicial?.url || '');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <div className="colpanel">
      <b>{inicial ? `Editar ${inicial.nome}` : 'Novo patrocinador'}</b>
      <div className="grid3">
        <label className="f">Nome<input className="inp" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="f">Link <small>Opcional, começa com https://</small><input className="inp mono" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
        <label className="f">{inicial ? 'Trocar o logo' : 'Logo'} <small>SVG ou PNG de preferência</small><input className="inp" type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] || null)} /></label>
      </div>
      <div className="row">
        <button className="btn sm pri" type="button" onClick={async () => {
          if (!nome.trim()) return setMsg('Dê um nome.');
          if (!inicial && !arquivo) return setMsg('Escolha o logo.');
          setMsg('Salvando…');
          try { await salvar({ nome, url, arquivo }); } catch (e) { setMsg((e as Error).message); }
        }}>Salvar</button>
        <button className="btn sm ghost" type="button" onClick={cancelar}>Cancelar</button>
      </div>
      {msg && <p className="small" style={{ color: msg === 'Salvando…' ? 'var(--mute)' : 'var(--bad)' }}>{msg}</p>}
    </div>
  );
}

function Cotas({ dados, salvarBanco }: { dados: Dados; salvarBanco: (fn: (b: BancoPatrocinios) => void, mudou?: string[]) => Promise<void> }) {
  const cotas = dados.banco.cotas;
  const [nova, setNova] = useState('');
  const moverCota = (de: number, para: number) => salvarBanco((b) => { b.cotas = mover(b.cotas, de, para); });
  const { alca, alvo } = useReordenar(moverCota);
  const mudar = (id: string, fn: (c: Cota) => void) => salvarBanco((b) => { const c = b.cotas.find((x) => x.id === id); if (c) fn(c); });
  return (
    <section className="card stack">
      <div>
        <h2 style={{ fontSize: 18 }}>Cotas</h2>
        <p className="small muted">Valem para todos os eventos. A ordem aqui é a ordem sugerida na página. Tamanhos: GG (Master), G (Gold), M (Silver), P (Apoio, Ticketeria, Realização).</p>
      </div>
      <div className="lista-secoes">
        {cotas.map((c, i) => (
          <div key={c.id} className="secao-item" {...alvo(i)}>
            <Alca i={i} total={cotas.length} alca={alca} mover={moverCota} rotulo={c.nome} />
            <div className="row" style={{ gap: 10 }}>
              <input className="inp" style={{ maxWidth: 220 }} defaultValue={c.nome} aria-label="Nome da cota" onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.nome) mudar(c.id, (x) => { x.nome = v; }); }} />
              <select className="inp" style={{ width: 'auto' }} aria-label="Tamanho" value={c.tamanho} onChange={(e) => { const v = e.target.value as Tamanho; mudar(c.id, (x) => { x.tamanho = v; }); }}>
                {TAMANHOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={!!c.aoLado} onChange={(e) => { const v = e.target.checked; mudar(c.id, (x) => { x.aoLado = v; }); }} />Ao lado da cota anterior</label>
              <button className="iconbtn" type="button" aria-label={`Apagar a cota ${c.nome}`} title="Apagar a cota (os eventos que usam deixam de mostrar esse bloco)" onClick={() => { if (confirm(`Apagar a cota ${c.nome}? Os eventos que usam deixam de mostrar esse bloco.`)) salvarBanco((b) => { b.cotas = b.cotas.filter((x) => x.id !== c.id); }); }}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="row">
        <input className="inp" style={{ maxWidth: 260 }} placeholder="Nova cota (ex.: Apoio de mídia)" value={nova} onChange={(e) => setNova(e.target.value)} />
        <button className="btn sm" type="button" disabled={!nova.trim()} onClick={() => {
          const nome = nova.trim();
          salvarBanco((b) => {
            const base = slug(nome) || 'cota';
            let id = base;
            for (let i = 2; b.cotas.some((x) => x.id === id); i++) id = `${base}-${i}`;
            // entra antes da Ticketeria (perto das de tamanho P), ou no fim
            const ondeT = b.cotas.findIndex((x) => x.id === 'ticketeria');
            const c: Cota = { id, nome, tamanho: 'P' };
            if (ondeT >= 0) b.cotas.splice(ondeT, 0, c); else b.cotas.push(c);
          }).then(() => setNova(''));
        }}>+ Criar cota</button>
      </div>
    </section>
  );
}

export function BancoPatrocinadores() {
  const [dados, setDados] = useState<Dados | null>(null);
  const ref = useRef<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [mudados, setMudados] = useState<Set<string>>(new Set());
  const [republicando, setRepublicando] = useState('');

  const ler = useCallback(() => api<Dados>('/api/patrocinadores').then((d) => { ref.current = d; setDados(d); return d; }), []);
  useEffect(() => { ler().catch((e) => setErro(e.message)); }, [ler]);

  /** muda e grava o banco; `mudou` = patrocinadores alterados (para oferecer republicar os eventos que usam) */
  const salvarBanco = useCallback(async (fn: (b: BancoPatrocinios) => void, mudou: string[] = []) => {
    setErro('');
    for (let tentativa = 0; ; tentativa++) {
      const atual = ref.current!;
      const novo = structuredClone(atual.banco);
      fn(novo);
      try {
        const r = await api<{ versao: string }>('/api/patrocinadores', json('PUT', { banco: novo, versao: atual.versao }));
        ref.current = { ...atual, banco: novo, versao: r.versao };
        setDados(ref.current);
        if (mudou.length) setMudados((m) => new Set([...m, ...mudou]));
        return;
      } catch (e) {
        if (e instanceof ErroApi && e.status === 409 && tentativa < 2) { await ler(); continue; }
        setErro((e as Error).message);
        throw e;
      }
    }
  }, [ler]);

  if (!dados) return <p className="muted">{erro || 'Carregando o banco…'}</p>;
  const { banco, uso } = dados;
  const lista = [...banco.patrocinadores].filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())).sort(porNome);
  // eventos publicados que usam patrocinadores alterados
  const afetados = new Map<string, string>();
  for (const id of mudados) for (const u of uso[id] || []) if (u.publicado) afetados.set(u.slug, u.nome);

  async function republicar() {
    const slugs = [...afetados.keys()];
    for (let i = 0; i < slugs.length; i++) {
      setRepublicando(`Republicando ${i + 1} de ${slugs.length}: ${afetados.get(slugs[i])}…`);
      try { await api(`/api/eventos/${slugs[i]}/publicar`, { method: 'POST' }); } catch (e) { setErro(`${afetados.get(slugs[i])}: ${(e as Error).message}`); }
    }
    setRepublicando('');
    setMudados(new Set());
    ler();
  }

  return (
    <>
      <div className="head">
        <span className="eyebrow"><Link href="/">← Eventos</Link></span>
        <h1>Banco de patrocinadores</h1>
        <p>Um cadastro só para todos os sites. Os eventos escolhem daqui os logos de cada cota.</p>
      </div>
      {erro && <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>}
      {afetados.size > 0 && (
        <div className="w-item warn"><span className="ic">!</span><div>
          <b>{afetados.size} evento(s) publicado(s) usam patrocinadores que mudaram</b>
          {[...afetados.values()].join(', ')}. Os sites só mudam quando forem publicados de novo.{' '}
          {republicando ? <span className="small">{republicando}</span> : <button className="btn sm" type="button" onClick={republicar}>Republicar esses eventos</button>}
        </div></div>
      )}
      <section className="card stack">
        <div className="row between">
          <h2 style={{ fontSize: 18 }}>Patrocinadores <span className="cnt">{banco.patrocinadores.length}</span></h2>
          <span className="row" style={{ gap: 8 }}>
            <input className="inp" style={{ width: 220 }} placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <button className="btn sm pri" type="button" onClick={() => setEditando('novo')}>+ Novo patrocinador</button>
          </span>
        </div>
        {editando === 'novo' && (
          <FormPatrocinador cancelar={() => setEditando(null)} salvar={async ({ nome, url, arquivo }) => {
            const logo = await subirLogo(nome, arquivo!);
            await salvarBanco((b) => { b.patrocinadores.push(novoPatrocinador(b, { nome, url, ...logo })); });
            setEditando(null);
          }} />
        )}
        <div className="banco-grade">
          {lista.map((p) => {
            const usos = uso[p.id] || [];
            return (
              <div key={p.id} className={'banco-card' + (p.ativo ? '' : ' inativo')}>
                {editando === p.id ? (
                  <FormPatrocinador inicial={p} cancelar={() => setEditando(null)} salvar={async ({ nome, url, arquivo }) => {
                    const logo = arquivo ? await subirLogo(nome, arquivo) : null;
                    await salvarBanco((b) => { const x = b.patrocinadores.find((y) => y.id === p.id)!; x.nome = nome.trim(); x.url = url.trim(); if (logo) Object.assign(x, logo); }, [p.id]);
                    setEditando(null);
                  }} />
                ) : (
                  <>
                    <div className="banco-logo"><img src={urlLogo(p)} alt="" loading="lazy" /></div>
                    <b>{p.nome}</b>
                    <span className="small muted mono" style={{ overflowWrap: 'anywhere' }}>{p.url || 'sem link'}</span>
                    <span className="small muted">{usos.length ? `Em ${usos.length} evento(s): ${usos.map((u) => u.nome).join(', ')}` : 'Não usado em nenhum evento'}</span>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn sm" type="button" onClick={() => setEditando(p.id)}>Editar</button>
                      <button className="btn sm ghost" type="button" onClick={() => salvarBanco((b) => { const x = b.patrocinadores.find((y) => y.id === p.id)!; x.ativo = !x.ativo; }, [p.id])}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
                      {!usos.length && <button className="btn sm ghost danger" type="button" onClick={() => { if (confirm(`Apagar ${p.nome} do banco?`)) salvarBanco((b) => { b.patrocinadores = b.patrocinadores.filter((y) => y.id !== p.id); }); }}>Apagar</button>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {!lista.length && <p className="muted small">Nenhum patrocinador {busca ? 'com esse nome' : 'cadastrado ainda'}.</p>}
        </div>
      </section>
      <Cotas dados={dados} salvarBanco={salvarBanco} />
    </>
  );
}
