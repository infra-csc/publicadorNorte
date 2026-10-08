'use client';
import { ehMidia, FORMATOS, NOME_PAGINA, opcoesMidia, pastasMidia, secaoMidia, sincronizarVars, slotMidia, type OpcaoMidia, type TipoPagina } from '@norte/motor';
import { useDeferredValue, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import { api, json, urlArquivo } from '../api';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { enviarMidia, juntar, nomeLivre } from '../enviarMidia';
import { Previa } from '../Previa';
import { PainelSecoes } from './PainelSecoes';

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
  const { evento, modelos, arquivos, setArquivos, det, cad, alterar } = useEditor();
  const paginas = FORMATOS[evento.formato].paginas.filter((k) => modelos[k] != null);
  const [pag, setPag] = useState<TipoPagina>(paginas.includes('praca') ? 'praca' : paginas[0]);
  const [linhaId, setLinhaId] = useState<string>(evento.cidades[0]?._id || '');
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [status, setStatus] = useState<{ onde: string; texto: string; erro?: boolean } | null>(null);
  const [excluir, setExcluir] = useState<string | null>(null);
  const [verOcultas, setVerOcultas] = useState<Set<string>>(new Set());
  const caminhos = useMemo(() => arquivos.map((a) => a.caminho), [arquivos]);
  const porCaminho = useMemo(() => new Map(arquivos.map((a) => [a.caminho, a])), [arquivos]);
  const ocultos = useMemo(() => new Set(evento.midiaOculta || []), [evento.midiaOculta]);
  const visiveis = useMemo(() => caminhos.filter((c) => !ocultos.has(c)), [caminhos, ocultos]);

  // variáveis de mídia desta página, por seção
  const secoes = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of det.variaveis.values()) {
      if (!ehMidia(d.base) || !(pag in d.por) || cad.vars[d.base]?.ignorar || cad.vars[d.base]?.excluida) continue;
      const s = secaoMidia(d.base);
      m.set(s, [...(m.get(s) || []), d.base]);
    }
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [det, pag, cad.vars]);

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

  function esconder(caminho: string, sim: boolean) {
    alterar((e) => {
      const l = new Set(e.midiaOculta || []);
      if (sim) l.add(caminho);
      else l.delete(caminho);
      e.midiaOculta = [...l];
    });
  }

  async function apagar(caminho: string) {
    setExcluir(null);
    try {
      await api(`/api/eventos/${evento.slug}/midia`, json('DELETE', { caminhos: [caminho] }));
      setArquivos(arquivos.filter((a) => a.caminho !== caminho));
      // escolhas que apontavam para o arquivo voltam ao padrão
      alterar((e) => {
        e.midiaOculta = (e.midiaOculta || []).filter((c) => c !== caminho);
        for (const [k, v] of Object.entries(e.imagens)) if (v === caminho) delete e.imagens[k];
        for (const l of [...e.cidades, ...e.etapas]) for (const [k, v] of Object.entries(l)) if (v === caminho && !k.startsWith('_')) delete l[k];
      });
    } catch (e) {
      setStatus({ onde: 'geral', texto: (e as Error).message, erro: true });
    }
  }

  const ev = useDeferredValue(evento);
  const resultado = useMemo(() => gerarEvento(ev, modelos, arquivos), [ev, modelos, arquivos]);
  const pagina = resultado.paginas.find((p) => p.tipo === pag && (pag === 'tapume' || pag === 'unica' || p.cidadeId === linhaId)) || resultado.paginas.find((p) => p.tipo === pag);

  /** propriedades de uma área que aceita arquivos arrastados */
  const alvoDrop = (chave: string, secao: string, base: string | null) => ({
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.stopPropagation(); setArrastando(chave); } },
    onDragLeave: (e: React.DragEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setArrastando((a) => (a === chave ? null : a)); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); receber(e.dataTransfer.files, secao, base); },
  });
  const msg = (onde: string) => status?.onde === onde && <p className="small" style={{ color: status.erro ? 'var(--bad)' : 'var(--mute)' }}>{status.texto}</p>;

  const miniatura = ({ o, b, marcada, oculta, desativada }: { o: OpcaoMidia; b: string; marcada: boolean; oculta: boolean; desativada: boolean }) => {
    const a = porCaminho.get(o.arquivo);
    const src = a ? urlArquivo(a.sha, a.caminho) : '';
    const nome = o.caminho.split('/').pop();
    return (
      <div key={o.caminho} className="thumbw" style={oculta ? { opacity: 0.5 } : undefined}>
        <button type="button" role="radio" className="thumb" aria-checked={marcada} disabled={desativada || oculta} onClick={() => escolher(b, o.caminho)} title={o.caminho}>
          {ehVideo(o.caminho) ? <video src={src} preload="metadata" muted /> : <img src={src} alt="" loading="lazy" />}
          <span>{nome}</span>
        </button>
        {excluir === o.arquivo ? (
          <div className="thumb-conf">
            <span>Excluir {nome}? Sai da pasta e de todos os lugares.</span>
            <button className="btn sm danger-fill" type="button" onClick={() => apagar(o.arquivo)}>Excluir</button>
            <button className="btn sm ghost" type="button" onClick={() => setExcluir(null)}>Não</button>
          </div>
        ) : (
          <div className="thumb-acoes">
            {oculta
              ? <button type="button" title="Mostrar de novo nas opções" onClick={() => esconder(o.arquivo, false)}>Mostrar</button>
              : <button type="button" title="Tirar das opções (o arquivo continua guardado)" onClick={() => esconder(o.arquivo, true)}>Esconder</button>}
            <button type="button" title="Apagar o arquivo" onClick={() => setExcluir(o.arquivo)}>Excluir</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Cabecalho passo="midia" titulo="Mídia e seções">Escolha a imagem ou o vídeo de cada lugar e quais seções aparecem. Arraste arquivos do computador para uma seção ou direto para um lugar. Escolha a cidade no topo para fazer diferente numa cidade.</Cabecalho>
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
          <PainelSecoes pag={pag} linhaId={linhaId} />
          {!secoes.length && <div className="card empty">Esta página não tem imagens ou vídeos trocáveis (variáveis @img_, @video_ ou @media_).</div>}
          {secoes.map(([s, bases]) => (
            <section key={s} className={'img-sec' + (arrastando === 'secao:' + s ? ' drop-on' : '')} {...alvoDrop('secao:' + s, s, null)}>
              <div className="row between">
                <h2 style={{ fontSize: 16 }}>{s} <span className="mono small muted">_media/{PASTA_PAG[pag]}/{s}/</span></h2>
                <label className="btn sm ghost">+ Adicionar à pasta
                  <input type="file" multiple accept="image/*,video/*" className="sr" onChange={(e) => { receber(e.target.files, s, null); e.target.value = ''; }} />
                </label>
              </div>
              {arrastando === 'secao:' + s && <p className="small" style={{ color: 'var(--accent)' }}>Solte para adicionar na pasta {s}/</p>}
              {msg('secao:' + s)}
              {bases.map((b) => {
                const todas = opcoesMidia(b, det, caminhos);
                const ops = todas.filter((o) => !ocultos.has(o.arquivo));
                const escondidas = todas.filter((o) => ocultos.has(o.arquivo));
                const geral = cad.vars[b]?.dono === 'geral';
                const l = geral ? null : linhaDe(b);
                // o mesmo valor que vai para a página (por cidade sem escolha = escolha geral)
                const atual = geral || !l ? cad.valorDe(null, b) : cad.valorDe(l, b);
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
                      {ops.map((o) => miniatura({ o, b, marcada: atual === o.caminho, oculta: false, desativada: !geral && !l }))}
                      {verOcultas.has(b) && escondidas.map((o) => miniatura({ o, b, marcada: false, oculta: true, desativada: true }))}
                      <label className="thumb thumb-novo" title={`Adicionar ${regra.texto} para @${b}`}>
                        <span className="mais">+</span>
                        <span>Arraste ou clique</span>
                        <input type="file" multiple accept={regra.accept} className="sr" onChange={(e) => { receber(e.target.files, s, b); e.target.value = ''; }} />
                      </label>
                    </div>
                    {!ops.length && !todas.length && <p className="small" style={{ color: 'var(--warn)' }}>Sem arquivo ainda. Arraste {regra.texto} para cá (ficam em <span className="mono">{pastasMidia(b, det).find((p) => p.startsWith('_media'))}</span>).</p>}
                    {escondidas.length > 0 && (
                      <button className="btn sm ghost" type="button" style={{ alignSelf: 'start' }} onClick={() => setVerOcultas((v) => { const n = new Set(v); if (n.has(b)) n.delete(b); else n.add(b); return n; })}>
                        {verOcultas.has(b) ? 'Ocultar as escondidas' : `Ver escondidas (${escondidas.length})`}
                      </button>
                    )}
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
