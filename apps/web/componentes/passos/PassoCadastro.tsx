'use client';
import { FORMULAS_PADRAO, novaLinha, slugValor, sincronizarVars, type Linha, type TipoItem } from '@norte/motor';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import type { Evento } from '@/lib/comum/tipos';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { baixarPlanilha, lerPlanilha, type Proposta } from '../planilha';
import { Previa } from '../Previa';

const novoId = () => crypto.randomUUID().slice(0, 8);
const lista = (e: Evento, t: TipoItem) => (t === 'etapa' ? e.etapas : e.cidades);
const rotulo = (o: string) => (slugValor(o) === 'breve' ? 'em breve' : o);

function Celula({ tipo, linha, col }: { tipo: TipoItem; linha: Linha; col: string }) {
  const { cad, det, alterar } = useEditor();
  const valor = linha[col] ?? '';
  const set = (v: string) => alterar((e) => { const l = lista(e, tipo).find((x) => x._id === linha._id); if (l) l[col] = v; });
  if (col === 'status') {
    const ops = det.opcoes.status || ['em breve', 'aberta'];
    return (
      <select value={slugValor(valor) === 'breve' ? '' : valor} onChange={(e) => set(e.target.value)} aria-label="status">
        {ops.map((o) => <option key={o} value={slugValor(o) === 'breve' ? '' : o}>{rotulo(o)}</option>)}
        {valor && !ops.some((o) => slugValor(o) === slugValor(valor)) && <option value={valor}>{valor} (o HTML não conhece)</option>}
      </select>
    );
  }
  const ops = det.opcoes[col];
  if (ops) {
    return (
      <select value={valor} onChange={(e) => set(e.target.value)} aria-label={col}>
        <option value="">—</option>
        {ops.map((o) => <option key={o} value={o}>{o}</option>)}
        {valor && !ops.some((o) => slugValor(o) === slugValor(valor)) && <option value={valor}>{valor} (o HTML não conhece)</option>}
      </select>
    );
  }
  const calc = cad.vars[col]?.formula ? cad.calculado(linha, col) : '';
  return (
    <>
      <input value={valor} placeholder={calc} onChange={(e) => set(e.target.value)} aria-label={col} data-col={col} data-row={linha._id} data-tbl={tipo} />
      {valor !== '' && calc !== '' && <button className="rst" type="button" title={`Voltar ao calculado (${calc})`} onClick={() => set('')}>↺</button>}
    </>
  );
}

function PainelColuna({ tipo, col, cols, fechar }: { tipo: TipoItem; col: string; cols: string[]; fechar: () => void }) {
  const { cad, det, alterar } = useEditor();
  const v = cad.vars[col];
  const [fx, setFx] = useState(v?.formula || '');
  const [confirmar, setConfirmar] = useState(false);
  const i = cols.indexOf(col);
  const mudarVar = (fn: (x: NonNullable<Evento['vars'][string]>) => void) => alterar((e) => { e.vars = sincronizarVars(det, e.vars); fn(e.vars[col]); });
  const mover = (d: number) => alterar((e) => {
    const o = [...cols];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    e.ordem = { ...e.ordem, [tipo]: o };
  });
  function excluir() {
    alterar((e) => {
      e.vars = sincronizarVars(det, e.vars);
      if (e.vars[col]?.extra) {
        delete e.vars[col];
        for (const l of lista(e, tipo)) delete l[col];
      } else e.vars[col].excluida = true;
    });
    fechar();
  }
  return (
    <div className="colpanel" role="group" aria-label={`Coluna @${col}`}>
      <div className="row between">
        <span className="v">@{col}</span>
        <span className="row" style={{ gap: 4 }}>
          <button className="btn sm ghost" type="button" disabled={i <= 0} onClick={() => mover(-1)}>← Mover</button>
          <button className="btn sm ghost" type="button" disabled={i >= cols.length - 1} onClick={() => mover(1)}>Mover →</button>
        </span>
      </div>
      <label className="f">Fórmula <small>Opcional. Use nomes de outras colunas com + − * / e parênteses. Com fórmula, a coluna se preenche sozinha; o que for digitado numa célula vale mais que o cálculo.</small>
        <input className="inp mono" value={fx} placeholder="ex.: parcelamento * valor_parcelado" onChange={(e) => setFx(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn sm pri" type="button" onClick={() => { mudarVar((x) => { x.formula = fx.trim(); }); fechar(); }}>Salvar fórmula</button>
        {v?.formula && <button className="btn sm" type="button" onClick={() => { mudarVar((x) => { x.formula = ''; }); setFx(''); }}>Preencher à mão</button>}
        {FORMULAS_PADRAO[col] && v?.formula !== FORMULAS_PADRAO[col] && <button className="btn sm ghost" type="button" onClick={() => { mudarVar((x) => { x.formula = FORMULAS_PADRAO[col]; }); setFx(FORMULAS_PADRAO[col]); }}>Voltar à sugerida</button>}
        {!confirmar && <button className="btn sm danger" type="button" onClick={() => setConfirmar(true)}>Excluir coluna</button>}
        <button className="btn sm ghost" type="button" onClick={fechar}>Fechar</button>
      </div>
      {confirmar && (
        <div className="w-item bad"><span className="ic">!</span><div>
          <b>Excluir a coluna @{col}?</b>
          {v?.extra ? 'A coluna e os valores digitados nela saem do cadastro.' : <>Na página, <span className="v">@{col}</span> fica em branco. Os valores digitados ficam guardados, e dá para trazer a coluna de volta no passo Variáveis.</>}
          <span className="row" style={{ marginTop: 8 }}>
            <button className="btn sm danger-fill" type="button" onClick={excluir}>Excluir</button>
            <button className="btn sm ghost" type="button" onClick={() => setConfirmar(false)}>Cancelar</button>
          </span>
        </div></div>
      )}
    </div>
  );
}

function Tabela({ tipo, foco, setFoco }: { tipo: TipoItem; foco: string | null; setFoco: (id: string) => void }) {
  const { evento, cad, det, alterar } = useEditor();
  const cols = cad.colunas(tipo);
  const linhas = lista(evento, tipo);
  const [painel, setPainel] = useState<string | null>(null);
  const [novaCol, setNovaCol] = useState<string | null>(null);
  const [msgCol, setMsgCol] = useState('');
  const [remover, setRemover] = useState<string | null>(null);
  // tela cheia: a mesma tabela, ocupando a tela toda (Esc fecha)
  const [cheia, setCheia] = useState(false);
  useEffect(() => {
    if (!cheia) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement && e.target.closest('.colpanel'))) setCheia(false); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [cheia]);
  const nomeTipo = tipo === 'etapa' ? 'etapa' : 'cidade';
  // One page: uma linha só (a da página), sem somar, duplicar ou mudar de ordem
  const unica = evento.formato === 'unica';

  function adicionar() {
    const id = novoId();
    alterar((e) => {
      const l = lista(e, tipo);
      const n = novaLinha(tipo, l[l.length - 1] || null, cols, id);
      if (tipo === 'etapa' && !n._cidade && e.cidades.length) n._cidade = e.cidades[0]._id;
      l.push(n);
    });
    setFoco(id);
  }
  const acao = (id: string, fn: (l: Linha[], i: number) => void) => alterar((e) => { const l = lista(e, tipo); const i = l.findIndex((x) => x._id === id); if (i >= 0) fn(l, i); });

  function criarColuna() {
    const nome = (novaCol || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(nome)) return setMsgCol('Use letras minúsculas, números e _ (começando com letra).');
    if (cad.vars[nome] || det.variaveis.has(nome)) return setMsgCol('Já existe uma variável com esse nome.');
    alterar((e) => { e.vars = { ...sincronizarVars(det, e.vars), [nome]: { dono: tipo, extra: true } }; });
    setNovaCol(null);
    setMsgCol('');
  }

  // colar da planilha (Tab entre colunas, Enter entre linhas) a partir da célula atual
  function colar(ev: React.ClipboardEvent<HTMLTableSectionElement>) {
    const alvo = ev.target as HTMLInputElement;
    const txt = ev.clipboardData.getData('text');
    if (!alvo.dataset?.col || !/[\t\n]/.test(txt.trim())) return;
    ev.preventDefault();
    const grade = txt.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((l) => l.split('\t'));
    const c0 = cols.indexOf(alvo.dataset.col);
    alterar((e) => {
      const l = lista(e, tipo);
      let r = l.findIndex((x) => x._id === alvo.dataset.row);
      for (const celulas of grade) {
        if (!l[r] && unica && r > 0) break;
        if (!l[r]) { const n: Linha = { _id: novoId() }; if (tipo === 'etapa' && e.cidades.length === 1) n._cidade = e.cidades[0]._id; l.push(n); r = l.length - 1; }
        celulas.forEach((v, k) => { const c = cols[c0 + k]; if (c) l[r][c] = v.trim(); });
        r++;
      }
    });
  }

  return (
    <section className={'stack' + (cheia ? ' tabela-cheia' : '')} role={cheia ? 'dialog' : undefined} aria-modal={cheia || undefined} aria-label={cheia ? (unica ? 'Da página' : tipo === 'etapa' ? 'Etapas' : 'Cidades') : undefined}>
      <div className="row between">
        <h2 style={{ fontSize: 20 }}>{unica ? 'Da página' : <>{tipo === 'etapa' ? 'Etapas' : 'Cidades'} <span className="cnt">{linhas.length}</span></>}</h2>
        <span className="row" style={{ gap: 6 }}>
          <button className="btn sm ghost" type="button" onClick={() => setCheia(!cheia)} title={cheia ? 'Voltar ao tamanho normal (Esc)' : 'Abrir a tabela na tela toda'} aria-pressed={cheia}>
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }}>
              <path d={cheia ? 'M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4' : 'M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {cheia ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
          <button className="btn sm ghost" type="button" onClick={() => { setNovaCol(''); setPainel(null); }}>+ Coluna</button>
          {(!unica || !linhas.length) && <button className="btn sm pri" type="button" onClick={adicionar}>{unica ? 'Preencher' : `+ ${tipo === 'etapa' ? 'Etapa' : 'Cidade'}`}</button>}
        </span>
      </div>
      {novaCol !== null && (
        <div className="colpanel">
          <label className="f">Nome da nova coluna <small>Letras, números e _. Use em fórmulas ou escreva <span className="v">@nome</span> no HTML.</small>
            <input className="inp mono" autoFocus value={novaCol} placeholder="ex.: preco_lote_2" onChange={(e) => setNovaCol(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && criarColuna()} />
          </label>
          <div className="row"><button className="btn sm pri" type="button" onClick={criarColuna}>Criar coluna</button><button className="btn sm ghost" type="button" onClick={() => setNovaCol(null)}>Cancelar</button></div>
          {msgCol && <span className="small" style={{ color: 'var(--bad)' }}>{msgCol}</span>}
        </div>
      )}
      {painel && cols.includes(painel) && <PainelColuna key={painel} tipo={tipo} col={painel} cols={cols} fechar={() => setPainel(null)} />}
      <div className="tw">
        <table className="grid-ed">
          <thead>
            <tr>
              <th className="idx">#</th>
              {tipo === 'etapa' && <th style={{ padding: '10px 12px' }}>Cidade</th>}
              {cols.map((c) => (
                <th key={c} style={{ padding: 0 }}>
                  <button className="colbtn" type="button" onClick={() => { setPainel(painel === c ? null : c); setNovaCol(null); }} title="Fórmula, mover ou excluir">
                    <span className="v">@{c}</span>{cad.vars[c]?.formula && <span className="fx" title={cad.vars[c].formula}>fx</span>}
                  </button>
                </th>
              ))}
              {!unica && <th style={{ padding: '10px 12px' }}>Arquivo gerado</th>}
              <th className="act"></th>
            </tr>
          </thead>
          <tbody onPaste={colar}>
            {linhas.map((l, i) => (
              <tr key={l._id} className={foco === l._id ? 'foco' : ''} onFocus={() => setFoco(l._id)}>
                <td className="idx">{i + 1}</td>
                {tipo === 'etapa' && (
                  <td>
                    <select value={l._cidade || ''} onChange={(e) => { const v = e.target.value; acao(l._id, (ls, k) => { ls[k]._cidade = v; }); }} aria-label="Cidade da etapa">
                      <option value="">— escolha —</option>
                      {evento.cidades.map((c) => <option key={c._id} value={c._id}>{cad.nomeItem('cidade', c)}</option>)}
                    </select>
                  </td>
                )}
                {cols.map((c) => <td key={c}><Celula tipo={tipo} linha={l} col={c} /></td>)}
                {!unica && <td className="arq"><input value={l._arquivo || ''} placeholder={cad.arquivo(tipo, l)} aria-label="Arquivo gerado" onChange={(e) => { const v = e.target.value; acao(l._id, (ls, k) => { ls[k]._arquivo = v; }); }} /></td>}
                <td className="act">
                  {remover === l._id ? (
                    <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                      <button className="btn sm danger-fill" type="button" onClick={() => { acao(l._id, (ls, k) => { ls.splice(k, 1); }); setRemover(null); }}>Remover</button>
                      <button className="btn sm ghost" type="button" onClick={() => setRemover(null)}>Não</button>
                    </span>
                  ) : (
                    <>
                      {!unica && <>
                      <button className="iconbtn" type="button" title={`Duplicar ${nomeTipo}`} onClick={() => acao(l._id, (ls, k) => { const n = structuredClone(ls[k]); n._id = novoId(); delete n._arquivo; ls.splice(k + 1, 0, n); })}>⧉</button>
                      <button className="iconbtn" type="button" title="Subir" disabled={i === 0} onClick={() => acao(l._id, (ls, k) => { [ls[k - 1], ls[k]] = [ls[k], ls[k - 1]]; })}>↑</button>
                      <button className="iconbtn" type="button" title="Descer" disabled={i === linhas.length - 1} onClick={() => acao(l._id, (ls, k) => { [ls[k + 1], ls[k]] = [ls[k], ls[k + 1]]; })}>↓</button>
                      <button className="iconbtn" type="button" title={`Remover ${nomeTipo}`} onClick={() => setRemover(l._id)}>✕</button>
                      </>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!linhas.length && <p className="empty">Nenhuma {nomeTipo} ainda. Clique em “+ {tipo === 'etapa' ? 'Etapa' : 'Cidade'}” ou cole as linhas de uma planilha.</p>}
      </div>
      {!cols.length && <p className="small muted">Sem colunas: os HTMLs ainda não têm variáveis {tipo === 'etapa' ? 'de etapa' : 'de cidade'}.</p>}
    </section>
  );
}

/** baixar o cadastro em planilha e enviar de volta (mostra o que muda antes de aplicar) */
function Planilha() {
  const { evento, cad, alterar } = useEditor();
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [msg, setMsg] = useState('');

  async function baixar() {
    setMsg('');
    try { await baixarPlanilha(evento, cad); } catch (e) { setMsg((e as Error).message); }
  }
  async function enviar(f: File | undefined) {
    if (!f) return;
    setMsg('Lendo a planilha…');
    setProposta(null);
    try { setProposta(await lerPlanilha(f, evento, cad)); setMsg(''); } catch (e) { setMsg((e as Error).message); }
  }
  function aplicar() {
    if (!proposta) return;
    const p = proposta;
    alterar((e) => {
      e.gerais = { ...e.gerais, ...p.gerais };
      e.cidades = p.cidades;
      if (p.etapas) e.etapas = p.etapas;
    });
    setProposta(null);
    setMsg('Planilha aplicada.');
  }
  const removidas = proposta?.resumo.flatMap((r) => r.removidas) || [];

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm ghost" type="button" onClick={baixar} title="Baixa o cadastro em Excel (.xlsx)">↓ Baixar planilha</button>
        <label className="btn sm ghost" title="Envie a planilha preenchida (.xlsx ou .csv)">↑ Enviar planilha
          <input type="file" accept=".xlsx,.csv" hidden onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {msg && <span className="small" style={{ color: msg.endsWith('…') || msg === 'Planilha aplicada.' ? 'var(--mute)' : 'var(--bad)' }}>{msg}</span>}
      </div>
      {proposta && (
        <div className="colpanel">
          <b>Conferir antes de aplicar</b>
          <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
            {Object.keys(proposta.gerais).length > 0 && <li>Gerais: {Object.keys(proposta.gerais).length} campo(s)</li>}
            {proposta.resumo.map((r) => (
              <li key={r.aba}>{r.aba}: {r.atualizadas} atualizada(s), {r.novas} nova(s){r.removidas.length ? `, ${r.removidas.length} removida(s)` : ''}</li>
            ))}
          </ul>
          {removidas.length > 0 && (
            <div className="w-item warn"><span className="ic">!</span><div><b>Saem do cadastro (não estão na planilha)</b>{removidas.join(', ')}</div></div>
          )}
          {proposta.avisos.map((a) => <p key={a} className="small muted" style={{ margin: 0 }}>{a}</p>)}
          <div className="row">
            <button className="btn sm pri" type="button" onClick={aplicar}>Aplicar a planilha</button>
            <button className="btn sm ghost" type="button" onClick={() => setProposta(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PassoCadastro() {
  const { evento, modelos, arquivos, cad, alterar, banco } = useEditor();
  const [foco, setFoco] = useState<string | null>(null);
  const gerais = cad.colunas('geral');
  const unica = evento.formato === 'unica';
  // One page: a linha da página já vem criada
  useEffect(() => {
    if (unica && !evento.cidades.length) alterar((e) => { if (!e.cidades.length) e.cidades.push(novaLinha('cidade', null, cad.colunas('cidade'), novoId())); });
  }, [unica, evento.cidades.length, alterar, cad]);
  const ev = useDeferredValue(evento);
  const resultado = useMemo(() => gerarEvento(ev, modelos, arquivos, banco), [ev, modelos, arquivos, banco]);
  const pagina =
    resultado.paginas.find((p) => foco && (p.etapaId === foco || (p.cidadeId === foco && !p.etapaId))) ||
    resultado.paginas.find((p) => p.tipo === 'praca') ||
    resultado.paginas[0];

  return (
    <>
      <Cabecalho passo="cadastro" titulo="Cadastro">{unica ? 'Preencha os valores da página. A prévia mostra o resultado.' : 'Preencha os valores. Cada linha vira uma página. Dá para colar linhas de uma planilha. A prévia mostra a linha em que você está.'}</Cabecalho>
      <div className="split">
        <div className="stack" style={{ minWidth: 0 }}>
          <Planilha />
          {gerais.length > 0 && (
            <section className="card stack">
              <h2 style={{ fontSize: 20 }}>{unica ? 'Gerais' : 'Igual em todas as páginas'}</h2>
              <div className="grid3">
                {gerais.map((g) => (
                  <label key={g} className="f"><span className="v" style={{ alignSelf: 'start' }}>@{g}</span>
                    <input className="inp" value={evento.gerais[g] ?? ''} placeholder={cad.calculado(null, g)} onChange={(e) => { const v = e.target.value; alterar((x) => { x.gerais[g] = v; }); }} />
                  </label>
                ))}
              </div>
            </section>
          )}
          <Tabela tipo="cidade" foco={foco} setFoco={setFoco} />
          {evento.formato === 'tapume_etapa_praca' && <Tabela tipo="etapa" foco={foco} setFoco={setFoco} />}
        </div>
        <div className="lado">
          <Previa html={pagina?.html ?? null} titulo={pagina ? `${pagina.titulo} · ${pagina.arquivo}` : 'Prévia'} altura={560} />
        </div>
      </div>
      <NavPassos passo="cadastro" />
    </>
  );
}
