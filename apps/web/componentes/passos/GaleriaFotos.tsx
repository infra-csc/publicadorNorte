'use client';
// Galeria (`@repetir galeria` no HTML): uma lista de fotos, cada uma com a cidade dela (ou "Todas").
// Envio de várias de uma vez para a cidade escolhida; trocar a cidade, legenda e ordem de cada foto.
// Seleção: clique escolhe uma, Ctrl/⌘+clique junta, Shift+clique pega o intervalo; arrastar a seleção para a aba
// de uma cidade (ou usar "Mover para…") troca a cidade de todas.
import { galeriasDe, type FotoGaleria } from '@norte/motor';
import { useEffect, useRef, useState } from 'react';
import { urlArquivo } from '../api';
import { lerSoltos, temArquivos } from '../arrastarPasta';
import { useEditor } from '../Editor';
import { enviarMidia, juntar, nomeLivre } from '../enviarMidia';
import { Escolha } from '../Escolha';

const ACEITA = /\.(webp|png|jpe?g|gif|avif|svg|mp4|webm)$/i;
const TIPO_ARRASTO = 'application/x-pub-fotos';
const ehVideo = (c: string) => /\.(mp4|webm)$/i.test(c);
const nomeGaleria = (g: string) => (g === 'galeria' ? 'Galeria' : 'Galeria ' + g.replace(/^galeria_?/, '').replace(/_/g, ' '));

/** uma galeria por nome usado nos HTMLs (ou só as indicadas) */
export function Galerias({ nomes: so }: { nomes?: string[] }) {
  const { modelos } = useEditor();
  const nomes = so || galeriasDe(modelos);
  return <>{nomes.map((g) => <Galeria key={g} colecao={g} />)}</>;
}

function Galeria({ colecao }: { colecao: string }) {
  const { evento, cad, arquivos, setArquivos, alterar } = useEditor();
  const fotos: FotoGaleria[] = evento.galerias?.[colecao] || [];
  const [filtro, setFiltro] = useState<string>('*');
  const [cidadeEnvio, setCidadeEnvio] = useState<string>(evento.cidades[0]?._id || '');
  const [msg, setMsg] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [ancora, setAncora] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const porCaminho = new Map(arquivos.map((a) => [a.caminho, a]));
  const nomeCidade = (id?: string) => {
    const c = id ? evento.cidades.find((x) => x._id === id) : undefined;
    return c ? cad.nomeItem('cidade', c) : 'Todas as cidades';
  };
  const cidades = [...evento.cidades.map((c) => ({ valor: c._id, rotulo: cad.nomeItem('cidade', c) })), { valor: '', rotulo: 'Todas as cidades' }];
  const mudar = (fn: (lista: FotoGaleria[]) => FotoGaleria[]) =>
    alterar((e) => { e.galerias = { ...(e.galerias || {}), [colecao]: fn([...(e.galerias?.[colecao] || [])]) }; });
  const moverPara = (ids: Iterable<string>, cidade: string) => {
    const s = new Set(ids);
    mudar((l) => l.map((x) => (s.has(x.id) ? { ...x, cidade } : x)));
    setMsg(`${s.size} foto(s) agora em ${nomeCidade(cidade)}.`);
  };

  // Esc limpa a seleção
  useEffect(() => {
    if (!sel.size) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(new Set()); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [sel.size]);

  async function enviar(itens: { file: File; rel: string }[]) {
    const ok = itens.filter((x) => ACEITA.test(x.file.name));
    if (!ok.length) return setMsg('Use imagens (webp, png, jpg) ou vídeos (mp4).');
    try {
      const ocupados = new Set(arquivos.map((a) => a.caminho));
      const pasta = `_media/galerias/${colecao}/${cidadeEnvio ? cad.nomeItem('cidade', evento.cidades.find((c) => c._id === cidadeEnvio)!).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'todas'}/`;
      const pedidos = ok.map((x) => ({ file: x.file, caminho: nomeLivre(pasta, x.file.name.replace(/\.[^.]+$/, ''), x.file.name, ocupados) }));
      const r = await enviarMidia(evento.slug, pedidos, arquivos, setMsg);
      if (r.novos.length) setArquivos(juntar(arquivos, r.novos));
      const novas: FotoGaleria[] = pedidos
        .map((p) => r.porPedido.get(p.caminho)?.caminho)
        .filter((c): c is string => !!c)
        .map((c) => ({ id: Math.random().toString(36).slice(2, 10), arquivo: c, cidade: cidadeEnvio, legenda: '' }));
      mudar((l) => [...l, ...novas]);
      setMsg(`${novas.length} foto(s) adicionada(s) em ${nomeCidade(cidadeEnvio)}.` + (r.grandes.length ? ` Grandes demais: ${r.grandes.join(', ')}` : ''));
    } catch (x) {
      setMsg('Não deu para enviar: ' + (x as Error).message);
    }
  }

  const visiveis = fotos.map((f, i) => ({ f, i })).filter(({ f }) => filtro === '*' || (filtro === '' ? !f.cidade : f.cidade === filtro));
  const contar = (id: string) => fotos.filter((f) => (id === '' ? !f.cidade : f.cidade === id)).length;
  const mover = (i: number, d: -1 | 1) => mudar((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; [l[i], l[j]] = [l[j], l[i]]; return l; });

  /** clique: só esta; Ctrl/⌘: junta ou tira; Shift: intervalo desde a última clicada */
  function clicar(e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }, id: string) {
    const ordem = visiveis.map((v) => v.f.id);
    const junta = e.ctrlKey || e.metaKey;
    if (e.shiftKey && ancora && ordem.includes(ancora)) {
      const [a, b] = [ordem.indexOf(ancora), ordem.indexOf(id)].sort((x, y) => x - y);
      setSel((s) => new Set([...(junta ? s : []), ...ordem.slice(a, b + 1)]));
      return;
    }
    setAncora(id);
    if (junta) setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    else setSel((s) => (s.size === 1 && s.has(id) ? new Set() : new Set([id])));
  }
  // abas de cidade recebem as fotos arrastadas
  const temFotos = (e: React.DragEvent) => e.dataTransfer.types.includes(TIPO_ARRASTO);
  const alvoDe = (cidade: string) => ({
    onDragOver: (e: React.DragEvent) => { if (temFotos(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setAlvo(cidade); } },
    onDragLeave: () => setAlvo((a) => (a === cidade ? null : a)),
    onDrop: (e: React.DragEvent) => {
      if (!temFotos(e)) return;
      e.preventDefault();
      e.stopPropagation();
      setAlvo(null);
      moverPara(JSON.parse(e.dataTransfer.getData(TIPO_ARRASTO) || '[]') as string[], cidade);
    },
    'data-alvo': alvo === cidade || undefined,
  });

  return (
    <section
      className={'card stack galeria-ed' + (arrastando ? ' card-soltar' : '')}
      onDragOver={(e) => { if (temArquivos(e)) { e.preventDefault(); setArrastando(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setArrastando(false); }}
      onDrop={async (e) => { if (!temArquivos(e)) return; e.preventDefault(); setArrastando(false); enviar(await lerSoltos(e.dataTransfer)); }}
    >
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 18 }}>{nomeGaleria(colecao)} <span className="small muted">({fotos.length} foto{fotos.length === 1 ? '' : 's'})</span></h2>
          <p className="small muted" style={{ margin: 0 }}>Cada foto aparece na cidade marcada (ou em todas). Na página, a galeria de cada cidade mostra as dela.</p>
        </div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="small">Enviar fotos para</span>
        <Escolha valor={cidadeEnvio} opcoes={cidades} mudar={setCidadeEnvio} rotulo="Cidade das fotos enviadas" />
        <button className="btn sm pri" type="button" onClick={() => input.current?.click()}>+ Escolher fotos</button>
        <span className="small muted">ou arraste várias fotos (ou uma pasta) para cá</span>
        <input ref={input} type="file" multiple accept="image/*,video/mp4,video/webm" hidden onChange={(e) => { const l = [...(e.target.files || [])].map((file) => ({ file, rel: file.name })); e.target.value = ''; enviar(l); }} />
      </div>
      {msg && <p className="small muted" style={{ margin: 0 }}>{msg}</p>}

      {fotos.length > 0 && (
        <div className="seo-abas" role="tablist" aria-label="Filtrar por cidade">
          <button type="button" role="tab" aria-selected={filtro === '*'} onClick={() => setFiltro('*')}>Todas as fotos ({fotos.length})</button>
          {evento.cidades.map((c) => <button key={c._id} type="button" role="tab" aria-selected={filtro === c._id} onClick={() => setFiltro(c._id)} {...alvoDe(c._id)}>{cad.nomeItem('cidade', c)} ({contar(c._id)})</button>)}
          <button type="button" role="tab" aria-selected={filtro === ''} onClick={() => setFiltro('')} {...alvoDe('')}>Em todas ({contar('')})</button>
        </div>
      )}
      {fotos.length > 0 && (sel.size ? (
        <div className="galeria-sel">
          <b>{sel.size} selecionada{sel.size === 1 ? '' : 's'}</b>
          <span className="small muted">arraste para a aba de uma cidade ou</span>
          <Escolha valor="*" opcoes={cidades} vazio="Mover para…" rotulo="Mover as selecionadas para" compacto mudar={(c) => moverPara(sel, c)} />
          {confirmar === '*sel' ? (
            <span className="row" style={{ gap: 4 }}>
              <button className="btn sm danger-fill" type="button" onClick={() => { const s = sel; mudar((l) => l.filter((x) => !s.has(x.id))); setSel(new Set()); setConfirmar(null); }}>Tirar {sel.size}</button>
              <button className="btn sm ghost" type="button" onClick={() => setConfirmar(null)}>Não</button>
            </span>
          ) : <button className="btn sm ghost" type="button" onClick={() => setConfirmar('*sel')}>Tirar</button>}
          <button className="btn sm ghost" type="button" onClick={() => setSel(new Set())} title="Esc">Limpar seleção</button>
        </div>
      ) : <p className="small muted" style={{ margin: 0 }}>Clique numa foto para escolher; Ctrl+clique escolhe várias (Shift+clique, um intervalo). Depois arraste para a aba da cidade.</p>)}

      {!fotos.length ? (
        <div className="drop" onClick={() => input.current?.click()} role="button" tabIndex={0}>
          <b style={{ color: 'var(--ink)' }}>Nenhuma foto ainda</b>
          <span className="small">Escolha a cidade acima e envie várias fotos de uma vez.</span>
        </div>
      ) : (
        <div className="galeria-grade">
          {visiveis.map(({ f, i }) => {
            const a = porCaminho.get(f.arquivo);
            const src = a ? urlArquivo(a.sha, a.caminho) : '';
            const marcada = sel.has(f.id);
            return (
              <div key={f.id} className={'galeria-item' + (marcada ? ' sel' : '')}>
                <div className="galeria-item__img" role="checkbox" aria-checked={marcada} aria-label={`Foto ${i + 1}`} tabIndex={0} draggable
                  onClick={(e) => clicar(e, f.id)}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); clicar({ ctrlKey: true, metaKey: false, shiftKey: e.shiftKey }, f.id); } }}
                  onDragStart={(e) => {
                    const ids = marcada ? [...sel] : [f.id];
                    if (!marcada) setSel(new Set([f.id]));
                    e.dataTransfer.setData(TIPO_ARRASTO, JSON.stringify(ids));
                    e.dataTransfer.effectAllowed = 'move';
                  }}>
                  {ehVideo(f.arquivo) ? <video src={src} muted preload="metadata" draggable={false} /> : <img src={src} alt="" loading="lazy" draggable={false} />}
                  <span className="galeria-item__n">{i + 1}</span>
                  {marcada && <span className="galeria-item__ok" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
                </div>
                <Escolha valor={f.cidade || ''} opcoes={cidades} rotulo="Cidade da foto" compacto mudar={(c) => moverPara(marcada ? sel : [f.id], c)} />
                <input className="inp" value={f.legenda || ''} placeholder="Legenda (opcional)" aria-label="Legenda" onChange={(e) => mudar((l) => l.map((x) => (x.id === f.id ? { ...x, legenda: e.target.value } : x)))} />
                <div className="row between" style={{ gap: 4 }}>
                  <span className="row" style={{ gap: 2 }}>
                    <button className="btn sm ghost" type="button" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Antes">←</button>
                    <button className="btn sm ghost" type="button" disabled={i === fotos.length - 1} onClick={() => mover(i, 1)} aria-label="Depois">→</button>
                  </span>
                  {confirmar === f.id ? (
                    <span className="row" style={{ gap: 4 }}>
                      <button className="btn sm danger-fill" type="button" onClick={() => { setConfirmar(null); mudar((l) => l.filter((x) => x.id !== f.id)); }}>Tirar</button>
                      <button className="btn sm ghost" type="button" onClick={() => setConfirmar(null)}>Não</button>
                    </span>
                  ) : <button className="btn sm ghost" type="button" onClick={() => setConfirmar(f.id)}>Tirar</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
