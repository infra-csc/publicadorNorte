'use client';
import { acharArquivo, acharVars, FORMATOS, NOME_PAGINA, normRef, refsDeArquivo, temCardsFixos, verificarHtml, type ResultadoConversao, type TipoPagina } from '@norte/motor';
import { useMemo, useRef, useState } from 'react';
import { arquivoAceito, caminhoGuardado, tamanho } from '@/lib/comum/arquivos';
import { api, json } from '../api';
import { lerSoltos, temArquivos, type ArquivoSolto } from '../arrastarPasta';
import { comSha, enviarMidia, juntar, repetidos, type ItemEnvio } from '../enviarMidia';
import { Cabecalho, NavPassos, useEditor, varsSincronizadas } from '../Editor';

const DESC_PAG: Record<TipoPagina, string> = {
  unica: 'A página do site. Sai um index.html com os valores do cadastro.',
  tapume: 'A página home. Gera uma página só, o index.html.',
  praca: 'A página de cada cidade. Vira uma página para cada cidade cadastrada.',
  etapa: 'A página interna de cada etapa. Vira uma página para cada etapa de cada cidade.',
  pos_unica: 'Entra no lugar da página (mesmo endereço) quando o pós-evento é ligado.',
  pos_praca: 'Entra no lugar da página de cada cidade em que o pós-evento for ligado (mesmo endereço).',
  pos_etapa: 'Entra no lugar da página de cada etapa em que o pós-evento for ligado (mesmo endereço).',
};

const basesDe = (html?: string) => new Set(html == null ? [] : acharVars(html).map((o) => o.base));

function baixar(nome: string, texto: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'text/html' }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function CartaoPagina({ tipo }: { tipo: TipoPagina }) {
  const { evento, modelos, setModelo, alterar } = useEditor();
  const html = modelos[tipo];
  const reg = evento.paginas[tipo];
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<React.ReactNode>(null);
  const [erro, setErro] = useState('');
  const problemas = useMemo(() => (html == null ? [] : verificarHtml(html, tipo)), [html, tipo]);
  const nVars = useMemo(() => basesDe(html).size, [html]);
  const fixos = tipo === 'tapume' && html != null ? temCardsFixos(html) : 0;

  async function gravar(texto: string, arquivo: string, conv: ResultadoConversao | null) {
    const antes = html != null ? basesDe(html) : null;
    await api(`/api/hotsites/${evento.slug}/modelos/${tipo}`, { method: 'PUT', body: texto, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    setModelo(tipo, texto);
    const novos = { ...modelos, [tipo]: texto };
    alterar((e) => {
      e.paginas[tipo] = { arquivo, bytes: texto.length, enviadoEm: new Date().toISOString(), ...(conv?.html ? { convertido: true } : {}) };
      e.vars = varsSincronizadas(e, novos);
      // cards fixos convertidos: pré-preenche o cadastro com uma linha por card (grupo e status)
      if (conv?.prefill && !e.cidades.length) {
        e.cidades = conv.prefill.map((p) => ({
          _id: crypto.randomUUID().slice(0, 8),
          ...(conv.col && p.grupo ? { [conv.col]: p.grupo } : {}),
          ...(p.status && p.status === conv.status?.aberta ? { status: 'aberta' } : {}),
        }));
      }
    });
    const depois = basesDe(texto);
    const partes: React.ReactNode[] = [];
    if (conv?.html) partes.push(<span key="c"><b>Este HTML tinha {conv.cards} cards fixos.</b> Agora é um card só, que se repete para cada cidade cadastrada{conv.col ? <>, separado por <span className="v">@{conv.col}</span></> : null}. As contagens viraram automáticas. </span>);
    if (conv?.erro) partes.push(<span key="e"><b>Este HTML tem cards fixos numerados.</b> {conv.erro} </span>);
    if (antes) {
      const novas = [...depois].filter((b) => !antes.has(b));
      const sairam = [...antes].filter((b) => !depois.has(b));
      partes.push(novas.length || sairam.length
        ? <span key="d">Arquivo trocado. {novas.length > 0 && <>Novas: {novas.map((b) => <span key={b} className="v">@{b}</span>)}. </>}{sairam.length > 0 && <>Saíram: {sairam.map((b) => <span key={b} className="v">@{b}</span>)} (os valores ficam guardados). </>}</span>
        : <span key="d">Arquivo trocado. As variáveis são as mesmas, o cadastro continua valendo.</span>);
    }
    setAviso(partes.length ? <>{partes}</> : null);
  }

  async function receber(file: File | undefined) {
    if (!file) return;
    setErro('');
    if (!/\.html?$/i.test(file.name)) return setErro('Esse arquivo não é .html');
    setEnviando(true);
    try {
      let texto = await file.text();
      let conv: ResultadoConversao | null = null;
      if (tipo === 'tapume' && temCardsFixos(texto)) {
        conv = await api<ResultadoConversao>('/api/converter', { method: 'POST', body: texto });
        if (conv.html) texto = conv.html;
      }
      await gravar(texto, file.name, conv);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function converter() {
    if (html == null) return;
    setEnviando(true);
    try {
      const conv = await api<ResultadoConversao>('/api/converter', { method: 'POST', body: html });
      if (conv.html) await gravar(conv.html, reg?.arquivo || 'tapume.html', conv);
      else setAviso(<span><b>Não deu para converter.</b> {conv.erro}</span>);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const input = <input type="file" accept=".html,.htm,text/html" className="sr" onChange={(e) => { receber(e.target.files?.[0]); e.target.value = ''; }} />;
  return (
    <section className="card stack" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); receber(e.dataTransfer.files[0]); }}>
      <div className="row between">
        <div><h3>{NOME_PAGINA[tipo]}</h3><p className="small muted">{DESC_PAG[tipo]}</p></div>
        {html != null && (problemas.length ? <span className="pill warn">{problemas.length} ponto(s) a conferir</span> : <span className="pill ok">HTML conferido</span>)}
      </div>
      {html == null ? (
        <label className="drop">
          <b style={{ color: 'var(--ink)' }}>{enviando ? 'Enviando…' : 'Escolher o HTML'}</b>
          <span className="small">ou arraste o arquivo para cá</span>
          {input}
        </label>
      ) : (
        <div className="file">
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 600 }}>{reg?.arquivo || NOME_PAGINA[tipo] + '.html'}{reg?.convertido && <span className="pill" style={{ marginLeft: 8 }}>convertido</span>}</div>
            <div className="small muted">{nVars} variáveis · {tamanho(html.length)}</div>
          </div>
          <label className="btn sm">{enviando ? 'Enviando…' : 'Trocar arquivo'}{input}</label>
          {reg?.convertido && <button className="btn sm ghost" type="button" onClick={() => baixar((reg.arquivo || 'tapume').replace(/\.html?$/i, '') + '-blocos.html', html)}>Baixar HTML convertido</button>}
        </div>
      )}
      {erro && <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>}
      {aviso && <div className="w-item info"><span className="ic">i</span><div>{aviso}</div></div>}
      {fixos > 0 && (
        <div className="w-item warn"><span className="ic">!</span><div>
          <b>Este tapume tem {fixos} cards fixos</b>Os cards sem cidade saem vazios e o status não muda. Transforme num card que se repete para cada cidade cadastrada.{' '}
          <button className="btn sm" type="button" onClick={converter} disabled={enviando}>Transformar em card que se repete</button>
        </div></div>
      )}
      {problemas.length > 0 && (
        <details>
          <summary className="small"><b>Conferência do HTML</b>: {problemas.length} ponto(s) fora do guia. Mostre para quem montou o HTML.</summary>
          <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {problemas.map((p, i) => <li key={i}><span className="mono muted">linha {p.linha}</span> — {p.mensagem}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

function CartaoMidia() {
  const { evento, modelos, arquivos, setArquivos } = useEditor();
  const [progresso, setProgresso] = useState('');
  const [erro, setErro] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  // pasta enviada de novo: arquivos de mesmo nome esperando a escolha (substituir ou manter o atual)
  const [pendente, setPendente] = useState<{ itens: ItemEnvio[]; repetidos: string[]; marcados: Set<string>; ignorados: number } | null>(null);
  const total = arquivos.reduce((s, a) => s + a.bytes, 0);
  const { refs, faltam } = useMemo(() => {
    const r = new Set<string>();
    for (const h of Object.values(modelos)) if (h != null) refsDeArquivo(h).forEach((x) => r.add(normRef(x)));
    const caminhos = arquivos.map((a) => a.caminho);
    return { refs: r.size, faltam: [...r].filter((x) => !acharArquivo(x, caminhos)) };
  }, [modelos, arquivos]);

  const [arrastando, setArrastando] = useState(false);
  const profundidade = useRef(0);
  const receber = (lista: FileList | null) =>
    lista?.length ? receberSoltos([...lista].map((f) => ({ file: f, rel: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name }))) : undefined;

  async function receberSoltos(lista: ArquivoSolto[]) {
    if (!lista.length) return;
    setErro('');
    const todos = lista.map((x) => ({ f: x.file, caminho: caminhoGuardado(x.rel) }));
    const aceitos = todos.filter((x) => arquivoAceito(x.caminho));
    const ignorados = todos.length - aceitos.length;
    if (!aceitos.length) return setErro('Nenhuma imagem, vídeo ou fonte nessa seleção.');
    try {
      const itens = await comSha(aceitos.map((x) => ({ file: x.f, caminho: x.caminho })), setProgresso);
      const rep = repetidos(itens, arquivos);
      if (rep.length) {
        setProgresso('');
        return setPendente({ itens, repetidos: rep, marcados: new Set(), ignorados });
      }
      await enviar(itens, ignorados, 0);
    } catch (e) {
      setErro((e as Error).message);
      setProgresso('');
    }
  }

  /** envia o que foi escolhido; `mantidos`: repetidos em que ficou o arquivo que já estava no projeto */
  async function enviar(itens: ItemEnvio[], ignorados: number, mantidos: number) {
    setErro('');
    try {
      const r = await enviarMidia(evento.slug, itens, arquivos, setProgresso);
      if (r.novos.length) setArquivos(juntar(arquivos, r.novos));
      setProgresso(`${r.novos.length} arquivo(s) enviado(s)` + (r.pulados ? ` · ${r.pulados} já estavam guardados` : '') + (mantidos ? ` · ${mantidos} mantido(s) como estavam` : '') + (ignorados ? ` · ${ignorados} ignorados (não são imagem, vídeo ou fonte)` : '') + '. Os arquivos que já estavam no projeto continuam lá.');
      if (r.grandes.length) setErro('Acima de 100 MB, o GitHub não aceita: ' + r.grandes.join(', ') + '. Comprima e envie de novo.');
    } catch (e) {
      setErro((e as Error).message);
      setProgresso('');
    }
  }

  /** `trocar`: caminhos repetidos que passam a valer o arquivo novo; os outros ficam como estavam */
  function decidir(trocar: Set<string>) {
    if (!pendente) return;
    const { itens, repetidos: rep, ignorados } = pendente;
    setPendente(null);
    const manter = new Set(rep.filter((c) => !trocar.has(c)));
    const escolhidos = itens.filter((x) => !manter.has(x.caminho));
    if (!escolhidos.length) return setProgresso(`Nada enviado · ${manter.size} mantido(s) como estavam.`);
    enviar(escolhidos, ignorados, manter.size);
  }
  const marcar = (c: string, sim: boolean) =>
    setPendente((p) => { if (!p) return p; const m = new Set(p.marcados); if (sim) m.add(c); else m.delete(c); return { ...p, marcados: m }; });

  async function remover() {
    setConfirmar(false);
    try {
      await api(`/api/hotsites/${evento.slug}/midia`, { method: 'DELETE' });
      setArquivos([]);
      setProgresso('Arquivos removidos.');
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const inputPasta = <input type="file" multiple className="sr" {...{ webkitdirectory: '' }} onChange={(e) => { receber(e.target.files); e.target.value = ''; }} />;
  const inputSoltos = <input type="file" multiple className="sr" onChange={(e) => { receber(e.target.files); e.target.value = ''; }} />;
  // arrastar a pasta (ou arquivos) para qualquer lugar deste cartão
  const soltar = {
    onDragEnter: (e: React.DragEvent) => { if (!temArquivos(e)) return; e.preventDefault(); profundidade.current++; setArrastando(true); },
    onDragOver: (e: React.DragEvent) => { if (!temArquivos(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; },
    onDragLeave: () => { profundidade.current = Math.max(0, profundidade.current - 1); if (!profundidade.current) setArrastando(false); },
    onDrop: async (e: React.DragEvent) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      profundidade.current = 0;
      setArrastando(false);
      setProgresso('Lendo a pasta…');
      try { await receberSoltos(await lerSoltos(e.dataTransfer)); } catch (x) { setErro('Não deu para ler o que foi arrastado: ' + (x as Error).message); setProgresso(''); }
    },
  };
  return (
    <section className={'card stack' + (arrastando ? ' card-soltar' : '')} {...soltar}>
      <div className="row between">
        <div><h3>Imagens, vídeos e arquivos do site</h3>
          <p className="small muted">Envie (ou arraste para cá) a pasta <b>_media</b> ou a pasta do site que contém a _media. Com ela, a prévia mostra tudo e você troca imagens e vídeos no passo Mídia.</p></div>
        {arquivos.length ? (faltam.length ? <span className="pill warn">Faltam {faltam.length}</span> : <span className="pill ok">Tudo encontrado</span>) : refs ? <span className="pill warn">Falta enviar</span> : null}
      </div>
      {arquivos.length ? (
        <div className="file">
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 600 }}>{arquivos.length} arquivo(s) · {tamanho(total)}</div>
            <div className="small muted">{refs ? `${refs - faltam.length} de ${refs} caminhos dos HTMLs encontrados` : 'Os HTMLs ainda não apontam para nenhum arquivo'}</div>
          </div>
          <label className="btn sm">Adicionar pasta{inputPasta}</label>
          <label className="btn sm ghost">Arquivos soltos{inputSoltos}</label>
          {confirmar ? (
            <span className="row" style={{ gap: 6 }}>
              <button className="btn sm danger-fill" type="button" onClick={remover}>Remover todos</button>
              <button className="btn sm ghost" type="button" onClick={() => setConfirmar(false)}>Cancelar</button>
            </span>
          ) : <button className="btn sm ghost" type="button" onClick={() => setConfirmar(true)}>Remover</button>}
        </div>
      ) : (
        <div className="row">
          <label className="drop" style={{ flex: 1 }}>
            <b style={{ color: 'var(--ink)' }}>{arrastando ? 'Solte a pasta aqui' : 'Arraste a pasta _media para cá ou clique para escolher'}</b>
            <span className="small">Imagens, vídeos e fontes. Outros arquivos são ignorados.</span>
            {inputPasta}
          </label>
          <label className="btn sm">Ou escolher arquivos soltos{inputSoltos}</label>
        </div>
      )}
      {pendente && (
        <div className="w-item warn"><span className="ic">!</span><div className="stack" style={{ gap: 8 }}>
          <span><b>{pendente.repetidos.length} arquivo(s) com o mesmo nome de um que já está no projeto</b>Marque os que devem ser trocados pela versão nova. Os outros arquivos novos entram normalmente e nada do que já está no projeto é apagado.</span>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pendente.repetidos.map((c) => {
              const atual = arquivos.find((a) => a.caminho === c);
              const novo = pendente.itens.find((x) => x.caminho === c);
              return (
                <label key={c} className="row small" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <input type="checkbox" checked={pendente.marcados.has(c)} onChange={(e) => marcar(c, e.target.checked)} />
                  <span className="mono" style={{ overflowWrap: 'anywhere' }}>{c}</span>
                  <span className="muted" style={{ whiteSpace: 'nowrap' }}>{atual ? tamanho(atual.bytes) : ''} → {novo ? tamanho(novo.file.size) : ''}</span>
                </label>
              );
            })}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm" type="button" onClick={() => decidir(new Set(pendente.repetidos))}>Substituir todos</button>
            <button className="btn sm" type="button" disabled={!pendente.marcados.size} onClick={() => decidir(pendente.marcados)}>Substituir selecionados ({pendente.marcados.size})</button>
            <button className="btn sm ghost" type="button" onClick={() => decidir(new Set())}>Manter os atuais</button>
            <button className="btn sm ghost" type="button" onClick={() => setPendente(null)}>Cancelar envio</button>
          </div>
        </div></div>
      )}
      {progresso && <p className="small muted">{progresso}</p>}
      {erro && <div className="w-item bad"><span className="ic">✕</span><div>{erro}</div></div>}
      {faltam.length > 0 && arquivos.length > 0 && (
        <details className="small"><summary>{faltam.length} caminho(s) sem arquivo</summary>
          <p className="muted mono" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>{faltam.map((f) => <span key={f}>{f}<br /></span>)}</p>
        </details>
      )}
    </section>
  );
}

export function PassoPaginas() {
  const { evento } = useEditor();
  return (
    <>
      <Cabecalho passo="paginas" titulo="Páginas">Envie um HTML para cada tipo de página e a pasta de mídia. O publicador confere o HTML e mostra o que estiver fora do guia.</Cabecalho>
      {FORMATOS[evento.formato].paginas.map((k) => <CartaoPagina key={k} tipo={k} />)}
      <CartaoMidia />
      <NavPassos passo="paginas" />
    </>
  );
}
