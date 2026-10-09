'use client';
import { arquivoDaEscolha, ehMidia, FORMATOS, ordemFinal, midiaEscondida, NOME_PAGINA, OCULTA, opcoesMidia, pastasMidia, secaoMidia, sincronizarVars, slotMidia, type OpcaoMidia, type TipoPagina } from '@norte/motor';
import { useDeferredValue, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import { api, json, urlArquivo } from '../api';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { enviarMidia, juntar, nomeLivre } from '../enviarMidia';
import { Previa } from '../Previa';
import { Alca, mover, useReordenar } from '../Reordenar';

const ehVideo = (c: string) => /\.(mp4|webm)$/i.test(c);
const ehImagem = (c: string) => /\.(webp|png|jpe?g|gif|avif|svg)$/i.test(c);
const PASTA_PAG: Record<TipoPagina, string> = { tapume: 'tapume', praca: 'praca', etapa: 'etapa', unica: 'pagina' };

/** que arquivos cada lugar aceita: @img_ só imagem, @video_ só vídeo, @media_ (e a seção) os dois */
function aceita(base: string | null) {
  const t = base?.split('_')[0];
  return {
    ok: (nome: string) => (t === 'img' ? ehImagem(nome) : t === 'video' ? ehVideo(nome) : ehImagem(nome) || ehVideo(nome)),
    accept: t === 'img' ? 'image/*' : t === 'video' ? 'video/*' : 'image/*,video/*',
    texto: t === 'img' ? 'imagens' : t === 'video' ? 'vídeos' : 'imagens ou vídeos',
  };
}

export function PassoMidia() {
  const { evento, modelos, arquivos, setArquivos, det, cad, alterar, banco } = useEditor();
  const paginas = FORMATOS[evento.formato].paginas.filter((k) => modelos[k] != null);
  const [pag, setPag] = useState<TipoPagina>(paginas.includes('praca') ? 'praca' : paginas[0]);
  const [linhaId, setLinhaId] = useState<string>(evento.cidades[0]?._id || '');
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [status, setStatus] = useState<{ onde: string; texto: string; erro?: boolean } | null>(null);
  const [excluir, setExcluir] = useState<string | null>(null);
  const caminhos = useMemo(() => arquivos.map((a) => a.caminho), [arquivos]);
  const porCaminho = useMemo(() => new Map(arquivos.map((a) => [a.caminho, a])), [arquivos]);

  // variáveis de mídia desta página, por seção
  const secoes = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of det.variaveis.values()) {
      if (!ehMidia(d.base) || !(pag in d.por) || cad.vars[d.base]?.ignorar || cad.vars[d.base]?.excluida) continue;
      const s = secaoMidia(d.base);
      m.set(s, [...(m.get(s) || []), d.base]);
    }
    // na ordem arrumada na tela (só no publicador; o site não muda)
    const nomes = ordemFinal([...m.keys()].sort((a, b) => a.localeCompare(b)), evento.ordemMidia?.[pag]);
    return nomes.map((s) => [s, m.get(s)!] as const);
  }, [det, pag, cad.vars, evento.ordemMidia]);

  const reordenar = (de: number, para: number) =>
    alterar((e) => { e.ordemMidia = { ...(e.ordemMidia || {}), [pag]: mover(secoes.map(([s]) => s), de, para) }; });
  const { alca, alvo } = useReordenar(reordenar);

  const tipoLinha = (b: string) => (cad.vars[b]?.dono === 'etapa' ? 'etapa' : 'cidade');
  const linhaDe = (b: string) => (tipoLinha(b) === 'etapa' ? evento.etapas.find((e) => e._cidade === linhaId) || evento.etapas[0] : evento.cidades.find((c) => c._id === linhaId));

  function escolher(b: string, caminho: string) {
    alterar((e) => {
      e.vars = sincronizarVars(det, e.vars);
      if (e.vars[b].dono === 'geral') e.imagens[b] = caminho;
      else {
        const l = linhaDe(b);
        const alvo = (tipoLinha(b) === 'etapa' ? e.etapas : e.cidades).find((x) => x._id === l?._id);
        if (alvo) alvo[b] = caminho;
      }
    });
  }

  /** passa a mídia para "uma escolha por cidade" (ou volta para a mesma em todas). As escolhas feitas ficam guardadas. */
  function porCidade(b: string, sim: boolean) {
    alterar((e) => {
      e.vars = sincronizarVars(det, e.vars);
      // a escolha que estava valendo para todas vira a base de quem ainda não escolheu
      if (sim && e.vars[b].dono === 'geral' && !e.imagens[b]) e.imagens[b] = cad.valorDe(null, b);
      e.vars[b].dono = sim ? (e.formato === 'tapume_etapa_praca' && det.variaveis.get(b)?.por.etapa && !det.variaveis.get(b)?.por.praca ? 'etapa' : 'cidade') : 'geral';
      e.vars[b].manual = true;
    });
  }

  /**
   * Arquivos soltos numa seção (vão para _media/<pagina>/<secao>/, com o nome limpo)
   * ou num lugar (mesma pasta, nome do lugar, e já ficam escolhidos para ele).
   */
  async function receber(lista: FileList | File[] | null, secao: string, base: string | null) {
    const onde = base || 'secao:' + secao;
    setArrastando(null);
    const todos = [...(lista || [])];
    if (!todos.length) return;
    const regra = aceita(base);
    const bons = todos.filter((f) => regra.ok(f.name));
    if (!bons.length) return setStatus({ onde, texto: `Aqui só entram ${regra.texto}.`, erro: true });
    const pasta = `_media/${PASTA_PAG[pag]}/${secao}/`;
    const ocupados = new Set(caminhos);
    const itens = bons.map((file) => ({ file, caminho: nomeLivre(pasta, base ? slotMidia(base) : file.name.replace(/\.[^.]+$/, ''), file.name, ocupados) }));
    try {
      const r = await enviarMidia(evento.slug, itens, arquivos, (texto) => setStatus({ onde, texto }));
      if (r.novos.length) setArquivos(juntar(arquivos, r.novos));
      const primeiro = r.porPedido.get(itens[0].caminho);
      if (base && primeiro) escolher(base, primeiro.caminho);
      const ignorados = todos.length - bons.length;
      setStatus({
        onde,
        texto: `${r.novos.length} arquivo(s) adicionado(s) em ${pasta}` + (base && primeiro ? ` · ${primeiro.caminho.split('/').pop()} escolhido` : '') + (ignorados ? ` · ${ignorados} ignorado(s): aqui só entram ${regra.texto}` : ''),
        erro: r.grandes.length > 0,
      });
      if (r.grandes.length) setStatus({ onde, texto: 'Acima de 100 MB, o GitHub não aceita: ' + r.grandes.join(', '), erro: true });
    } catch (e) {
      setStatus({ onde, texto: (e as Error).message, erro: true });
    }
  }

  /** a escolha guardada do lugar (geral ou da cidade selecionada), escondida ou não */
  function escolhaDe(b: string): string | undefined {
    if (cad.vars[b]?.dono === 'geral') return evento.imagens[b];
    return linhaDe(b)?.[b] || evento.imagens[b];
  }

  /** esconde a mídia do lugar (a tag sai da página) ou mostra de novo o mesmo arquivo */
  function esconder(b: string, caminho: string) {
    const atual = escolhaDe(b);
    escolher(b, midiaEscondida(atual) && arquivoDaEscolha(atual) === caminho ? caminho : OCULTA + caminho);
  }

  async function apagar(caminho: string) {
    setExcluir(null);
    try {
      await api(`/api/hotsites/${evento.slug}/midia`, json('DELETE', { caminhos: [caminho] }));
      setArquivos(arquivos.filter((a) => a.caminho !== caminho));
      // escolhas que apontavam para o arquivo voltam ao padrão
      alterar((e) => {
        const aponta = (v: string | undefined) => v === caminho || v === OCULTA + caminho;
        for (const [k, v] of Object.entries(e.imagens)) if (aponta(v)) delete e.imagens[k];
        for (const l of [...e.cidades, ...e.etapas]) for (const [k, v] of Object.entries(l)) if (aponta(v) && !k.startsWith('_')) delete l[k];
      });
    } catch (e) {
      setStatus({ onde: 'geral', texto: (e as Error).message, erro: true });
    }
  }

  const ev = useDeferredValue(evento);
  const resultado = useMemo(() => gerarEvento(ev, modelos, arquivos, banco), [ev, modelos, arquivos, banco]);
  const pagina = resultado.paginas.find((p) => p.tipo === pag && (pag === 'tapume' || pag === 'unica' || p.cidadeId === linhaId)) || resultado.paginas.find((p) => p.tipo === pag);

  /** propriedades de uma área que aceita arquivos arrastados */
  const alvoDrop = (chave: string, secao: string, base: string | null) => ({
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.stopPropagation(); setArrastando(chave); } },
    onDragLeave: (e: React.DragEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setArrastando((a) => (a === chave ? null : a)); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); receber(e.dataTransfer.files, secao, base); },
  });
  const msg = (onde: string) => status?.onde === onde && <p className="small" style={{ color: status.erro ? 'var(--bad)' : 'var(--mute)' }}>{status.texto}</p>;

  const miniatura = ({ o, b, marcada, escondida, desativada }: { o: OpcaoMidia; b: string; marcada: boolean; escondida: boolean; desativada: boolean }) => {
    const a = porCaminho.get(o.arquivo);
    const src = a ? urlArquivo(a.sha, a.caminho) : '';
    const nome = o.caminho.split('/').pop();
    return (
      <div key={o.caminho} className={'thumbw' + (escondida ? ' escondida' : '')}>
        <button type="button" role="radio" className="thumb" aria-checked={marcada} disabled={desativada} onClick={() => escolher(b, o.caminho)} title={o.caminho}>
          {ehVideo(o.caminho) ? <video src={src} preload="metadata" muted /> : <img src={src} alt="" loading="lazy" />}
          <span>{escondida ? 'escondida' : nome}</span>
        </button>
        <span className="thumb-icones">
          <button type="button" className={'ico' + (escondida ? ' on' : '')} disabled={desativada} aria-label={escondida ? `Mostrar ${nome} neste lugar` : `Esconder a mídia deste lugar (${nome})`}
            title={escondida ? 'Mostrar de novo' : 'Esconder: o lugar fica sem imagem ou vídeo'} onClick={() => esconder(b, o.caminho)}>
            {escondida ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
          <button type="button" className="ico perigo" aria-label={`Excluir ${nome}`} title="Excluir o arquivo" onClick={() => setExcluir(o.arquivo)}><IconeLixeira /></button>
        </span>
        {excluir === o.arquivo && (
          <div className="thumb-conf">
            <span>Excluir {nome}? Sai da pasta e de todos os lugares.</span>
            <button className="btn sm danger-fill" type="button" onClick={() => apagar(o.arquivo)}>Excluir</button>
            <button className="btn sm ghost" type="button" onClick={() => setExcluir(null)}>Não</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Cabecalho passo="midia" titulo="Mídia">Escolha a imagem ou o vídeo de cada lugar. Arraste arquivos do computador para um bloco ou direto para um lugar. Arraste a alça ⠿ para arrumar os blocos na tela (o site não muda).</Cabecalho>
      <div className="row">
        <div className="seg" role="group" aria-label="Página">
          {paginas.map((k) => <button key={k} type="button" aria-pressed={pag === k} onClick={() => setPag(k)}>{NOME_PAGINA[k]}</button>)}
        </div>
        {evento.cidades.length > 0 && (
          <label className="row small" style={{ gap: 6 }}>Cidade:
            <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} value={linhaId} onChange={(e) => setLinhaId(e.target.value)}>
              {evento.cidades.map((c) => <option key={c._id} value={c._id}>{cad.nomeItem('cidade', c)}</option>)}
            </select>
          </label>
        )}
      </div>
      {msg('geral')}
      <div className="split">
        <div className="stack" style={{ minWidth: 0 }}>
          {!secoes.length && <div className="card empty">Esta página não tem imagens ou vídeos trocáveis (variáveis @img_, @video_ ou @media_).</div>}
          {secoes.map(([s, bases], i) => (
            <section key={s} className={'img-sec' + (arrastando === 'secao:' + s ? ' drop-on' : '')} {...juntarAlvos(alvo(i), alvoDrop('secao:' + s, s, null))}>
              <div className="row between">
                <h2 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Alca i={i} total={secoes.length} alca={alca} mover={reordenar} rotulo={s} />{s} <span className="mono small muted">_media/{PASTA_PAG[pag]}/{s}/</span></h2>
                <label className="btn sm ghost">+ Adicionar à pasta
                  <input type="file" multiple accept="image/*,video/*" className="sr" onChange={(e) => { receber(e.target.files, s, null); e.target.value = ''; }} />
                </label>
              </div>
              {arrastando === 'secao:' + s && <p className="small" style={{ color: 'var(--accent)' }}>Solte para adicionar na pasta {s}/</p>}
              {msg('secao:' + s)}
              {bases.map((b) => {
                const ops = opcoesMidia(b, det, caminhos);
                const geral = cad.vars[b]?.dono === 'geral';
                const l = geral ? null : linhaDe(b);
                // o mesmo valor que vai para a página (por cidade sem escolha = escolha geral)
                const valor = geral || !l ? cad.valorDe(null, b) : cad.valorDe(l, b);
                const guardada = escolhaDe(b);
                const escondida = midiaEscondida(guardada);
                const atual = escondida ? arquivoDaEscolha(guardada) : valor;
                const herdada = !geral && l && !l[b];
                // no tapume, só faz sentido escolher por cidade dentro do card que se repete
                const podePorCidade = evento.cidades.length > 0 && (pag !== 'tapume' || !!det.variaveis.get(b)?.laco);
                const regra = aceita(b);
                return (
                  <div key={b} className={'img-slot' + (arrastando === b ? ' drop-on' : '')} {...alvoDrop(b, s, b)}>
                    <div className="row between" style={{ gap: 8 }}>
                      <span className="row" style={{ gap: 8 }}>
                        <span className="v">@{b}</span>
                        <span className="small muted">
                          {geral ? 'a mesma em todas as cidades' : `escolha de ${l ? cad.nomeItem(tipoLinha(b), l) : '—'}${herdada ? ' (usando a escolha geral)' : ''}`}
                          {escondida && <b style={{ color: 'var(--warn)' }}> · escondida: o lugar fica sem mídia</b>}
                        </span>
                      </span>
                      {podePorCidade && (
                        <span className="seg" role="group" aria-label={`Como escolher @${b}`}>
                          <button type="button" aria-pressed={geral} onClick={() => porCidade(b, false)}>Igual em todas</button>
                          <button type="button" aria-pressed={!geral} onClick={() => porCidade(b, true)}>Por cidade</button>
                        </span>
                      )}
                    </div>
                    <div className="thumbs" role="radiogroup" aria-label={b}>
                      {ops.map((o) => miniatura({ o, b, marcada: atual === o.caminho, escondida: escondida && atual === o.caminho, desativada: !geral && !l }))}
                      <label className="thumb thumb-novo" title={`Adicionar ${regra.texto} para @${b}`}>
                        <span className="mais">+</span>
                        <span>Arraste ou clique</span>
                        <input type="file" multiple accept={regra.accept} className="sr" onChange={(e) => { receber(e.target.files, s, b); e.target.value = ''; }} />
                      </label>
                    </div>
                    {!ops.length && <p className="small" style={{ color: 'var(--warn)' }}>Sem arquivo ainda. Arraste {regra.texto} para cá (ficam em <span className="mono">{pastasMidia(b, det).find((p) => p.startsWith('_media'))}</span>).</p>}
                    {msg(b)}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        <div className="lado"><Previa html={pagina?.html ?? null} titulo={pagina ? `${pagina.titulo} · ${pagina.arquivo}` : 'Prévia'} altura={560} /></div>
      </div>
      <NavPassos passo="midia" />
    </>
  );
}

const svg = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
function IconeOlho() {
  return <svg {...svg}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function IconeOlhoFechado() {
  return <svg {...svg}><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.3 6.3A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.7-1.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
}
function IconeLixeira() {
  return <svg {...svg}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></svg>;
}

type Alvo = Record<string, unknown>;
/** junta dois conjuntos de propriedades de arrastar: cada handler só age no seu tipo de arrasto */
function juntarAlvos(a: Alvo, b: Alvo): Alvo {
  const out: Alvo = { ...b, ...a };
  for (const k of ['onDragOver', 'onDragLeave', 'onDrop']) {
    const fa = a[k] as ((e: React.DragEvent) => void) | undefined;
    const fb = b[k] as ((e: React.DragEvent) => void) | undefined;
    if (fa && fb) out[k] = (e: React.DragEvent) => { fa(e); if (!e.defaultPrevented || k === 'onDragLeave') fb(e); };
  }
  return out;
}
