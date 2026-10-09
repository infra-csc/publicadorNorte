'use client';
import { deISO, ehData, FORMULAS_PADRAO, lerData, novaLinha, paraISO, slugValor, sincronizarVars, type Linha, type TipoItem } from '@norte/motor';
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  if (ehData(col)) return <CampoData valor={valor} rotulo={col} mudar={set} />;
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

function Tabela({ tipo, foco, setFoco, busca }: { tipo: TipoItem; foco: string | null; setFoco: (id: string) => void; busca: string }) {
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
  // One page: a lista de cidades só alimenta trechos @repetir cidades (não gera página por cidade)
  const unica = evento.formato === 'unica';
  const mostradas = linhas.filter((l) => bate(busca, ...cols.map((c) => String(l[c] ?? ''))));

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
        if (!l[r]) { const n: Linha = { _id: novoId() }; if (tipo === 'etapa' && e.cidades.length === 1) n._cidade = e.cidades[0]._id; l.push(n); r = l.length - 1; }
        celulas.forEach((v, k) => { const c = cols[c0 + k]; if (c) l[r][c] = v.trim(); });
        r++;
      }
    });
  }

  return (
    <section className={'stack' + (cheia ? ' tabela-cheia' : '')} role={cheia ? 'dialog' : undefined} aria-modal={cheia || undefined} aria-label={cheia ? (tipo === 'etapa' ? 'Etapas' : 'Cidades') : undefined}>
      <div className="row between">
        <h2 style={{ fontSize: 20 }}>{tipo === 'etapa' ? 'Etapas' : 'Cidades'} <span className="cnt">{busca ? `${mostradas.length} de ${linhas.length}` : linhas.length}</span>{unica && <small className="muted" style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>lista da página (@repetir cidades)</small>}</h2>
        <span className="row" style={{ gap: 6 }}>
          <button className="btn sm ghost" type="button" onClick={() => setCheia(!cheia)} title={cheia ? 'Voltar ao tamanho normal (Esc)' : 'Abrir a tabela na tela toda'} aria-pressed={cheia}>
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }}>
              <path d={cheia ? 'M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4' : 'M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {cheia ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
          <button className="btn sm ghost" type="button" onClick={() => { setNovaCol(''); setPainel(null); }}>+ Coluna</button>
          <button className="btn sm pri" type="button" onClick={adicionar}>+ {tipo === 'etapa' ? 'Etapa' : 'Cidade'}</button>
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
            {mostradas.map((l) => { const i = linhas.indexOf(l); return (
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
                      <button className="iconbtn" type="button" title={`Duplicar ${nomeTipo}`} onClick={() => acao(l._id, (ls, k) => { const n = structuredClone(ls[k]); n._id = novoId(); delete n._arquivo; ls.splice(k + 1, 0, n); })}>⧉</button>
                      <button className="iconbtn" type="button" title="Subir" disabled={i === 0} onClick={() => acao(l._id, (ls, k) => { [ls[k - 1], ls[k]] = [ls[k], ls[k - 1]]; })}>↑</button>
                      <button className="iconbtn" type="button" title="Descer" disabled={i === linhas.length - 1} onClick={() => acao(l._id, (ls, k) => { [ls[k + 1], ls[k]] = [ls[k], ls[k + 1]]; })}>↓</button>
                      <button className="iconbtn" type="button" title={`Remover ${nomeTipo}`} onClick={() => setRemover(l._id)}>✕</button>
                    </>
                  )}
                </td>
              </tr>
            ); })}
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

/** caixa de texto que cresce com o conteúdo (uma linha quando cabe) */
function CampoTexto({ valor, placeholder, rotulo, mudar }: { valor: string; placeholder?: string; rotulo: string; mudar: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 2 + 'px';
  }, [valor]);
  return <textarea ref={ref} className="inp campo-auto" rows={1} value={valor} placeholder={placeholder} aria-label={rotulo} onChange={(e) => mudar(e.target.value)} />;
}

/**
 * Campo de data: sempre o calendário do navegador; guarda dd/mm/aaaa.
 * Valor antigo que não é data completa (ex.: "12/03") aparece embaixo até ser trocado.
 */
function CampoData({ valor, rotulo, mudar }: { valor: string; rotulo: string; mudar: (v: string) => void }) {
  const iso = paraISO(valor);
  const antigo = valor.trim() && !iso;
  return (
    <span className="campo-data">
      <input className="inp" type="date" value={iso} aria-label={rotulo} onChange={(e) => mudar(e.target.value ? deISO(e.target.value) : '')} />
      {antigo && <small className="muted" title="Escolha a data completa no calendário">Hoje: “{valor}”{lerData(valor) ? ' (sem ano)' : ''}</small>}
    </span>
  );
}

const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const bate = (busca: string, ...textos: string[]) => !busca || textos.some((t) => semAcento(t).includes(semAcento(busca)));

/**
 * Variáveis gerais numeradas viram blocos: tema1_titulo, tema1_texto, tema2_titulo… → bloco "tema" com itens 1, 2…
 * O número tem que estar colado num pedaço do nome (tema1, faq10, patrocinio2).
 */
type Serie = { raiz: string; campos: string[]; itens: Map<number, Map<string, string>> };
function separarSeries(gerais: string[]): { soltas: string[]; series: Serie[] } {
  const porRaiz = new Map<string, Serie>();
  const de = new Map<string, { raiz: string; n: number; campo: string }>();
  for (const g of gerais) {
    const partes = g.split('_');
    const i = partes.findIndex((p) => /^[a-z]+\d+$/.test(p));
    if (i < 0) continue;
    const [, raiz, num] = /^([a-z]+)(\d+)$/.exec(partes[i])!;
    const campo = [...partes.slice(0, i), raiz + '#', ...partes.slice(i + 1)].join('_');
    de.set(g, { raiz, n: Number(num), campo });
  }
  for (const [g, { raiz, n, campo }] of de) {
    const s: Serie = porRaiz.get(raiz) || { raiz, campos: [], itens: new Map() };
    porRaiz.set(raiz, s);
    if (!s.campos.includes(campo)) s.campos.push(campo);
    if (!s.itens.has(n)) s.itens.set(n, new Map());
    s.itens.get(n)!.set(campo, g);
  }
  // só é bloco se tiver pelo menos dois números
  const series = [...porRaiz.values()].filter((s) => s.itens.size > 1);
  const naSerie = new Set(series.flatMap((s) => [...s.itens.values()].flatMap((m) => [...m.values()])));
  for (const s of series) s.itens = new Map([...s.itens].sort((a, b) => a[0] - b[0]));
  return { soltas: gerais.filter((g) => !naSerie.has(g)), series };
}
const nomeRaiz = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
const nomeCampo = (c: string, raiz: string) => c.replace(new RegExp(`_?${raiz}#_?`), ' ').replace(/_/g, ' ').trim() || raiz;

function BlocoSerie({ s, busca }: { s: Serie; busca: string }) {
  const { evento, cad, alterar } = useEditor();
  const valor = (g: string) => evento.gerais[g] ?? '';
  const nums = [...s.itens.keys()];
  const temValor = (n: number) => [...s.itens.get(n)!.values()].some((g) => String(valor(g)).trim());
  // visíveis: os preenchidos, os que a pessoa abriu e, com busca, os que batem
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const visiveis = nums.filter((n) => (busca ? bate(busca, s.raiz + ' ' + n, ...[...s.itens.get(n)!.entries()].flatMap(([c, g]) => [c, g, String(valor(g))])) : temValor(n) || abertos.has(n)));
  if (busca && !visiveis.length) return null;
  const proximo = nums.find((n) => !temValor(n) && !abertos.has(n));

  /** tira o bloco n: os de baixo sobem uma posição (o site não fica com buraco) */
  function remover(n: number) {
    alterar((e) => {
      const seguintes = nums.filter((x) => x >= n);
      for (let k = 0; k < seguintes.length; k++) {
        const atual = s.itens.get(seguintes[k])!;
        const prox = s.itens.get(seguintes[k + 1]);
        for (const [campo, g] of atual) {
          const g2 = prox?.get(campo);
          if (g2 && String(e.gerais[g2] ?? '').trim()) e.gerais[g] = e.gerais[g2];
          else delete e.gerais[g];
        }
      }
    });
    setAbertos((a) => { const b = new Set<number>(); for (const x of a) if (x < n) b.add(x); else if (x > n) b.add(x - 1); return b; });
  }

  return (
    <div className="serie">
      <div className="row between">
        <b>{nomeRaiz(s.raiz)}{s.campos.length === 1 && <span className="muted" style={{ fontWeight: 400 }}> · {nomeCampo(s.campos[0], s.raiz)}</span>} <span className="cnt">{nums.filter(temValor).length} de {nums.length}</span></b>
        {!busca && (
          <button className="btn sm ghost" type="button" disabled={proximo == null} onClick={() => proximo != null && setAbertos((a) => new Set(a).add(proximo))}
            title={proximo == null ? `O HTML tem ${nums.length} espaço(s) para ${s.raiz}` : `Mostrar o ${s.raiz} ${proximo}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ marginRight: 4, verticalAlign: '-1px' }}><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Adicionar
          </button>
        )}
      </div>
      {visiveis.map((n) => (
        s.campos.length === 1 ? (
          // um campo por item: uma linha com número, texto e lixeira
          <div key={n} className="serie-linha">
            <span className="small muted serie-n">{n}</span>
            {[...s.itens.get(n)!.entries()].map(([, g]) => (
              <CampoTexto key={g} valor={valor(g)} placeholder={cad.calculado(null, g)} rotulo={g} mudar={(v) => alterar((x) => { x.gerais[g] = v; })} />
            ))}
            <button className="iconbtn" type="button" title={`Tirar o ${s.raiz} ${n} (os de baixo sobem; dá para desfazer)`} aria-label={`Tirar ${s.raiz} ${n}`} onClick={() => remover(n)}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.6 8h5.8l.6-8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        ) : (
        <div key={n} className="serie-item">
          <div className="row between">
            <span className="small muted">{nomeRaiz(s.raiz)} {n}</span>
            <button className="iconbtn" type="button" title={`Tirar o ${s.raiz} ${n} (os de baixo sobem; dá para desfazer)`} aria-label={`Tirar ${s.raiz} ${n}`} onClick={() => remover(n)}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.6 8h5.8l.6-8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="grid3">
            {[...s.itens.get(n)!.entries()].map(([campo, g]) => (
              <label key={g} className="f"><span className="v" style={{ alignSelf: 'start' }} title={'@' + g}>{nomeCampo(campo, s.raiz)}</span>
                {ehData(g) ? <CampoData valor={valor(g)} rotulo={g} mudar={(v) => alterar((x) => { x.gerais[g] = v; })} /> : <CampoTexto valor={valor(g)} placeholder={cad.calculado(null, g)} rotulo={g} mudar={(v) => alterar((x) => { x.gerais[g] = v; })} />}
              </label>
            ))}
          </div>
        </div>
        )
      ))}
      {!visiveis.length && <p className="small muted" style={{ margin: 0 }}>Nenhum {s.raiz} ainda. Use “Adicionar”.</p>}
    </div>
  );
}

function Gerais({ busca }: { busca: string }) {
  const { evento, cad, alterar } = useEditor();
  const gerais = cad.colunas('geral');
  const { soltas, series } = useMemo(() => separarSeries(gerais), [gerais.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!gerais.length) return null;
  const visiveis = soltas.filter((g) => bate(busca, g, String(evento.gerais[g] ?? '')));
  const unica = evento.formato === 'unica';
  if (busca && !visiveis.length && !series.length) return null;
  return (
    <section className="card stack">
      <h2 style={{ fontSize: 20 }}>{unica ? 'Gerais' : 'Igual em todas as páginas'}</h2>
      {visiveis.length > 0 && (
        <div className="grid3">
          {visiveis.map((g) => (
            <label key={g} className="f"><span className="v" style={{ alignSelf: 'start' }}>@{g}</span>
              {ehData(g) ? <CampoData valor={evento.gerais[g] ?? ''} rotulo={g} mudar={(v) => alterar((x) => { x.gerais[g] = v; })} /> : <CampoTexto valor={evento.gerais[g] ?? ''} placeholder={cad.calculado(null, g)} rotulo={g} mudar={(v) => alterar((x) => { x.gerais[g] = v; })} />}
            </label>
          ))}
        </div>
      )}
      {series.map((s) => <BlocoSerie key={s.raiz} s={s} busca={busca} />)}
    </section>
  );
}

/** One page: a lista de cidades (@repetir cidades) em blocos, no mesmo formato dos outros blocos numerados */
function ListaEmBlocos({ busca }: { busca: string }) {
  const { evento, cad, det, alterar } = useEditor();
  const cols = cad.colunas('cidade');
  const linhas = evento.cidades;
  const [tirar, setTirar] = useState<string | null>(null);
  const mostradas = linhas.filter((l) => bate(busca, ...cols.map((c) => String(l[c] ?? ''))));
  if (busca && !mostradas.length) return null;
  const mudar = (id: string, col: string, v: string) => alterar((e) => { const l = e.cidades.find((x) => x._id === id); if (l) l[col] = v; });
  const acao = (id: string, fn: (l: Linha[], i: number) => void) => alterar((e) => { const i = e.cidades.findIndex((x) => x._id === id); if (i >= 0) fn(e.cidades, i); });

  function adicionar() {
    alterar((e) => { e.cidades.push(novaLinha('cidade', e.cidades[e.cidades.length - 1] || null, cols, novoId())); });
  }

  return (
    <section className="card stack">
      <div className="serie" style={{ borderTop: 0, paddingTop: 0 }}>
        <div className="row between">
          <b>Cidades <span className="cnt">{busca ? `${mostradas.length} de ${linhas.length}` : linhas.length}</span> <small className="muted" style={{ fontWeight: 400 }}>lista da página (@repetir cidades)</small></b>
          {!busca && (
            <button className="btn sm ghost" type="button" onClick={adicionar}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ marginRight: 4, verticalAlign: '-1px' }}><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              Adicionar
            </button>
          )}
        </div>
        {mostradas.map((l) => {
          const i = linhas.indexOf(l);
          return (
            <div key={l._id} className="serie-item">
              <div className="row between">
                <span className="small muted">Cidade {i + 1}{l.cidade ? ` · ${l.cidade}` : ''}</span>
                {tirar === l._id ? (
                  <span className="row" style={{ gap: 4 }}>
                    <button className="btn sm danger-fill" type="button" onClick={() => { acao(l._id, (ls, k) => { ls.splice(k, 1); }); setTirar(null); }}>Tirar</button>
                    <button className="btn sm ghost" type="button" onClick={() => setTirar(null)}>Não</button>
                  </span>
                ) : (
                  <span className="row" style={{ gap: 2 }}>
                    <button className="iconbtn" type="button" title="Subir" disabled={i === 0} onClick={() => acao(l._id, (ls, k) => { [ls[k - 1], ls[k]] = [ls[k], ls[k - 1]]; })}>↑</button>
                    <button className="iconbtn" type="button" title="Descer" disabled={i === linhas.length - 1} onClick={() => acao(l._id, (ls, k) => { [ls[k + 1], ls[k]] = [ls[k], ls[k + 1]]; })}>↓</button>
                    <button className="iconbtn" type="button" title={`Tirar a cidade ${i + 1}`} aria-label={`Tirar a cidade ${i + 1}`} onClick={() => setTirar(l._id)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.6 8h5.8l.6-8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </span>
                )}
              </div>
              <div className="grid3">
                {cols.map((c) => {
                  const ops = c === 'status' ? det.opcoes.status || ['em breve', 'aberta'] : det.opcoes[c];
                  const valor = String(l[c] ?? '');
                  return (
                    <label key={c} className="f"><span className="v" style={{ alignSelf: 'start' }}>@{c}</span>
                      {ops ? (
                        <select className="inp" value={c === 'status' && slugValor(valor) === 'breve' ? '' : valor} onChange={(e) => mudar(l._id, c, e.target.value)}>
                          {c !== 'status' && <option value="">—</option>}
                          {ops.map((o) => <option key={o} value={c === 'status' && slugValor(o) === 'breve' ? '' : o}>{rotulo(o)}</option>)}
                          {valor && !ops.some((o) => slugValor(o) === slugValor(valor)) && <option value={valor}>{valor} (o HTML não conhece)</option>}
                        </select>
                      ) : (
                        ehData(c) ? <CampoData valor={valor} rotulo={c} mudar={(v) => mudar(l._id, c, v)} /> : <CampoTexto valor={valor} placeholder={cad.calculado(l, c)} rotulo={c} mudar={(v) => mudar(l._id, c, v)} />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!linhas.length && <p className="small muted" style={{ margin: 0 }}>Nenhuma cidade ainda. Use “Adicionar”.</p>}
      </div>
    </section>
  );
}

export function PassoCadastro() {
  const { evento, modelos, arquivos, cad, banco, alterar } = useEditor();
  const [foco, setFoco] = useState<string | null>(null);
  const unica = evento.formato === 'unica';
  const [busca, setBusca] = useState('');
  // editar nos campos ou direto na prévia (os textos da página ficam editáveis)
  const [modo, setModo] = useState<'campos' | 'previa'>('campos');
  const naPrevia = modo === 'previa';
  // One page sem @repetir cidades no HTML: não mostra a lista
  const temLista = !unica || cad.colunas('cidade').length > 0 || evento.cidades.length > 0;
  const ev = useDeferredValue(evento);
  const resultado = useMemo(() => gerarEvento(ev, modelos, arquivos, banco, { marcarEdicao: naPrevia }), [ev, modelos, arquivos, banco, naPrevia]);
  const [paginaEscolhida, setPaginaEscolhida] = useState('');
  const [alturaJanela, setAlturaJanela] = useState(900);
  useEffect(() => { const f = () => setAlturaJanela(innerHeight); f(); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  // texto digitado na prévia: geral (sem linha) ou da cidade/etapa daquela linha
  const editarNaPrevia = (variavel: string, linha: string, valor: string) => alterar((e) => {
    if (!linha) { e.gerais[variavel] = valor; return; }
    const l = e.cidades.find((x) => x._id === linha) || e.etapas.find((x) => x._id === linha);
    if (l) l[variavel] = valor;
  });
  const trocaModo = (
    <div className="seg" role="group" aria-label="Onde editar">
      <button type="button" aria-pressed={!naPrevia} onClick={() => setModo('campos')} title="Editar nos campos">Campos</button>
      <button type="button" aria-pressed={naPrevia} onClick={() => setModo('previa')} title="Editar direto na prévia">✎ Na prévia</button>
    </div>
  );
  const pagina =
    (naPrevia && resultado.paginas.find((p) => p.arquivo === paginaEscolhida)) ||
    resultado.paginas.find((p) => foco && (p.etapaId === foco || (p.cidadeId === foco && !p.etapaId))) ||
    resultado.paginas.find((p) => p.tipo === 'praca') ||
    resultado.paginas[0];

  return (
    <>
      <Cabecalho passo="cadastro" titulo="Cadastro">{unica ? 'Preencha os valores da página. A lista de cidades (se houver) alimenta os trechos que se repetem, como agenda e acordeão.' : 'Preencha os valores. Cada linha vira uma página. Dá para colar linhas de uma planilha. A prévia mostra a linha em que você está.'}</Cabecalho>
      {naPrevia ? (
        <div className="stack">
          <div className="w-item info"><span className="ic">✎</span><div>Clique num texto da página e digite. Só os textos que vêm do cadastro ficam marcados e podem ser editados. Imagens e vídeos se trocam no passo Mídia.</div></div>
          {resultado.paginas.length > 1 && (
            <label className="row small" style={{ gap: 6 }}>Página:
              <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} value={pagina?.arquivo || ''} onChange={(e) => setPaginaEscolhida(e.target.value)}>
                {resultado.paginas.map((p) => <option key={p.arquivo} value={p.arquivo}>{p.titulo} · {p.arquivo}</option>)}
              </select>
            </label>
          )}
          <Previa html={pagina?.html ?? null} titulo={pagina ? `${pagina.titulo} · ${pagina.arquivo}` : 'Prévia'} altura={Math.max(520, alturaJanela - 260)} editar aoEditar={editarNaPrevia} extra={trocaModo} />
        </div>
      ) : (
      <div className="split">
        <div className="stack" style={{ minWidth: 0 }}>
          <div className="row between" style={{ gap: 8 }}>
            <Planilha />
            <input className="inp busca-cad" type="search" placeholder="Buscar campo ou valor…" aria-label="Buscar no cadastro" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Gerais busca={busca} />
          {unica ? temLista && <ListaEmBlocos busca={busca} /> : <Tabela tipo="cidade" foco={foco} setFoco={setFoco} busca={busca} />}
          {evento.formato === 'tapume_etapa_praca' && <Tabela tipo="etapa" foco={foco} setFoco={setFoco} busca={busca} />}
        </div>
        <div className="lado">
          <Previa html={pagina?.html ?? null} titulo={pagina ? `${pagina.titulo} · ${pagina.arquivo}` : 'Prévia'} altura={560} extra={trocaModo} />
        </div>
      </div>
      )}
      <NavPassos passo="cadastro" />
    </>
  );
}
