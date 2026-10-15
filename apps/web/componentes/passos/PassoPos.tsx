'use client';
// Pós-evento: outro HTML que entra no lugar da página (mesmo endereço) quando ligado.
// One page: um para o site; tapume + praça: um por praça; com etapas: por praça e/ou por etapa.
// Aqui ficam o envio do HTML, onde está ligado e os campos que só existem nele (textos, links, botões, imagens).
import { BASE_DO_POS, ehMidia, FORMATOS, galeriasDe, NOME_PAGINA, soNoPos, type Linha, type TipoPos } from '@norte/motor';
import { useDeferredValue, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { Escolha } from '../Escolha';
import { OpcoesCampo } from '../OpcoesCampo';
import { Previa } from '../Previa';
import { Galerias } from './GaleriaFotos';
import { CampoTexto } from './PassoCadastro';
import { ListaMidia } from './PassoMidia';
import { CartaoPagina } from './PassoPaginas';

/** que tipo de campo é, pelo nome (só para ajudar a ler a lista) */
const tipoCampo = (b: string) => (/(^|_)(link|url|href)(_|$)/.test(b) ? 'link' : /(^|_)(botao|btn|cta)(_|$)/.test(b) ? 'botão' : 'texto');

export function PassoPos() {
  const { evento, modelos, arquivos, banco, cad, det, alterar } = useEditor();
  const tipos = FORMATOS[evento.formato].pos;
  const comHtml = tipos.filter((k) => modelos[k] != null);
  const [tipo, setTipo] = useState<TipoPos>(comHtml[0] || tipos[0]);
  const base = BASE_DO_POS[tipo];
  const linhasDoTipo: Linha[] = base === 'etapa' ? evento.etapas : base === 'praca' ? evento.cidades : [];
  const [escolhida, setEscolhida] = useState('');
  const linha = linhasDoTipo.find((l) => l._id === escolhida) || linhasDoTipo[0];
  const ativos = new Set(evento.pos?.ativos || []);
  const comStatus = !!det.opcoes.status;

  const nomeLinha = (l: Linha) => (base === 'etapa'
    ? `${(() => { const c = evento.cidades.find((x) => x._id === l._cidade); return c ? cad.nomeItem('cidade', c) + ' · ' : ''; })()}${cad.nomeItem('etapa', l)}`
    : cad.nomeItem('cidade', l));
  const realizado = (l: Linha) => comStatus && cad.statusDe(l) === 'realizado';
  const ligado = (id: string, l?: Linha) => ativos.has(id) || (!!evento.pos?.comRealizado && !!l && realizado(l));

  const mudarPos = (fn: (p: { ativos: string[]; comRealizado?: boolean }) => void) =>
    alterar((e) => { const p = { ativos: [...(e.pos?.ativos || [])], comRealizado: e.pos?.comRealizado }; fn(p); e.pos = p; });
  const ligar = (ids: string[], sim: boolean) => mudarPos((p) => { const s = new Set(p.ativos); for (const id of ids) if (sim) s.add(id); else s.delete(id); p.ativos = [...s]; });

  // campos que só existem nos HTMLs de pós-evento (o resto continua no Cadastro)
  const doPos = [...det.variaveis.values()].filter((d) => soNoPos(d) && d.por[tipo] != null && !ehMidia(d.base) && cad.vars[d.base] && !cad.vars[d.base].ignorar && !cad.vars[d.base].excluida && cad.vars[d.base].dono !== 'auto');
  const gerais = doPos.filter((d) => cad.vars[d.base].dono === 'geral').map((d) => d.base);
  const daLinha = doPos.filter((d) => cad.vars[d.base].dono === (base === 'etapa' ? 'etapa' : 'cidade')).map((d) => d.base);

  const ev = useDeferredValue(evento);
  const resultado = useMemo(() => gerarEvento(ev, modelos, arquivos, banco, { previaPos: true }), [ev, modelos, arquivos, banco]);
  const pagina = resultado.paginas.find((p) => p.pos && (base === 'unica' || (base === 'etapa' ? p.etapaId === linha?._id : p.cidadeId === linha?._id && !p.etapaId)));
  const cidadeDaMidia = base === 'etapa' ? linha?._cidade || '' : linha?._id || '';

  return (
    <>
      <Cabecalho passo="pos" titulo="Pós-evento">
        Depois do evento, a página pode trocar de HTML no <b>mesmo endereço</b> (resultados, fotos, agradecimento).
        {evento.formato === 'unica' ? ' No One page, é um pós-evento para o site.' : evento.formato === 'tapume_praca' ? ' Cada praça liga o seu.' : ' Cada praça e cada etapa ligam o seu.'}
        {' '}Envie o HTML, preencha os campos e ligue onde já acabou. Vale no site depois de publicar.
      </Cabecalho>

      {tipos.map((k) => <CartaoPagina key={k} tipo={k} />)}

      {comHtml.length > 0 && (
        <>
          {comHtml.length > 1 && (
            <div className="seg" role="group" aria-label="Qual pós-evento">
              {comHtml.map((k) => <button key={k} type="button" aria-pressed={tipo === k} onClick={() => { setTipo(k); setEscolhida(''); }}>{NOME_PAGINA[k]}</button>)}
            </div>
          )}

          <section className="card stack">
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 20 }}>Onde está ligado</h2>
                <p className="small muted" style={{ margin: 0 }}>Ligado, quem abrir o endereço vê o pós-evento no lugar da página. Desligado, volta a página normal.</p>
              </div>
              {base !== 'unica' && linhasDoTipo.length > 1 && (
                <span className="row" style={{ gap: 6 }}>
                  <button className="btn sm ghost" type="button" onClick={() => ligar(linhasDoTipo.map((l) => l._id), true)}>Ligar em todas</button>
                  <button className="btn sm ghost" type="button" onClick={() => ligar(linhasDoTipo.map((l) => l._id), false)}>Desligar todas</button>
                </span>
              )}
            </div>
            {base === 'unica' ? (
              <LinhaPos nome="Site (index.html)" ligado={ativos.has('unica')} mudar={(v) => ligar(['unica'], v)} />
            ) : (
              <div className="pos-lista">
                {linhasDoTipo.map((l) => (
                  <LinhaPos key={l._id} nome={nomeLinha(l)} status={comStatus ? cad.statusDe(l) : undefined}
                    ligado={ligado(l._id, l)} pelaData={!ativos.has(l._id) && ligado(l._id, l)} mudar={(v) => ligar([l._id], v)} />
                ))}
                {!linhasDoTipo.length && <p className="small muted">Nenhuma {base === 'etapa' ? 'etapa' : 'cidade'} no Cadastro ainda.</p>}
              </div>
            )}
            {base !== 'unica' && comStatus && (
              <label className="agenda__prod">
                <input type="checkbox" checked={!!evento.pos?.comRealizado} onChange={(e) => mudarPos((p) => { p.comRealizado = e.target.checked; })} />
                <span>Ligar sozinho quando a {base === 'etapa' ? 'etapa' : 'cidade'} virar <b>realizado</b>{evento.automacao?.ativo ? ' (com o status pelas datas, o site é republicado sozinho)' : ''}</span>
              </label>
            )}
          </section>

          <div className="split">
            <div className="stack" style={{ minWidth: 0 }}>
              <section className="card stack">
                <div className="row between" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 20 }}>Campos do pós-evento</h2>
                  {base !== 'unica' && linhasDoTipo.length > 0 && (
                    <Escolha valor={linha?._id || ''} opcoes={linhasDoTipo.map((l) => ({ valor: l._id, rotulo: nomeLinha(l) }))} mudar={setEscolhida} rotulo={base === 'etapa' ? 'Etapa' : 'Cidade'} />
                  )}
                </div>
                {!gerais.length && !daLinha.length && <p className="small muted" style={{ margin: 0 }}>O HTML do pós-evento não tem textos próprios (variáveis que só existem nele). Os dados do evento, como @cidade e as datas, vêm do Cadastro.</p>}
                {gerais.length > 0 && (
                  <>
                    <span className="eyebrow">{base === 'unica' ? 'Textos, links e botões' : 'Iguais em todas as páginas'}</span>
                    <div className="grid3">
                      {gerais.map((g) => (
                        <div key={g} className="f"><span className="f-cab"><span className="row" style={{ gap: 6 }}><span className="v">@{g}</span><small>{tipoCampo(g)}</small></span><OpcoesCampo nome={g} /></span>
                          <CampoTexto valor={evento.gerais[g] ?? ''} placeholder={cad.calculado(null, g)} rotulo={g} mudar={(v) => alterar((x) => { x.gerais[g] = v; })} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {daLinha.length > 0 && linha && (
                  <>
                    <span className="eyebrow">De {nomeLinha(linha)}</span>
                    <div className="grid3">
                      {daLinha.map((c) => (
                        <div key={c} className="f"><span className="f-cab"><span className="row" style={{ gap: 6 }}><span className="v">@{c}</span><small>{tipoCampo(c)}</small></span><OpcoesCampo nome={c} /></span>
                          <CampoTexto valor={String(linha[c] ?? '')} placeholder={cad.calculado(linha, c)} rotulo={c}
                            mudar={(v) => alterar((x) => { const l = (base === 'etapa' ? x.etapas : x.cidades).find((y) => y._id === linha._id); if (l) l[c] = v; })} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
              <Galerias nomes={galeriasDe({ [tipo]: modelos[tipo] })} />
              <ListaMidia pag={tipo} linhaId={cidadeDaMidia} vazio={null} />
            </div>
            <div className="lado"><Previa html={pagina?.html ?? null} titulo={pagina ? `Pós-evento · ${pagina.titulo} · ${pagina.arquivo}` : 'Prévia do pós-evento'} altura={560} /></div>
          </div>
        </>
      )}
      <NavPassos passo="pos" />
    </>
  );
}

function LinhaPos({ nome, status, ligado, pelaData, mudar }: { nome: string; status?: string; ligado: boolean; pelaData?: boolean; mudar: (v: boolean) => void }) {
  return (
    <div className={'pos-linha' + (ligado ? ' on' : '')}>
      <span className="pos-linha__nome">{nome}</span>
      {status && <span className={'pill ' + (status === 'realizado' ? 'ok' : status === 'aberta' ? 'warn' : '')}>{status === 'breve' ? 'em breve' : status}</span>}
      {pelaData && <span className="small muted">ligado pelo “realizado”</span>}
      <span className="seg" role="group" aria-label={`Pós-evento em ${nome}`} style={{ marginLeft: 'auto' }}>
        <button type="button" aria-pressed={!ligado} onClick={() => mudar(false)} disabled={pelaData}>Página normal</button>
        <button type="button" aria-pressed={ligado} onClick={() => mudar(true)}>Pós-evento</button>
      </span>
    </div>
  );
}
