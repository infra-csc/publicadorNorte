'use client';
import { ehMidia, FORMATOS, lerBlocos, NOME_PAGINA, slugValor, sincronizarVars, type Dono, type No, type TipoPagina, type VarDetectada } from '@norte/motor';
import { useEffect, useState } from 'react';
import { Cabecalho, NavPassos, useEditor } from '../Editor';

type Grupo = 'geral' | 'cidade' | 'etapa' | 'img' | 'auto' | 'excluida' | 'ignorar';

const GRUPOS: [Grupo, string, string][] = [
  ['geral', 'Igual em todas as páginas', 'Você preenche uma vez e o valor aparece em todas as páginas.'],
  ['cidade', 'Muda em cada cidade', 'Cada uma vira uma coluna na tabela de cidades. Você preenche uma linha para cada cidade.'],
  ['etapa', 'Muda em cada etapa', 'Cada uma vira uma coluna na tabela de etapas. Você preenche uma linha para cada etapa.'],
  ['img', 'Imagens e vídeos', 'Cada uma escolhe um arquivo da pasta da sua seção, no passo Mídia. Clique para dizer se é igual em todas as páginas ou muda em cada cidade.'],
  ['auto', 'Preenchidas sozinhas', 'Você não precisa preencher: links entre as páginas, contagens e abreviações.'],
  ['excluida', 'Excluídas do cadastro', 'Saem em branco na página. Clique numa delas para trazer de volta.'],
  ['ignorar', 'Não são variáveis', 'Ficam na página do jeito que estão escritas.'],
];
/** no One page não há cidades: "da página" no lugar de "muda em cada cidade" */
const GRUPOS_UNICA: Partial<Record<Grupo, [string, string]>> = {
  geral: ['Gerais', 'Você preenche uma vez, nos campos gerais do cadastro.'],
  cidade: ['Da página', 'Cada uma vira um campo no cadastro da página.'],
  img: ['Imagens e vídeos', 'Cada uma escolhe um arquivo da pasta da sua seção, no passo Mídia.'],
};

function ResumoBlocos() {
  const { evento, modelos } = useEditor();
  const itens: React.ReactNode[] = [];
  for (const k of FORMATOS[evento.formato].paginas) {
    const html = modelos[k];
    if (html == null) continue;
    const { raiz, erros } = lerBlocos(html);
    const frases: React.ReactNode[] = [];
    const ver = (nos: No[], grupo: string | null) => nos.forEach((n) => {
      if (n.t === 'repetir') {
        const se = n.filhos.find((f) => f.t === 'se' && f.op);
        frases.push(
          <span key={frases.length}>
            O publicador cria um card para cada {n.alvo} cadastrada{grupo && <> e junta os cards por <span className="v">@{grupo}</span></>}.
            {se && se.t === 'se' && <> Quando <span className="v">@{se.col}</span> é “{slugValor(se.val) === 'breve' ? 'em breve' : se.val}”, o card usa um modelo; nos outros casos, usa outro.</>}{' '}
          </span>,
        );
      } else if (n.t === 'agrupar') ver(n.filhos, n.col);
      else if (n.t === 'se') { ver(n.filhos, grupo); ver(n.senao, grupo); }
    });
    ver(raiz, null);
    if (erros.length) itens.push(<div key={k} className="w-item bad"><span className="ic">✕</span><div><b>{NOME_PAGINA[k]}: o HTML tem um bloco aberto e não fechado</b>{erros.map((e) => e.msg).join(' · ')}. Peça para quem montou o HTML conferir.</div></div>);
    else if (frases.length) itens.push(<div key={k} className="w-item info"><span className="ic">↻</span><div><b>{NOME_PAGINA[k]}: tem um bloco que se repete</b>{frases} Sem cidade cadastrada, não aparece card.</div></div>);
  }
  return itens.length ? <div className="warns">{itens}</div> : null;
}

export function PassoVariaveis() {
  const { evento, det, cad, alterar, modelos } = useEditor();
  const [aberto, setAberto] = useState<string | null>(null);
  const vars = cad.vars;
  const comEtapas = evento.formato === 'tapume_etapa_praca';
  const unica = evento.formato === 'unica';
  const grupos = GRUPOS.map(([g, t, s]): [Grupo, string, string] => (unica && GRUPOS_UNICA[g] ? [g, ...GRUPOS_UNICA[g]!] : [g, t, s]));

  useEffect(() => {
    const f = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.chipw')) setAberto(null); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(null); };
    document.addEventListener('click', f);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('click', f); document.removeEventListener('keydown', k); };
  }, []);

  const todas = [...det.variaveis.values()];
  const grupoDe = (b: string): Grupo => {
    const v = vars[b];
    if (v.excluida) return 'excluida';
    if (v.ignorar) return 'ignorar';
    if (ehMidia(b)) return 'img';
    return v.dono;
  };
  const onde = (d: VarDetectada) => (Object.keys(d.por) as TipoPagina[]).map((k) => NOME_PAGINA[k].toLowerCase()).join(' e ');

  function mover(b: string, para: Grupo | 'volta') {
    setAberto(null);
    alterar((e) => {
      e.vars = sincronizarVars(det, e.vars);
      const v = e.vars[b];
      if (para === 'volta') v.excluida = false;
      else if (para === 'ignorar') { v.ignorar = true; v.excluida = false; }
      else if (para === 'excluida') v.excluida = true;
      else { v.ignorar = false; v.excluida = false; v.dono = para as Dono; v.manual = true; }
    });
  }

  const faltaHtml = FORMATOS[evento.formato].paginas.filter((k) => modelos[k] == null);
  const destinos = (g: Grupo): [Grupo | 'volta', string][] => {
    if (g === 'excluida') return [['volta', 'Trazer de volta para o cadastro']];
    const l: [Grupo, string][] = [['geral', unica ? 'Gerais' : 'Igual em todas as páginas'], ['cidade', unica ? 'Da página' : 'Muda em cada cidade'], ...(comEtapas ? [['etapa', 'Muda em cada etapa'] as [Grupo, string]] : []), ['ignorar', 'Não é variável']];
    return l.filter(([k]) => k !== g);
  };

  return (
    <>
      <Cabecalho passo="variaveis" titulo="Variáveis">
        Achamos {todas.filter((d) => !vars[d.base]?.ignorar).length} variáveis nos HTMLs. O grupo de cada uma diz onde você preenche o valor no próximo passo. Se alguma estiver no grupo errado, clique nela para trocar.
      </Cabecalho>
      {faltaHtml.length > 0 && <div className="w-item warn"><span className="ic">!</span><div><b>Falta o HTML de {faltaHtml.map((k) => NOME_PAGINA[k]).join(' e ')}</b>As variáveis dessa página aparecem aqui depois do envio.</div></div>}
      <ResumoBlocos />
      {todas.length ? (
        <div className="stack">
          {grupos.map(([g, titulo, sub]) => {
            const lista = todas.filter((d) => vars[d.base] && grupoDe(d.base) === g).sort((a, b) => a.base.localeCompare(b.base));
            if (!lista.length && ['ignorar', 'auto', 'etapa', 'img', 'excluida'].includes(g)) return null;
            return (
              <section key={g} className="vgrp">
                <div><h2>{titulo} <span className="cnt">{lista.length}</span></h2><p>{sub}</p></div>
                <div className="chips">
                  {lista.length ? lista.map((d) => (
                    <span key={d.base} className="chipw">
                      <button type="button" className={'chip' + (g === 'ignorar' || g === 'excluida' ? ' off' : '')} aria-expanded={aberto === d.base} title={`Aparece no ${onde(d)}`}
                        onClick={() => g !== 'auto' && setAberto(aberto === d.base ? null : d.base)}>
                        @{d.base}{g === 'img' && vars[d.base].dono !== 'geral' ? ' · por cidade' : ''}{g !== 'auto' && ' ▾'}
                      </button>
                      {aberto === d.base && (
                        <span className="menu" role="menu">
                          <span className="menu-t">Aparece no {onde(d)}. Mover para:</span>
                          {destinos(g).filter(([k]) => !(g === 'img' && k === vars[d.base].dono)).map(([k, n]) => (
                            <button key={k} type="button" role="menuitem" onClick={() => mover(d.base, k)}>{n}</button>
                          ))}
                        </span>
                      )}
                    </span>
                  )) : <span className="muted small">Nenhuma.</span>}
                </div>
              </section>
            );
          })}
        </div>
      ) : <div className="card empty">Nenhuma variável encontrada ainda. Envie os HTMLs no passo anterior.</div>}
      <NavPassos passo="variaveis" />
    </>
  );
}
