import Link from 'next/link';

/** `aba`: mostra as abas Eventos | Patrocínios (telas de fora do evento) */
export function Topo({ crumb, aba, children }: { crumb?: string; aba?: 'eventos' | 'patrocinios'; children?: React.ReactNode }) {
  return (
    <header className="top">
      <div className="top-in">
        <Link className="brand" href="/" aria-label="Ir para a lista de eventos">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <rect x="1" y="1" width="24" height="24" rx="6" fill="var(--ink)" />
            <path d="M8 18V8l10 10V8" stroke="var(--paper)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Publicador</span>
        </Link>
        {aba && (
          <nav className="abas" aria-label="Seções do publicador">
            <Link href="/" aria-current={aba === 'eventos' ? 'page' : undefined}>Eventos</Link>
            <Link href="/patrocinios" aria-current={aba === 'patrocinios' ? 'page' : undefined}>Patrocínios</Link>
          </nav>
        )}
        {crumb && <span className="crumb">{crumb}</span>}
        {children}
      </div>
    </header>
  );
}
