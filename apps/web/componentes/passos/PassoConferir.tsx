'use client';
import type { Aviso } from '@norte/motor';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { gerarEvento } from '@/lib/comum/montagem';
import { Cabecalho, NavPassos, useEditor, type Passo } from '../Editor';
import { Previa } from '../Previa';

const PASSO_DO_AVISO: Record<Aviso['passo'], Passo> = { evento: 'evento', paginas: 'paginas', variaveis: 'variaveis', cadastro: 'cadastro', midia: 'midia', patrocinios: 'patrocinios', secoes: 'secoes', conferir: 'conferir', publicar: 'publicar' };

export function Avisos({ avisos }: { avisos: Aviso[] }) {
  const { hrefPasso } = useEditor();
  if (!avisos.length) return <div className="w-item ok"><span className="ic">✓</span><div><b>Nenhum aviso</b>Tudo certo para publicar.</div></div>;
  return (
    <div className="warns">
      {avisos.map((a, i) => (
        <div key={i} className={'w-item ' + (a.nivel === 'bloqueia' ? 'bad' : 'warn')}>
          <span className="ic">{a.nivel === 'bloqueia' ? '✕' : '!'}</span>
          <div><b>{a.titulo}</b>{a.detalhe} <Link href={hrefPasso(PASSO_DO_AVISO[a.passo])}>Corrigir →</Link></div>
        </div>
      ))}
    </div>
  );
}

export function PassoConferir() {
  const { evento, modelos, arquivos, banco } = useEditor();
  const ev = useDeferredValue(evento);
  const r = useMemo(() => gerarEvento(ev, modelos, arquivos, banco), [ev, modelos, arquivos, banco]);
  const [sel, setSel] = useState(0);
  const p = r.paginas[Math.min(sel, r.paginas.length - 1)];
  return (
    <>
      <Cabecalho passo="conferir" titulo="Conferir">Veja cada página como vai ficar e resolva os avisos. Os vermelhos impedem a publicação.</Cabecalho>
      <Avisos avisos={r.avisos} />
      {r.paginas.length > 0 ? (
        <div className="check">
          <div className="plist" role="list">
            {r.paginas.map((x, i) => (
              <button key={x.arquivo + i} type="button" aria-pressed={i === sel} className={x.nivel ? 'ind' : ''} onClick={() => setSel(i)}>
                <span style={{ minWidth: 0 }}><span className="t">{x.titulo}</span><span className="a">{x.arquivo}</span></span>
                <span className={'dot' + (x.avisos ? ' w' : '')} title={x.avisos ? `${x.avisos} aviso(s)` : 'sem avisos'} />
              </button>
            ))}
          </div>
          <Previa html={p?.html ?? null} titulo={p ? `${p.titulo} · ${p.arquivo}` : 'Prévia'} altura={800} />
        </div>
      ) : <div className="card empty">Nenhuma página gerada ainda.</div>}
      <NavPassos passo="conferir" />
    </>
  );
}
