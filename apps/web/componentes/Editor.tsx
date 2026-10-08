'use client';
// Estado do evento aberto: carrega uma vez, guarda as edições e salva sozinho (1 s depois da última mudança).
import { Cadastro, detectar, FORMATOS, sincronizarVars, type Deteccao, type TipoPagina } from '@norte/motor';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ArquivoMidia, Evento, EventoCompleto } from '@/lib/comum/tipos';
import { api, ErroApi, json } from './api';
import { Topo } from './Topo';

export const PASSOS = [
  ['evento', 'Evento', 'Nome e formato'],
  ['paginas', 'Páginas', 'Subir os HTMLs e a mídia'],
  ['variaveis', 'Variáveis', 'O que muda em cada página'],
  ['cadastro', 'Cadastro', 'Valores de cada cidade'],
  ['midia', 'Mídia', 'Imagens, vídeos e seções'],
  ['conferir', 'Conferir', 'Prévia e avisos'],
  ['publicar', 'Publicar', 'Colocar o site no ar'],
] as const;
export type Passo = (typeof PASSOS)[number][0];

export const passosDo = (e: Evento) => PASSOS.filter(([k]) => e.formato !== 'unica' || !['variaveis', 'cadastro', 'midia'].includes(k));

type EstadoSalvar = 'ok' | 'pend' | 'salvando' | 'erro' | 'conflito';

interface Contexto {
  evento: Evento;
  modelos: Partial<Record<TipoPagina, string>>;
  arquivos: ArquivoMidia[];
  /** detecção das variáveis dos HTMLs atuais */
  det: Deteccao;
  /** leitura do cadastro (valores calculados, nomes, arquivos) */
  cad: Cadastro;
  alterar: (fn: (e: Evento) => void) => void;
  setModelo: (tipo: TipoPagina, html: string) => void;
  setArquivos: (a: ArquivoMidia[]) => void;
  /** salva agora o que estiver pendente */
  salvarJa: () => Promise<void>;
  /** troca o evento pelo que o servidor devolveu (depois de publicar, por exemplo) */
  substituir: (e: Evento, versao: string) => void;
  hrefPasso: (p: Passo) => string;
}

const Ctx = createContext<Contexto | null>(null);
export const useEditor = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('fora do editor');
  return c;
};

export function Editor({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [dados, setDados] = useState<EventoCompleto | null>(null);
  const [erro, setErro] = useState('');
  const [estado, setEstado] = useState<EstadoSalvar>('ok');
  const [msgSalvar, setMsgSalvar] = useState('');
  const evRef = useRef<Evento | null>(null);
  const versaoRef = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const salvando = useRef<Promise<void> | null>(null);
  const pendente = useRef(false);
  const path = usePathname();

  useEffect(() => {
    api<EventoCompleto>(`/api/eventos/${slug}`).then(
      (d) => { evRef.current = d.evento; versaoRef.current = d.versao; setDados(d); },
      (e) => setErro(e.message),
    );
  }, [slug]);

  const salvarAgora = useCallback(async (): Promise<void> => {
    if (salvando.current) { pendente.current = true; return salvando.current; }
    const p = (async () => {
      setEstado('salvando');
      try {
        const r = await api<{ versao: string }>(`/api/eventos/${slug}`, json('PUT', { evento: evRef.current, versao: versaoRef.current }));
        versaoRef.current = r.versao;
        setEstado('ok');
      } catch (e) {
        setEstado(e instanceof ErroApi && e.status === 409 ? 'conflito' : 'erro');
        setMsgSalvar((e as Error).message);
        pendente.current = false;
      }
    })();
    salvando.current = p;
    await p;
    salvando.current = null;
    if (pendente.current) { pendente.current = false; await salvarAgora(); }
  }, [slug]);

  const alterar = useCallback((fn: (e: Evento) => void) => {
    setDados((d) => {
      if (!d) return d;
      const e = structuredClone(d.evento);
      fn(e);
      evRef.current = e;
      return { ...d, evento: e };
    });
    setEstado((s) => (s === 'conflito' ? s : 'pend'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { salvarAgora(); }, 1000);
  }, [salvarAgora]);

  const salvarJa = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = undefined; await salvarAgora(); }
    else if (salvando.current) await salvando.current;
  }, [salvarAgora]);

  // avisa antes de fechar a aba com alteração não salva
  useEffect(() => {
    const f = (ev: BeforeUnloadEvent) => { if (estado === 'pend' || estado === 'salvando') ev.preventDefault(); };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [estado]);

  const det = useMemo(() => (dados ? detectar(dados.modelos, dados.evento.formato) : null), [dados?.modelos, dados?.evento.formato]);
  const vars = useMemo(() => (det && dados ? sincronizarVars(det, dados.evento.vars) : {}), [det, dados?.evento.vars]);
  const cad = useMemo(
    () => (det && dados ? new Cadastro(det, { ...dados.evento, vars, arquivos: dados.arquivos.map((a) => a.caminho) }) : null),
    [det, dados?.evento, vars, dados?.arquivos],
  );

  if (erro) return <><Topo /><div className="shell home"><main className="main"><div className="w-item bad"><span className="ic">✕</span><div><b>Não consegui abrir o evento</b>{erro} <Link href="/">Voltar para a lista</Link></div></div></main></div></>;
  if (!dados || !det || !cad) return <><Topo /><div className="shell home"><main className="main"><p className="muted">Carregando o evento…</p></main></div></>;

  const ev = dados.evento;
  const hrefPasso = (p: Passo) => `/eventos/${ev.slug}/${p}`;
  const contexto: Contexto = {
    evento: ev, modelos: dados.modelos, arquivos: dados.arquivos, det, cad, alterar, salvarJa, hrefPasso,
    setModelo: (tipo, html) => setDados((d) => (d ? { ...d, modelos: { ...d.modelos, [tipo]: html } } : d)),
    setArquivos: (a) => setDados((d) => (d ? { ...d, arquivos: a } : d)),
    substituir: (e, versao) => { evRef.current = e; versaoRef.current = versao; setDados((d) => (d ? { ...d, evento: e } : d)); setEstado('ok'); },
  };
  const atual = path.split('/').pop();
  const feito: Record<string, boolean> = {
    evento: !!ev.nome,
    paginas: FORMATOS[ev.formato].paginas.every((k) => dados.modelos[k] != null),
    variaveis: det.variaveis.size > 0,
    cadastro: ev.cidades.length > 0,
    midia: dados.arquivos.length > 0,
    conferir: false,
    publicar: ev.versaoAtiva != null,
  };
  const textoSalvar = { ok: 'Salvo', pend: 'Alterações…', salvando: 'Salvando…', erro: 'Erro ao salvar', conflito: 'Outra pessoa salvou' }[estado];

  return (
    <Ctx.Provider value={contexto}>
      <Topo crumb={ev.nome}>
        <span className="save" data-s={estado} title={msgSalvar}><i></i><span>{textoSalvar}</span></span>
      </Topo>
      <div className="shell">
        <nav className="rail" aria-label="Passos">
          {passosDo(ev).map(([k, lbl, sub], i) => (
            <Link key={k} href={hrefPasso(k)} aria-current={atual === k ? 'step' : undefined} className={feito[k] ? 'done' : ''}>
              <span className="n">{feito[k] ? '✓' : i + 1}</span>
              <span><span className="lbl">{lbl}</span><span className="sub">{sub}</span></span>
            </Link>
          ))}
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '12px 4px' }} />
          <Link href="/" className="small"><span className="n" style={{ border: 0 }}>←</span><span>Todos os eventos</span></Link>
        </nav>
        <main className="main">
          {(estado === 'erro' || estado === 'conflito') && (
            <div className="w-item bad"><span className="ic">!</span><div>
              <b>{estado === 'conflito' ? 'Outra pessoa salvou este evento enquanto você editava' : 'Não consegui salvar'}</b>
              {estado === 'conflito' ? 'Para não apagar o trabalho dela, suas últimas mudanças não foram gravadas. Recarregue a página para ver a versão atual.' : msgSalvar}{' '}
              {estado === 'erro' ? <button className="btn sm" type="button" onClick={() => salvarAgora()}>Tentar de novo</button> : <button className="btn sm" type="button" onClick={() => location.reload()}>Recarregar</button>}
            </div></div>
          )}
          {children}
        </main>
      </div>
    </Ctx.Provider>
  );
}

/** cabeçalho de passo com "Passo N de M" */
export function Cabecalho({ passo, titulo, children }: { passo: Passo; titulo: string; children?: React.ReactNode }) {
  const { evento } = useEditor();
  const l = passosDo(evento);
  const i = l.findIndex((p) => p[0] === passo);
  return (
    <div className="head">
      <span className="eyebrow">Passo {i + 1} de {l.length}</span>
      <h1>{titulo}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function NavPassos({ passo }: { passo: Passo }) {
  const { evento, hrefPasso } = useEditor();
  const l = passosDo(evento);
  const i = l.findIndex((p) => p[0] === passo);
  const ant = l[i - 1];
  const prox = l[i + 1];
  return (
    <div className="navfoot">
      {ant ? <Link className="btn ghost" href={hrefPasso(ant[0])}>← {ant[1]}</Link> : <span />}
      {prox && <Link className="btn pri" href={hrefPasso(prox[0])}>{prox[1]} →</Link>}
    </div>
  );
}

/** sincroniza o estado das variáveis depois de um HTML novo (dono inferido, fórmulas padrão) */
export function varsSincronizadas(e: Evento, modelos: Partial<Record<TipoPagina, string>>) {
  return sincronizarVars(detectar(modelos, e.formato), e.vars);
}
