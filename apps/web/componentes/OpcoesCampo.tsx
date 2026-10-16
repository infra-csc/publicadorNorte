'use client';
// Ícones ao lado de cada campo: ocultar o texto (o bloco mantém o tamanho), ocultar o bloco (o conteúdo de baixo sobe),
// mover o bloco para cima ou para baixo e, nos campos de link, abrir em nova aba. Vale em todas as páginas.
import { sincronizarVars, varsDeLink, varsTextoSimples } from '@norte/motor';
import { useMemo } from 'react';
import { useEditor } from './Editor';

const I = {
  olho: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3 17 17 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  bloco: <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2" /><path d="M7 10h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  cima: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15V5m-4 4 4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  baixo: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5v10m-4-4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  aba: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6M17 3l-8 8M14 12v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

// calculado uma vez por conjunto de HTMLs (o Cadastro tem centenas de campos)
const cacheSimples = new WeakMap<object, Set<string>>();
/** campos que só ficam em atributos (aria-label, alt…) ou scripts da página: texto sem formatação, sem ocultar/mover */
export function useTextoSimples(): Set<string> {
  const { modelos } = useEditor();
  let s = cacheSimples.get(modelos);
  if (!s) cacheSimples.set(modelos, (s = varsTextoSimples(modelos)));
  return s;
}

export function OpcoesCampo({ nome }: { nome: string }) {
  const { evento, modelos, det, alterar } = useEditor();
  const links = useMemo(() => varsDeLink(modelos), [modelos]);
  const v = evento.vars[nome] || {};
  const mudar = (fn: (x: NonNullable<typeof evento.vars[string]>) => void) =>
    alterar((e) => { e.vars = sincronizarVars(det, e.vars); if (e.vars[nome]) fn(e.vars[nome]); });
  const ocultar = (modo: 'texto' | 'bloco') => mudar((x) => { if (x.ocultar === modo) delete x.ocultar; else x.ocultar = modo; });
  const mover = (d: number) => mudar((x) => { const n = (x.mover || 0) + d; if (n) x.mover = n; else delete x.mover; });
  const ehLink = links.has(nome);
  const simples = useTextoSimples().has(nome);
  return (
    <span className="opc-campo" onClick={(e) => e.preventDefault()}>
      {ehLink ? (
        <button type="button" className={v.novaAba !== false ? 'on' : ''} aria-pressed={v.novaAba !== false} title={v.novaAba !== false ? 'Abre em nova aba (clique para abrir na mesma aba)' : 'Abre na mesma aba (clique para abrir em nova aba)'}
          onClick={() => mudar((x) => { if (x.novaAba === false) delete x.novaAba; else x.novaAba = false; })}>{I.aba}</button>
      ) : simples ? (
        <small className="muted" title="Este texto vai num atributo ou script da página (ex.: o nome de um botão para leitores de tela): sai sem formatação e não tem bloco para ocultar ou mover">texto simples</small>
      ) : (
        <>
          <button type="button" className={v.ocultar === 'texto' ? 'on' : ''} aria-pressed={v.ocultar === 'texto'} title="Ocultar o texto (o espaço do bloco fica)" onClick={() => ocultar('texto')}>{I.olho}</button>
          <button type="button" className={v.ocultar === 'bloco' ? 'on' : ''} aria-pressed={v.ocultar === 'bloco'} title="Ocultar o bloco (o conteúdo de baixo sobe)" onClick={() => ocultar('bloco')}>{I.bloco}</button>
          <button type="button" title="Mover o bloco para cima" onClick={() => mover(-1)}>{I.cima}</button>
          <button type="button" title="Mover o bloco para baixo" onClick={() => mover(1)}>{I.baixo}</button>
          {!!v.mover && <small className="opc-mov" title="Posições que o bloco andou (clique para voltar)" onClick={() => mudar((x) => { delete x.mover; })}>{v.mover > 0 ? `↓${v.mover}` : `↑${-v.mover}`}</small>}
        </>
      )}
    </span>
  );
}
