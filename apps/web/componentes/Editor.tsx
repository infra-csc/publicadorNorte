'use client';
// Estado do evento aberto: carrega uma vez, guarda as edições e salva sozinho (1 s depois da última mudança).
import { Cadastro, detectar, FORMATOS, sincronizarVars, type Deteccao, type TipoPagina } from '@norte/motor';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { arquivosDoBanco, migrarOnePage, paginasComPatrocinio } from '@/lib/comum/montagem';
import type { ArquivoMidia, BancoPatrocinios, Evento, EventoCompleto, UsoPatrocinadores } from '@/lib/comum/tipos';
import { api, ErroApi, json } from './api';
import { useRolagemArrastando } from './rolagemArrastando';
import { Topo } from './Topo';

export const PASSOS = [
  ['evento', 'Evento', 'Nome e formato'],
  ['paginas', 'Páginas', 'Subir os HTMLs e a mídia'],
  ['variaveis', 'Variáveis', 'O que muda em cada página'],
  ['cadastro', 'Cadastro', 'Valores das páginas'],
  ['midia', 'Mídia', 'Trocar imagens e vídeos'],
  ['patrocinios', 'Patrocínios', 'Logos dos patrocinadores'],
  ['secoes', 'Seções', 'Ordem e o que aparece'],
  ['conferir', 'Conferir', 'Prévia e avisos'],
  ['publicar', 'Publicar', 'Colocar o site no ar'],
] as const;
export type Passo = (typeof PASSOS)[number][0];

// todos os formatos têm todos os passos (o One page é uma página interna com a linha única do cadastro)
export const passosDo = (_e: Evento) => PASSOS;

type EstadoSalvar = 'ok' | 'pend' | 'salvando' | 'erro' | 'conflito';

interface Contexto {
  evento: Evento;
  modelos: Partial<Record<TipoPagina, string>>;
  arquivos: ArquivoMidia[];
  /** arquivos para a prévia: os do evento + os logos do banco de patrocinadores */
  arquivosPrevia: ArquivoMidia[];
  /** banco geral de patrocinadores (null enquanto carrega) */
  banco: BancoPatrocinios | null;
  usoPatrocinadores: UsoPatrocinadores;
  /** muda e grava o banco geral (refaz em cima da versão nova se outra pessoa gravou antes) */
  salvarBanco: (fn: (b: BancoPatrocinios) => void) => Promise<void>;
  /** detecção das variáveis dos HTMLs atuais */
  det: Deteccao;
  /** leitura do cadastro (valores calculados, nomes, arquivos) */
  cad: Cadastro;
  alterar: (fn: (e: Evento) => void) => void;
  /** desfazer / refazer as mudanças do evento (digitação seguida conta como uma) */
  desfazer: () => void;
  refazer: () => void;
  podeDesfazer: boolean;
  podeRefazer: boolean;
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
  const [banco, setBanco] = useState<{ banco: BancoPatrocinios; versao: string; uso: UsoPatrocinadores } | null>(null);
  const bancoRef = useRef<{ banco: BancoPatrocinios; versao: string; uso: UsoPatrocinadores } | null>(null);
  const lerBanco = useCallback(() => api<{ banco: BancoPatrocinios; versao: string; uso: UsoPatrocinadores }>('/api/patrocinadores').then((b) => { bancoRef.current = b; setBanco(b); return b; }), []);
  useEffect(() => { lerBanco().catch(() => {}); }, [lerBanco]);
  const salvarBanco = useCallback(async (fn: (b: BancoPatrocinios) => void) => {
    for (let tentativa = 0; ; tentativa++) {
      const atual = bancoRef.current || (await lerBanco());
      const novo = structuredClone(atual.banco);
      fn(novo);
      try {
        const r = await api<{ versao: string }>('/api/patrocinadores', json('PUT', { banco: novo, versao: atual.versao }));
        bancoRef.current = { ...atual, banco: novo, versao: r.versao };
        setBanco(bancoRef.current);
        return;
      } catch (e) {
        if (e instanceof ErroApi && e.status === 409 && tentativa < 2) { await lerBanco(); continue; }
        throw e;
      }
    }
  }, [lerBanco]);
  useRolagemArrastando();

  useEffect(() => {
    api<EventoCompleto>(`/api/hotsites/${slug}`).then(
      (d) => { evRef.current = d.evento; versaoRef.current = d.versao; setDados(d); },
      (e) => setErro(e.message),
    );
  }, [slug]);

  const salvarAgora = useCallback(async (): Promise<void> => {
    if (salvando.current) { pendente.current = true; return salvando.current; }
    const p = (async () => {
      setEstado('salvando');
      try {
        const r = await api<{ versao: string }>(`/api/hotsites/${slug}`, json('PUT', { evento: evRef.current, versao: versaoRef.current }));
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

  // histórico para desfazer/refazer (fica só nesta aba)
  const hist = useRef<{ antes: Evento[]; depois: Evento[]; ultimo: number }>({ antes: [], depois: [], ultimo: 0 });
  const [, setMarcaHist] = useState(0);

  const trocarEvento = useCallback((e: Evento) => {
    evRef.current = e;
    setDados((d) => (d ? { ...d, evento: e } : d));
    setEstado((s) => (s === 'conflito' ? s : 'pend'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { salvarAgora(); }, 1000);
  }, [salvarAgora]);

  const alterar = useCallback((fn: (e: Evento) => void) => {
    const antes = evRef.current;
    if (!antes) return;
    const e = structuredClone(antes);
    fn(e);
    const h = hist.current;
    const agora = Date.now();
    // digitação seguida (menos de 0,8 s entre as mudanças) vira um passo só
    if (agora - h.ultimo > 800) { h.antes.push(antes); if (h.antes.length > 100) h.antes.shift(); }
    h.ultimo = agora;
    h.depois = [];
    setMarcaHist((n) => n + 1);
    trocarEvento(e);
  }, [trocarEvento]);

  // One page antigo: leva os valores da "linha da página" para os gerais (uma vez, ao abrir)
  const migrou = useRef(false);
  useEffect(() => {
    if (!dados || migrou.current) return;
    migrou.current = true;
    const e = structuredClone(dados.evento);
    if (migrarOnePage(e, dados.modelos)) trocarEvento(e);
  }, [dados, trocarEvento]);

  const desfazer = useCallback(() => {
    const h = hist.current;
    const ant = h.antes.pop();
    if (!ant || !evRef.current) return;
    h.depois.push(evRef.current);
    h.ultimo = 0;
    setMarcaHist((n) => n + 1);
    trocarEvento(ant);
  }, [trocarEvento]);

  const refazer = useCallback(() => {
    const h = hist.current;
    const prox = h.depois.pop();
    if (!prox || !evRef.current) return;
    h.antes.push(evRef.current);
    h.ultimo = 0;
    setMarcaHist((n) => n + 1);
    trocarEvento(prox);
  }, [trocarEvento]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y fora dos campos de texto (dentro deles vale o desfazer do próprio campo)
  useEffect(() => {
    const f = (ev: KeyboardEvent) => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      const t = ev.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select') || t.isContentEditable)) return;
      const k = ev.key.toLowerCase();
      if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); desfazer(); }
      else if ((k === 'z' && ev.shiftKey) || k === 'y') { ev.preventDefault(); refazer(); }
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [desfazer, refazer]);

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
    () => (det && dados ? new Cadastro(det, { ...dados.evento, vars, arquivos: dados.arquivos.map((a) => a.caminho), agora: new Date() }) : null),
    [det, dados?.evento, vars, dados?.arquivos],
  );

  if (erro) return <><Topo /><div className="shell home"><main className="main"><div className="w-item bad"><span className="ic">✕</span><div><b>Não consegui abrir o evento</b>{erro} <Link href="/">Voltar para a lista</Link></div></div></main></div></>;
  if (!dados || !det || !cad) return <><Topo /><div className="shell home"><main className="main"><p className="muted">Carregando o evento…</p></main></div></>;

  const ev = dados.evento;
  const hrefPasso = (p: Passo) => `/eventos/${ev.slug}/${p}`;
  const contexto: Contexto = {
    evento: ev, modelos: dados.modelos, arquivos: dados.arquivos, det, cad, alterar, salvarJa, hrefPasso,
    desfazer, refazer, podeDesfazer: hist.current.antes.length > 0, podeRefazer: hist.current.depois.length > 0,
    arquivosPrevia: [...dados.arquivos, ...arquivosDoBanco(banco?.banco)], banco: banco?.banco || null, usoPatrocinadores: banco?.uso || {}, salvarBanco,
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
    patrocinios: paginasComPatrocinio(ev).some((p) => (ev.patrocinios?.porPagina[p.id]?.blocos.length || 0) > 0),
    secoes: !!(ev.secoes?.ocultas?.length || Object.keys(ev.secoes?.ordem || {}).length),
    conferir: false,
    publicar: ev.versaoAtiva != null,
  };
  const textoSalvar = { ok: 'Salvo', pend: 'Alterações…', salvando: 'Salvando…', erro: 'Erro ao salvar', conflito: 'Outra pessoa salvou' }[estado];

  return (
    <Ctx.Provider value={contexto}>
      <Topo crumb={ev.nome}>
        <span className="row desfazer" style={{ gap: 2, marginLeft: 'auto' }}>
          <button className="iconbtn" type="button" onClick={desfazer} disabled={!hist.current.antes.length} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4 2.5 7.5 6 11M3 7.5h6.5a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="iconbtn" type="button" onClick={refazer} disabled={!hist.current.depois.length} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 4l3.5 3.5L10 11M13 7.5H6.5a4 4 0 0 0 0 8H8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </span>
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
