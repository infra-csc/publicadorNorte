'use client';
// Cards dos formatos do site, com o desenho de como as páginas se ligam (animado no card escolhido e ao passar o mouse).
import { FORMATOS, type Formato } from '@norte/motor';

export const DESC: Record<Formato, string> = {
  unica: 'Página única, sem variáveis. Publica o HTML do jeito que ele é.',
  tapume_praca: 'Uma página home que lista páginas internas por cidade.',
  tapume_etapa_praca: 'Uma página home, um seletor de etapa e uma interna.',
};

/** caixa do desenho; `i` escalona a animação */
const Caixa = ({ x, y, w, h, chave, i = 0 }: { x: number; y: number; w: number; h: number; chave?: boolean; i?: number }) => (
  <rect x={x} y={y} width={w} height={h} rx={3} className={chave ? 'dg-key' : 'dg-box'} style={{ '--i': i } as React.CSSProperties} />
);
const Texto = ({ x, y, t, chave }: { x: number; y: number; t: string; chave?: boolean }) => (
  <text x={x} y={y} className={chave ? 'dg-t dg-k' : 'dg-t'}>{t}</text>
);

export function Diagrama({ formato }: { formato: Formato }) {
  if (formato === 'unica') {
    return (
      <svg className="dg" viewBox="0 0 240 96" aria-hidden="true">
        <Caixa x={96} y={8} w={48} h={64} chave />
        <path className="dg-ln dg-escrita" d="M104 24h32" style={{ '--i': 0 } as React.CSSProperties} />
        <path className="dg-ln dg-escrita" d="M104 34h32" style={{ '--i': 1 } as React.CSSProperties} />
        <path className="dg-ln dg-escrita" d="M104 44h20" style={{ '--i': 2 } as React.CSSProperties} />
        <path className="dg-ln dg-escrita" d="M104 54h26" style={{ '--i': 3 } as React.CSSProperties} />
        <Texto x={84} y={90} t="PÁGINA ÚNICA" />
      </svg>
    );
  }
  if (formato === 'tapume_praca') {
    return (
      <svg className="dg" viewBox="0 0 240 96" aria-hidden="true">
        <Caixa x={96} y={4} w={48} h={24} chave />
        <path className="dg-ln dg-fluxo" d="M120 28v10M44 38h152M44 38v10M95 38v10M146 38v10M196 38v10" />
        {[0, 1, 2, 3].map((i) => <Caixa key={i} x={30 + i * 51} y={48} w={30} h={30} i={i + 1} />)}
        <Texto x={103} y={20} t="HOME" chave />
        <Texto x={30} y={92} t="PRAÇAS (CIDADES)" />
      </svg>
    );
  }
  // home → cidades (seletor de etapa) → etapas (internas)
  return (
    <svg className="dg" viewBox="0 0 240 104" aria-hidden="true">
      <Caixa x={100} y={2} w={40} h={18} chave />
      <Texto x={106} y={14} t="HOME" chave />
      <path className="dg-ln dg-fluxo" d="M120 20v7M60 27h120M60 27v6M180 27v6M60 51v6M36 57h48M36 57v6M84 57v6M180 51v6M156 57h48M156 57v6M204 57v6" />
      <Caixa x={42} y={33} w={36} h={18} i={1} />
      <Caixa x={162} y={33} w={36} h={18} i={1} />
      {[24, 72, 144, 192].map((x, i) => <Caixa key={x} x={x} y={63} w={24} h={20} i={2 + (i % 2)} />)}
      <Texto x={84} y={46} t="CIDADES" />
      <Texto x={92} y={98} t="ETAPAS" />
    </svg>
  );
}

export function SeletorFormato({ valor, mudar }: { valor: Formato; mudar: (f: Formato) => void }) {
  return (
    <div className="grid3" role="radiogroup" aria-label="Formato do site">
      {(Object.keys(FORMATOS) as Formato[]).map((f) => (
        <button key={f} type="button" className="fmt" role="radio" aria-checked={valor === f} onClick={() => mudar(f)}>
          <span className="tick" aria-hidden="true">
            {valor === f && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
          </span>
          <Diagrama formato={f} />
          <h3>{FORMATOS[f].nome}</h3>
          <p>{DESC[f]}</p>
        </button>
      ))}
    </div>
  );
}
