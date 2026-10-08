'use client';
// Seções da página: ordem (arrastar muda a ordem na página gerada) e mostrar/esconder, no evento todo e por cidade.
import { FORMATOS, NOME_PAGINA, ordemFinal, RODAPE_HTML, secoesDe, temRodapeHtml, type TipoPagina } from '@norte/motor';
import { useDeferredValue, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import type { Evento } from '@/lib/comum/tipos';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { Previa } from '../Previa';
import { Alca, mover, useReordenar } from '../Reordenar';
import { EditorRodape } from './EditorRodape';

const garantir = (e: Evento) => (e.secoes ??= { ocultas: [], porLinha: {}, ordem: {} });

export function PassoSecoes() {
  const { evento, modelos, arquivos, cad, alterar, banco } = useEditor();
  const paginas = FORMATOS[evento.formato].paginas.filter((k) => modelos[k] != null);
  const [pag, setPag] = useState<TipoPagina>(paginas.includes('praca') ? 'praca' : paginas[0]);
  const [linhaId, setLinhaId] = useState<string>(evento.cidades[0]?._id || '');
  const html = modelos[pag];
  const detectadas = useMemo(() => (html == null ? [] : secoesDe(html)), [html]);
  // na ordem escolhida (as novas entram depois da que vinha antes delas no HTML)
  const secoes = useMemo(() => {
    const porId = new Map(detectadas.map((s) => [s.id, s]));
    return ordemFinal(detectadas.map((s) => s.id), evento.secoes?.ordem?.[pag]).map((id) => porId.get(id)!);
  }, [detectadas, evento.secoes?.ordem, pag]);

  const porCidade = pag !== 'tapume' && pag !== 'unica' && !!linhaId;
  const cidade = evento.cidades.find((c) => c._id === linhaId);
  const chave = (id: string) => `${pag}#${id}`;
  const ocultaGeral = (id: string) => (evento.secoes?.ocultas || []).includes(chave(id));
  const excecao = (id: string): boolean | undefined => evento.secoes?.porLinha?.[linhaId]?.[chave(id)];

  function setGeral(id: string, mostrar: boolean) {
    alterar((e) => {
      const s = garantir(e);
      const k = chave(id);
      s.ocultas = (s.ocultas || []).filter((x) => x !== k);
      if (!mostrar) s.ocultas.push(k);
    });
  }
  function setCidade(id: string, valor: 'igual' | 'mostrar' | 'esconder') {
    alterar((e) => {
      const s = garantir(e);
      const k = chave(id);
      const mapa = { ...(s.porLinha?.[linhaId] || {}) };
      if (valor === 'igual') delete mapa[k];
      else mapa[k] = valor === 'mostrar';
      s.porLinha = { ...(s.porLinha || {}), [linhaId]: mapa };
      if (!Object.keys(mapa).length) delete s.porLinha[linhaId];
    });
  }
  const reordenar = (de: number, para: number) =>
    alterar((e) => {
      const s = garantir(e);
      s.ordem = { ...(s.ordem || {}), [pag]: mover(secoes.map((x) => x.id), de, para) };
    });
  const { alca, alvo } = useReordenar(reordenar);
  const mudouOrdem = secoes.some((s, i) => s.id !== detectadas[i]?.id);
  const temRodape = useMemo(() => html != null && temRodapeHtml(html), [html]);

  const ev = useDeferredValue(evento);
  const resultado = useMemo(() => gerarEvento(ev, modelos, arquivos, banco), [ev, modelos, arquivos, banco]);
  const pagina = resultado.paginas.find((p) => p.tipo === pag && (pag === 'tapume' || p.cidadeId === linhaId)) || resultado.paginas.find((p) => p.tipo === pag);

  return (
    <>
      <Cabecalho passo="secoes" titulo="Seções da página">Arraste para mudar a ordem das seções na página. Esconda o que não deve aparecer, no evento todo ou só numa cidade. A prévia mostra o resultado.</Cabecalho>
      <div className="row">
        <div className="seg" role="group" aria-label="Página">
          {paginas.map((k) => <button key={k} type="button" aria-pressed={pag === k} onClick={() => setPag(k)}>{NOME_PAGINA[k]}</button>)}
        </div>
        {evento.cidades.length > 0 && pag !== 'tapume' && (
          <label className="row small" style={{ gap: 6 }}>Cidade:
            <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} value={linhaId} onChange={(e) => setLinhaId(e.target.value)}>
              {evento.cidades.map((c) => <option key={c._id} value={c._id}>{cad.nomeItem('cidade', c)}</option>)}
            </select>
          </label>
        )}
        {mudouOrdem && (
          <button className="btn sm ghost" type="button" onClick={() => alterar((e) => { const s = garantir(e); const o = { ...(s.ordem || {}) }; delete o[pag]; s.ordem = o; })}>Voltar à ordem do HTML</button>
        )}
      </div>
      <div className="split">
        <div className="stack" style={{ minWidth: 0 }}>
          {!secoes.length ? (
            <div className="card empty">Esta página não tem seções que dá para mover ou esconder. Cada parte precisa estar numa &lt;section id="…"&gt; de primeiro nível (ver o guia do HTML).</div>
          ) : (
            <div className="lista-secoes">
              {secoes.map((s, i) => {
                const geralVisivel = !ocultaGeral(s.id);
                const exc = excecao(s.id);
                const aqui = porCidade && cidade ? exc ?? geralVisivel : geralVisivel;
                return (
                  <div key={s.id} className={'secao-item' + (aqui ? '' : ' escondida')} {...alvo(i)}>
                    <Alca i={i} total={secoes.length} alca={alca} mover={reordenar} rotulo={s.nome} />
                    <div className="secao-nome"><b>{s.nome}</b><span className="mono small muted">#{s.id}</span></div>
                    <div className="secao-controles">
                      <span className="small muted">Evento todo</span>
                      <span className="seg" role="group" aria-label={`${s.nome} no evento todo`}>
                        <button type="button" aria-pressed={geralVisivel} onClick={() => setGeral(s.id, true)}>Mostrar</button>
                        <button type="button" aria-pressed={!geralVisivel} onClick={() => setGeral(s.id, false)}>Esconder</button>
                      </span>
                      {porCidade && cidade && (
                        <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} aria-label={`${s.nome} em ${cad.nomeItem('cidade', cidade)}`}
                          value={exc === undefined ? 'igual' : exc ? 'mostrar' : 'esconder'}
                          onChange={(e) => setCidade(s.id, e.target.value as 'igual' | 'mostrar' | 'esconder')}>
                          <option value="igual">Em {cad.nomeItem('cidade', cidade)}: igual ao evento</option>
                          <option value="mostrar">Em {cad.nomeItem('cidade', cidade)}: mostrar</option>
                          <option value="esconder">Em {cad.nomeItem('cidade', cidade)}: esconder</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {temRodape && (() => {
            const geralVisivel = !ocultaGeral(RODAPE_HTML);
            const exc = excecao(RODAPE_HTML);
            const aqui = porCidade && cidade ? exc ?? geralVisivel : geralVisivel;
            return (
              <div className={'secao-item' + (aqui ? '' : ' escondida')}>
                <span className="alca-w" aria-hidden="true" style={{ width: 66 }} />
                <div className="secao-nome"><b>Rodapé do HTML</b><span className="small muted">o &lt;footer&gt; que veio no HTML (fica sempre no fim)</span></div>
                <div className="secao-controles">
                  <span className="small muted">Evento todo</span>
                  <span className="seg" role="group" aria-label="Rodapé do HTML no evento todo">
                    <button type="button" aria-pressed={geralVisivel} onClick={() => setGeral(RODAPE_HTML, true)}>Mostrar</button>
                    <button type="button" aria-pressed={!geralVisivel} onClick={() => setGeral(RODAPE_HTML, false)}>Esconder</button>
                  </span>
                  {porCidade && cidade && (
                    <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} aria-label={`Rodapé do HTML em ${cad.nomeItem('cidade', cidade)}`}
                      value={exc === undefined ? 'igual' : exc ? 'mostrar' : 'esconder'}
                      onChange={(e) => setCidade(RODAPE_HTML, e.target.value as 'igual' | 'mostrar' | 'esconder')}>
                      <option value="igual">Em {cad.nomeItem('cidade', cidade)}: igual ao evento</option>
                      <option value="mostrar">Em {cad.nomeItem('cidade', cidade)}: mostrar</option>
                      <option value="esconder">Em {cad.nomeItem('cidade', cidade)}: esconder</option>
                    </select>
                  )}
                </div>
              </div>
            );
          })()}
          <EditorRodape linhaId={linhaId} porCidade={porCidade} />
          <p className="small muted">A ordem vale para todas as páginas deste tipo ({NOME_PAGINA[pag].toLowerCase()}). Os links do menu não mudam de ordem.</p>
        </div>
        <div className="lado"><Previa html={pagina?.html ?? null} titulo={pagina ? `${pagina.titulo} · ${pagina.arquivo}` : 'Prévia'} altura={560} /></div>
      </div>
      <NavPassos passo="secoes" />
    </>
  );
}
