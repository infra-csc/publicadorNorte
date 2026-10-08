'use client';
// Caixa de escolha com o visual do publicador (no lugar do <select> do navegador).
import { useEffect, useId, useRef, useState } from 'react';

export type Opcao = { valor: string; rotulo: string; detalhe?: string };

export function Seletor({ valor, opcoes, mudar, rotulo, vazio = 'Escolha…', desativado, largura }: {
  valor: string;
  opcoes: Opcao[];
  mudar: (v: string) => void;
  /** nome para leitores de tela */
  rotulo: string;
  vazio?: string;
  desativado?: boolean;
  largura?: number | string;
}) {
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();
  const atual = opcoes.find((o) => o.valor === valor);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);
  useEffect(() => { if (aberto) lista.current?.children[foco]?.scrollIntoView({ block: 'nearest' }); }, [aberto, foco]);

  function abrir() {
    if (desativado) return;
    setFoco(Math.max(0, opcoes.findIndex((o) => o.valor === valor)));
    setAberto(true);
  }
  function escolher(i: number) {
    const o = opcoes[i];
    setAberto(false);
    if (o && o.valor !== valor) mudar(o.valor);
  }
  function tecla(e: React.KeyboardEvent) {
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setAberto(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setFoco((f) => Math.min(opcoes.length - 1, f + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFoco((f) => Math.max(0, f - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(foco); }
    else if (e.key === 'Tab') setAberto(false);
  }

  return (
    <div className={'seletor' + (aberto ? ' aberto' : '')} ref={caixa} style={{ width: largura }}>
      <button type="button" className="seletor-botao" aria-haspopup="listbox" aria-expanded={aberto} aria-controls={id} aria-label={rotulo}
        disabled={desativado} onClick={() => (aberto ? setAberto(false) : abrir())} onKeyDown={tecla}>
        <span className={atual ? '' : 'muted'}>{atual?.rotulo || vazio}</span>
        {atual?.detalhe && <span className="seletor-detalhe">{atual.detalhe}</span>}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {aberto && (
        <ul className="seletor-lista" role="listbox" id={id} ref={lista} aria-label={rotulo}>
          {opcoes.map((o, i) => (
            <li key={o.valor} role="option" aria-selected={o.valor === valor} className={i === foco ? 'foco' : ''}
              onPointerEnter={() => setFoco(i)} onPointerDown={(e) => e.preventDefault()} onClick={() => escolher(i)}>
              <span>{o.rotulo}</span>
              {o.detalhe && <span className="seletor-detalhe">{o.detalhe}</span>}
              {o.valor === valor && <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m3 7.5 2.5 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </li>
          ))}
          {!opcoes.length && <li className="muted" aria-disabled="true">Nada para escolher</li>}
        </ul>
      )}
    </div>
  );
}
