'use client';
// Caixa de escolha com a lista desenhada pelo app (a do navegador sai branca e sem estilo no Windows).
// Teclado: setas, Enter, Esc e a primeira letra; clique fora fecha.
import { useEffect, useId, useRef, useState } from 'react';

export interface OpcaoEscolha { valor: string; rotulo: string; detalhe?: string }

export function Escolha({ valor, opcoes, mudar, rotulo, vazio = 'Escolha…', compacto = false }: {
  valor: string;
  opcoes: OpcaoEscolha[];
  mudar: (v: string) => void;
  /** nome para leitor de tela */
  rotulo: string;
  /** texto quando o valor não está nas opções */
  vazio?: string;
  compacto?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();
  const atual = opcoes.find((o) => o.valor === valor);

  useEffect(() => {
    if (!aberta) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberta(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberta]);
  useEffect(() => {
    if (aberta) lista.current?.children[ativa]?.scrollIntoView({ block: 'nearest' });
  }, [aberta, ativa]);

  function abrir() {
    setAtiva(Math.max(0, opcoes.findIndex((o) => o.valor === valor)));
    setAberta(true);
  }
  function escolher(i: number) {
    const o = opcoes[i];
    if (o) mudar(o.valor);
    setAberta(false);
  }
  function tecla(e: React.KeyboardEvent) {
    if (!aberta) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAberta(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAtiva((a) => Math.min(opcoes.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtiva((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(ativa); }
    else if (e.key === 'Tab') setAberta(false);
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = opcoes.findIndex((o, j) => j > ativa && o.rotulo.toLowerCase().startsWith(k));
      const j = i >= 0 ? i : opcoes.findIndex((o) => o.rotulo.toLowerCase().startsWith(k));
      if (j >= 0) setAtiva(j);
    }
  }

  return (
    <div ref={caixa} className={'escolha' + (compacto ? ' escolha--compacta' : '') + (aberta ? ' aberta' : '')}>
      <button type="button" className="escolha__botao" aria-haspopup="listbox" aria-expanded={aberta} aria-controls={id} aria-label={rotulo}
        onClick={() => (aberta ? setAberta(false) : abrir())} onKeyDown={tecla}>
        <span className={'escolha__valor' + (atual ? '' : ' muted')}>{atual?.rotulo ?? vazio}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {aberta && (
        <ul ref={lista} id={id} className="escolha__lista" role="listbox" aria-label={rotulo}>
          {opcoes.map((o, i) => (
            <li key={o.valor} role="option" aria-selected={o.valor === valor} className={i === ativa ? 'ativa' : ''}
              onPointerEnter={() => setAtiva(i)} onPointerDown={(e) => e.preventDefault()} onClick={() => escolher(i)}>
              <span>{o.rotulo}</span>
              {o.detalhe && <small className="muted">{o.detalhe}</small>}
              {o.valor === valor && <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="escolha__ok"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
