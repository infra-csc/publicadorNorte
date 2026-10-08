'use client';
// Seção de patrocinadores de cada página: o tapume e cada cidade montam a sua (a etapa usa a da cidade).
// Os logos vêm do banco geral; cadastrar um novo aqui já salva no banco.
import { COTAS_PADRAO, slug, TAMANHOS, type BlocoPatrocinio, type Cota, type ComposicaoPatrocinio, type OrdemBloco, type Tamanho } from '@norte/motor';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import type { BancoPatrocinios, Evento } from '@/lib/comum/tipos';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { novoPatrocinador, porNome, subirLogo, urlLogo } from '../patrocinadores';
import { Previa } from '../Previa';
import { Alca, mover, useReordenar } from '../Reordenar';

const novoId = () => crypto.randomUUID().slice(0, 8);
/** cotas do evento (por padrão: Master GG, Gold G, Silver M, Apoio/Ticketeria/Realização P) */
const cotasDo = (e: Evento): Cota[] => e.patrocinios?.cotas || COTAS_PADRAO;
const garantir = (e: Evento, pagina: string): ComposicaoPatrocinio => {
  e.patrocinios ??= { porPagina: {} };
  return (e.patrocinios.porPagina[pagina] ??= { blocos: [] });
};

/** escolher um patrocinador do banco ou cadastrar um novo */
function Escolher({ banco, jaTem, escolher, fechar }: { banco: BancoPatrocinios; jaTem: Set<string>; escolher: (id: string) => void; fechar: () => void }) {
  const { salvarBanco } = useEditor();
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState<{ nome: string; url: string; arquivo: File | null } | null>(null);
  const [msg, setMsg] = useState('');
  const lista = banco.patrocinadores
    .filter((p) => p.ativo && !jaTem.has(p.id) && p.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(busca.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')))
    .sort(porNome);

  async function cadastrar() {
    if (!novo?.nome.trim()) return setMsg('Dê um nome ao patrocinador.');
    if (!novo.arquivo) return setMsg('Escolha o arquivo do logo.');
    setMsg('Enviando o logo…');
    try {
      const logo = await subirLogo(novo.nome, novo.arquivo);
      let id = '';
      await salvarBanco((b) => {
        const p = novoPatrocinador(b, { nome: novo.nome, url: novo.url, ...logo });
        id = p.id;
        b.patrocinadores.push(p);
      });
      escolher(id);
      setNovo(null);
      setMsg('');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="colpanel">
      {novo ? (
        <>
          <b>Novo patrocinador <span className="small muted" style={{ fontWeight: 400 }}>(vai para o banco geral e fica disponível em todos os eventos)</span></b>
          <div className="grid3">
            <label className="f">Nome<input className="inp" autoFocus value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
            <label className="f">Link <small>Opcional, começa com https://</small><input className="inp mono" value={novo.url} placeholder="https://…" onChange={(e) => setNovo({ ...novo, url: e.target.value })} /></label>
            <label className="f">Logo <small>SVG ou PNG de preferência</small><input className="inp" type="file" accept="image/*" onChange={(e) => setNovo({ ...novo, arquivo: e.target.files?.[0] || null })} /></label>
          </div>
          <div className="row">
            <button className="btn sm pri" type="button" onClick={cadastrar}>Cadastrar e adicionar</button>
            <button className="btn sm ghost" type="button" onClick={() => setNovo(null)}>Voltar</button>
          </div>
        </>
      ) : (
        <>
          <div className="row between">
            <input className="inp" style={{ maxWidth: 320 }} autoFocus placeholder="Buscar patrocinador…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <span className="row" style={{ gap: 6 }}>
              <button className="btn sm" type="button" onClick={() => setNovo({ nome: busca, url: '', arquivo: null })}>+ Cadastrar novo</button>
              <button className="btn sm ghost" type="button" onClick={fechar}>Fechar</button>
            </span>
          </div>
          <div className="patro-escolha">
            {lista.map((p) => (
              <button key={p.id} type="button" className="patro-card" onClick={() => escolher(p.id)} title={`Adicionar ${p.nome}`}>
                <img src={urlLogo(p)} alt="" loading="lazy" />
                <span>{p.nome}</span>
              </button>
            ))}
            {!lista.length && <p className="small muted">Nenhum patrocinador {busca ? 'com esse nome' : 'disponível'} no banco. Use “+ Cadastrar novo”.</p>}
          </div>
        </>
      )}
      {msg && <p className="small" style={{ color: msg.startsWith('Enviando') ? 'var(--mute)' : 'var(--bad)' }}>{msg}</p>}
    </div>
  );
}

function Bloco({ pagina, b, i, total, alca, moverBloco }: { pagina: string; b: BlocoPatrocinio; i: number; total: number; alca: ReturnType<typeof useReordenar>['alca']; moverBloco: (de: number, para: number) => void }) {
  const { banco, evento, alterar } = useEditor();
  const cotas = cotasDo(evento);
  const [escolhendo, setEscolhendo] = useState(false);
  const [remover, setRemover] = useState(false);
  const cota = cotas.find((c) => c.id === b.cota);
  const porId = new Map((banco?.patrocinadores || []).map((p) => [p.id, p]));
  const mudar = (fn: (x: BlocoPatrocinio) => void) =>
    alterar((e) => {
      const blocos = garantir(e, pagina).blocos;
      const x = blocos.find((y) => y.id === b.id);
      if (x) fn(x);
    });
  const moverItem = (de: number, para: number) => mudar((x) => { x.itens = mover(x.itens, de, para); });
  const itens = b.ordem === 'manual' ? b.itens : [...b.itens].sort((x, y) => porNome({ nome: porId.get(x.patrocinador)?.nome || '' }, { nome: porId.get(y.patrocinador)?.nome || '' }));
  const { alca: alcaItem, alvo: alvoItem } = useReordenar(moverItem);
  const semTitulo = b.titulo === '';

  return (
    <div className="card stack patro-bloco" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 10 }}>
        <Alca i={i} total={total} alca={alca} mover={moverBloco} rotulo={cota?.nome || 'cota'} />
        <select className="inp" style={{ width: 'auto' }} aria-label="Cota" value={b.cota} onChange={(e) => { const v = e.target.value; mudar((x) => { x.cota = v; }); }}>
          {cotas.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tamanho})</option>)}
        </select>
        <input className="inp" style={{ maxWidth: 220 }} aria-label="Título" disabled={semTitulo} placeholder={cota?.nome || 'Título'} value={b.titulo ?? ''} onChange={(e) => { const v = e.target.value; mudar((x) => { x.titulo = v || undefined; }); }} />
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={semTitulo} onChange={(e) => { const v = e.target.checked; mudar((x) => { x.titulo = v ? '' : undefined; }); }} />Sem título</label>
        <label className="row small" style={{ gap: 6 }} title="Fica na mesma linha do bloco de cima (como Ticketeria e Realização)">
          <input type="checkbox" checked={b.aoLado ?? !!cota?.aoLado} disabled={i === 0} onChange={(e) => { const v = e.target.checked; mudar((x) => { x.aoLado = v; }); }} />Ao lado do anterior
        </label>
        <select className="inp" style={{ width: 'auto' }} aria-label="Ordem dos logos" value={b.ordem} onChange={(e) => { const v = e.target.value as OrdemBloco; mudar((x) => { x.ordem = v; }); }}>
          <option value="alfabetica">Ordem alfabética</option>
          <option value="manual">Ordem escolhida (arrastar)</option>
          <option value="aleatoria">Aleatória a cada visita</option>
        </select>
        <span style={{ marginLeft: 'auto' }}>
          {remover ? (
            <span className="row" style={{ gap: 6 }}>
              <button className="btn sm danger-fill" type="button" onClick={() => alterar((e) => { const c = garantir(e, pagina); c.blocos = c.blocos.filter((y) => y.id !== b.id); })}>Tirar a cota</button>
              <button className="btn sm ghost" type="button" onClick={() => setRemover(false)}>Não</button>
            </span>
          ) : <button className="iconbtn" type="button" aria-label="Tirar esta cota da página" onClick={() => setRemover(true)}>✕</button>}
        </span>
      </div>
      <div className="patro-itens">
        {itens.map((it) => {
          const p = porId.get(it.patrocinador);
          const k = b.itens.indexOf(it);
          return (
            <div key={it.patrocinador} className={'patro-item' + (p && !p.ativo ? ' inativo' : '')} {...(b.ordem === 'manual' ? alvoItem(k) : {})}>
              {b.ordem === 'manual' && <span className="alca" title="Arraste para mudar a ordem" {...alcaItem(k)}>⠿</span>}
              {p ? <img src={urlLogo(p)} alt="" /> : <span className="small muted">apagado</span>}
              <span className="patro-nome" title={p?.nome}>{p?.nome || it.patrocinador}{p && !p.ativo ? ' (desativado)' : ''}</span>
              <select aria-label={`Tamanho de ${p?.nome}`} value={it.tamanho || ''} onChange={(e) => { const v = e.target.value as Tamanho | ''; mudar((x) => { const y = x.itens.find((z) => z.patrocinador === it.patrocinador); if (y) y.tamanho = v || undefined; }); }}>
                <option value="">{cota?.tamanho || 'P'} (da cota)</option>
                {TAMANHOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="iconbtn" type="button" aria-label={`Tirar ${p?.nome}`} onClick={() => mudar((x) => { x.itens = x.itens.filter((z) => z.patrocinador !== it.patrocinador); })}>✕</button>
            </div>
          );
        })}
        <button type="button" className="patro-item patro-mais" onClick={() => setEscolhendo(true)}>+ Patrocinador</button>
      </div>
      {escolhendo && banco && (
        <Escolher banco={banco} jaTem={new Set(b.itens.map((x) => x.patrocinador))} fechar={() => setEscolhendo(false)}
          escolher={(id) => mudar((x) => { if (!x.itens.some((z) => z.patrocinador === id)) x.itens.push({ patrocinador: id }); })} />
      )}
    </div>
  );
}

export function PassoPatrocinios() {
  const { evento, modelos, arquivos, banco, cad, alterar } = useEditor();
  const paginas = useMemo(() => [{ id: 'tapume', nome: 'Tapume (home)' }, ...evento.cidades.map((c) => ({ id: c._id, nome: cad.nomeItem('cidade', c) }))], [evento.cidades, cad]);
  const [pagina, setPagina] = useState(paginas[0].id);
  const comp = evento.patrocinios?.porPagina[pagina];
  const blocos = comp?.blocos || [];
  const outras = paginas.filter((p) => p.id !== pagina && evento.patrocinios?.porPagina[p.id]?.blocos.length);
  const moverBloco = (de: number, para: number) => alterar((e) => { const c = garantir(e, pagina); c.blocos = mover(c.blocos, de, para); });
  const { alca, alvo } = useReordenar(moverBloco);

  const ev = useDeferredValue(evento);
  const resultado = useMemo(() => gerarEvento(ev, modelos, arquivos, banco), [ev, modelos, arquivos, banco]);
  const pag = pagina === 'tapume' ? resultado.paginas.find((p) => p.tipo === 'tapume') : resultado.paginas.find((p) => p.tipo === 'praca' && p.cidadeId === pagina);

  const cotas = cotasDo(evento);
  const [novaCota, setNovaCota] = useState<{ nome: string; tamanho: Tamanho } | null>(null);
  function criarCota() {
    const nome = novaCota?.nome.trim();
    if (!nome) return;
    const tamanho = novaCota!.tamanho;
    alterar((e) => {
      const lista = structuredClone(cotasDo(e));
      const base = slug(nome) || 'cota';
      let id = base;
      for (let i = 2; lista.some((x) => x.id === id); i++) id = `${base}-${i}`;
      // entra antes da Ticketeria (perto das de tamanho P), ou no fim
      const ondeT = lista.findIndex((x) => x.id === 'ticketeria');
      const c: Cota = { id, nome, tamanho };
      if (ondeT >= 0) lista.splice(ondeT, 0, c); else lista.push(c);
      e.patrocinios ??= { porPagina: {} };
      e.patrocinios.cotas = lista;
      garantir(e, pagina).blocos.push({ id: novoId(), cota: id, ordem: 'alfabetica', itens: [] });
    });
    setNovaCota(null);
  }
  function adicionarCota(cotaId: string) {
    if (cotaId === '__nova') return setNovaCota({ nome: '', tamanho: 'P' });
    alterar((e) => { garantir(e, pagina).blocos.push({ id: novoId(), cota: cotaId, ordem: 'alfabetica', itens: [] }); });
  }
  function copiarDe(origem: string) {
    alterar((e) => {
      const c = e.patrocinios?.porPagina[origem];
      if (!c) return;
      garantir(e, pagina).blocos = structuredClone(c.blocos).map((b) => ({ ...b, id: novoId() }));
    });
  }

  return (
    <>
      <Cabecalho passo="patrocinios" titulo="Patrocínios">Monte a seção de patrocinadores de cada página. Ela entra sempre antes do rodapé. Cada cidade monta a sua; as páginas de etapa usam a da cidade.</Cabecalho>
      {!banco ? <p className="muted">Carregando o banco de patrocinadores…</p> : (
        <>
          <div className="row">
            <label className="row small" style={{ gap: 6 }}>Página:
              <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} value={pagina} onChange={(e) => setPagina(e.target.value)}>
                {paginas.map((p) => <option key={p.id} value={p.id}>{p.nome}{evento.patrocinios?.porPagina[p.id]?.blocos.length ? ' ✓' : ''}</option>)}
              </select>
            </label>
            {outras.length > 0 && (
              <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} value="" aria-label="Copiar de outra página" onChange={(e) => e.target.value && copiarDe(e.target.value)}>
                <option value="">Copiar de…</option>
                {outras.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            )}
            <span className="row small" style={{ gap: 10, marginLeft: 'auto' }}>
              {([['corFundo', 'Fundo', '#f1f1f1'], ['corTitulo', 'Títulos', '#222222']] as const).map(([k, nome, padrao]) => (
                <label key={k} className="row" style={{ gap: 6 }}>
                  <input type="color" value={evento.patrocinios?.estilo?.[k] || padrao} style={{ width: 32, height: 28, border: 0, padding: 0, background: 'none' }}
                    onChange={(e) => { const v = e.target.value; alterar((x) => { x.patrocinios ??= { porPagina: {} }; x.patrocinios.estilo = { ...x.patrocinios.estilo, [k]: v }; }); }} />
                  {nome}
                </label>
              ))}
              <Link href="/patrocinios" target="_blank">Patrocínios ↗</Link>
            </span>
          </div>
          <div className="split">
            <div className="stack" style={{ minWidth: 0 }}>
              {blocos.length === 0 && <div className="card empty">Nenhuma cota nesta página ainda. Adicione abaixo{outras.length ? ' ou copie de outra página' : ''}.</div>}
              {blocos.map((b, i) => (
                <div key={b.id} {...alvo(i)}>
                  <Bloco pagina={pagina} b={b} i={i} total={blocos.length} alca={alca} moverBloco={moverBloco} />
                </div>
              ))}
              <div className="row">
                <select className="inp" style={{ width: 'auto' }} value="" aria-label="Adicionar cota" onChange={(e) => e.target.value && adicionarCota(e.target.value)}>
                  <option value="">+ Adicionar cota…</option>
                  {cotas.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tamanho})</option>)}
                  <option value="__nova">Nova cota…</option>
                </select>
                {novaCota && (
                  <>
                    <input className="inp" style={{ maxWidth: 240 }} autoFocus placeholder="Nome da cota (ex.: Apoio de mídia)" aria-label="Nome da nova cota" value={novaCota.nome} onChange={(e) => setNovaCota({ ...novaCota, nome: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && criarCota()} />
                    <select className="inp" style={{ width: 'auto' }} aria-label="Tamanho da nova cota" value={novaCota.tamanho} onChange={(e) => setNovaCota({ ...novaCota, tamanho: e.target.value as Tamanho })}>
                      {TAMANHOS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button className="btn sm pri" type="button" disabled={!novaCota.nome.trim()} onClick={criarCota}>Criar cota</button>
                    <button className="btn sm ghost" type="button" onClick={() => setNovaCota(null)}>Cancelar</button>
                  </>
                )}
              </div>
            </div>
            <div className="lado"><Previa html={pag?.html ?? null} titulo={pag ? `${pag.titulo} · ${pag.arquivo}` : 'Prévia'} altura={560} /></div>
          </div>
        </>
      )}
      <NavPassos passo="patrocinios" />
    </>
  );
}
