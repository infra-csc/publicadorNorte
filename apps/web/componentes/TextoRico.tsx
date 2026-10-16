'use client';
// Campo de texto com formatação: negrito, itálico, sublinhado, maiúsculas, cor, tamanho e espaçamento das letras.
// Sem nada selecionado, a formatação vale para o texto todo. Guarda HTML limpo (limparRico do motor);
// sem formatação, guarda o texto puro (como antes, e como vem da planilha).
import { ehRico, limparRico } from '@norte/motor';
import { useEffect, useRef, useState } from 'react';

const TAMANHOS: [string, string][] = [['', 'Tamanho'], ['0.8em', 'Pequeno'], ['1.2em', 'Grande'], ['1.5em', 'Maior'], ['2em', 'Enorme']];
const ESPACOS: [string, string][] = [['', 'Espaço'], ['-0.02em', 'Junto'], ['0.05em', 'Pouco'], ['0.1em', 'Médio'], ['0.2em', 'Largo']];

const paraTela = (v: string) => (ehRico(v) ? limparRico(v) : v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'));

/** `simples`: o texto vai num atributo ou script da página (sai sem formatação): campo sem a barra */
export function TextoRico({ valor, placeholder, rotulo, mudar, simples }: { valor: string; placeholder?: string; rotulo: string; mudar: (v: string) => void; simples?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const ultimo = useRef<string | null>(null);
  const faixa = useRef<Range | null>(null);
  const [ativo, setAtivo] = useState(false);

  // mostra o valor que veio de fora (planilha, prévia, desfazer); o que a pessoa digitou não volta para o campo
  useEffect(() => {
    const el = ref.current;
    if (!el || valor === ultimo.current) return;
    el.innerHTML = paraTela(valor);
    ultimo.current = valor;
  }, [valor]);

  function emitir() {
    const el = ref.current;
    if (!el) return;
    const limpo = limparRico(el.innerHTML.replace(/&nbsp;/g, ' '));
    const v = ehRico(limpo) ? limpo : (el.textContent || '');
    ultimo.current = v;
    mudar(v);
  }

  function guardarSelecao() {
    const s = getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.getRangeAt(0).commonAncestorContainer)) faixa.current = s.getRangeAt(0).cloneRange();
  }

  /** faixa a formatar: a seleção dentro do campo; sem seleção, o texto todo */
  function alvo(): Range | null {
    const el = ref.current;
    if (!el) return null;
    const r = faixa.current;
    if (r && !r.collapsed && el.contains(r.commonAncestorContainer)) return r;
    const tudo = document.createRange();
    tudo.selectNodeContents(el);
    return tudo;
  }

  function selecionar(r: Range) {
    const s = getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }

  /** negrito, itálico, sublinhado: comando do navegador sobre a seleção (ou o texto todo) */
  function comando(c: 'bold' | 'italic' | 'underline') {
    const r = alvo();
    if (!r) return;
    ref.current?.focus();
    selecionar(r);
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(c);
    guardarSelecao();
    emitir();
  }

  /** estilo num trecho: envolve a seleção (ou o texto todo) num <span style> */
  function estilo(prop: string, valorCss: string) {
    const r = alvo();
    if (!r) return;
    const span = document.createElement('span');
    span.style.setProperty(prop, valorCss);
    span.appendChild(r.extractContents());
    // tira o mesmo estilo de dentro, para o novo valer
    span.querySelectorAll<HTMLElement>('span').forEach((s) => s.style.removeProperty(prop));
    r.insertNode(span);
    const nova = document.createRange();
    nova.selectNodeContents(span);
    faixa.current = nova;
    emitir();
  }

  function limpar() {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = paraTela(el.innerText.replace(/\n+$/, ''));
    emitir();
  }

  const segura = (e: React.MouseEvent) => e.preventDefault();
  return (
    <span className="rico" onFocus={() => setAtivo(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAtivo(false); }}>
      {ativo && !simples && (
        <span className="rico-barra" role="toolbar" aria-label={`Formatar ${rotulo}`}>
          <button type="button" title="Negrito (Ctrl+B)" onMouseDown={segura} onClick={() => comando('bold')}><b>B</b></button>
          <button type="button" title="Itálico (Ctrl+I)" onMouseDown={segura} onClick={() => comando('italic')}><i>I</i></button>
          <button type="button" title="Sublinhado (Ctrl+U)" onMouseDown={segura} onClick={() => comando('underline')}><u>U</u></button>
          <button type="button" title="Maiúsculas" onMouseDown={segura} onClick={() => estilo('text-transform', 'uppercase')}>AA</button>
          <label title="Cor do texto" className="rico-cor" onMouseDown={guardarSelecao}>
            <span aria-hidden="true">A</span>
            <input type="color" aria-label="Cor do texto" onChange={(e) => estilo('color', e.target.value)} />
          </label>
          <select aria-label="Tamanho do texto" value="" onMouseDown={guardarSelecao} onChange={(e) => e.target.value && estilo('font-size', e.target.value)}>
            {TAMANHOS.map(([v, n]) => <option key={n} value={v}>{n}</option>)}
          </select>
          <select aria-label="Espaço entre as letras" value="" onMouseDown={guardarSelecao} onChange={(e) => e.target.value && estilo('letter-spacing', e.target.value)}>
            {ESPACOS.map(([v, n]) => <option key={n} value={v}>{n}</option>)}
          </select>
          <button type="button" title="Tirar a formatação" onMouseDown={segura} onClick={limpar}>Tx</button>
          <small className="muted">Sem seleção, vale para o texto todo</small>
        </span>
      )}
      <div
        ref={ref}
        className="inp campo-auto rico-campo"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={rotulo}
        data-ph={placeholder || ''}
        onInput={emitir}
        onKeyUp={guardarSelecao}
        onMouseUp={guardarSelecao}
        onKeyDown={(e) => {
          if (simples && (e.ctrlKey || e.metaKey) && /^[biu]$/i.test(e.key)) e.preventDefault();
          if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); emitir(); }
        }}
        onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}
      />
    </span>
  );
}
