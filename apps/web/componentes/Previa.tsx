'use client';
// Prévia da página gerada: celular (390×780) ou desktop (1280×800), escalada para caber no painel.
// Os arquivos da _media vêm do armazenamento (não precisa publicar para ver).
// Mudanças entram sem recarregar (o script de dentro troca só o que mudou); se não der, recarrega na mesma rolagem.
import { useEffect, useRef, useState } from 'react';
import { comArquivosDaPrevia } from '@/lib/comum/montagem';
import type { ArquivoMidia } from '@/lib/comum/tipos';
import { urlArquivo } from './api';
import { useEditor } from './Editor';
import { SCRIPT_PREVIA } from './previaScript';

const TELAS = { cel: [390, 780], desk: [1280, 800] } as const;

type Props = {
  html: string | null;
  titulo?: string;
  altura?: number;
  /** textos de variáveis editáveis na própria prévia (o html precisa vir com marcarEdicao) */
  editar?: boolean;
  aoEditar?: (variavel: string, linha: string, valor: string) => void;
  /** botões extras no cabeçalho da prévia */
  extra?: React.ReactNode;
};

/** dentro do editor: arquivos e endereço vêm do evento aberto */
export function Previa(props: Props) {
  const { arquivosPrevia, evento } = useEditor();
  return <PreviaSolta {...props} arquivos={arquivosPrevia} baseUrl={evento.baseUrl} />;
}

/** fora do editor (ex.: aba Patrocínios): recebe os arquivos */
export function PreviaSolta({ html, titulo, altura = 640, arquivos, baseUrl, editar = false, aoEditar, extra }: Props & { arquivos: ArquivoMidia[]; baseUrl?: string }) {
  const [tela, setTela] = useState<keyof typeof TELAS>('cel');
  const [srcDoc, setSrcDoc] = useState('');
  const caixa = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [largura, setLargura] = useState(360);
  // o que o iframe tem agora, se ele já respondeu, onde estava rolado e qual página é
  const atual = useRef('');
  const pronto = useRef(false);
  const rolagem = useRef(0);
  const yInicial = useRef(0);
  const pagina = useRef(titulo);
  const editarRef = useRef(editar);
  const aoEditarRef = useRef(aoEditar);
  // último campo digitado na prévia (para voltar o cursor nele se precisar recarregar)
  const ultimoCampo = useRef<{ v: string; l: string; t: number } | null>(null);
  aoEditarRef.current = aoEditar;

  const recarregar = (h: string, y: number) => {
    pronto.current = false;
    atual.current = h;
    yInicial.current = y;
    setSrcDoc(h);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (html == null) { atual.current = ''; setSrcDoc(''); return; }
      let h = comArquivosDaPrevia(html, arquivos, (a) => location.origin + urlArquivo(a.sha, a.caminho));
      if (baseUrl && !/<base\s/i.test(h)) h = h.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl.replace(/"/g, '')}">`);
      const script = `<script>${SCRIPT_PREVIA}</script>`;
      h = /<head[^>]*>/i.test(h) ? h.replace(/<head([^>]*)>/i, `<head$1>${script}`) : script + h;
      if (h === atual.current) return;
      const outraPagina = pagina.current !== titulo;
      pagina.current = titulo;
      if (!atual.current || outraPagina || !pronto.current) return recarregar(h, outraPagina ? 0 : rolagem.current);
      atual.current = h;
      iframe.current?.contentWindow?.postMessage({ tipo: 'pub-atualizar', html: h }, '*');
    }, atual.current ? 120 : 0);
    return () => clearTimeout(t);
  }, [html, arquivos, baseUrl, titulo]);

  // conversa com o script de dentro da prévia
  useEffect(() => {
    const f = (e: MessageEvent) => {
      const w = iframe.current?.contentWindow;
      if (!w || e.source !== w) return;
      const d = e.data || {};
      if (d.tipo === 'pub-pronto') {
        pronto.current = true;
        const u = ultimoCampo.current;
        const foco = u && Date.now() - u.t < 4000 ? { v: u.v, l: u.l } : null;
        w.postMessage({ tipo: 'pub-base', html: atual.current, y: yInicial.current, editar: editarRef.current, foco }, '*');
      } else if (d.tipo === 'pub-rolagem') rolagem.current = d.y;
      else if (d.tipo === 'pub-resultado') {
        rolagem.current = d.y;
        if (!d.ok) recarregar(atual.current, d.y);
      } else if (d.tipo === 'pub-editar' && typeof d.v === 'string') {
        ultimoCampo.current = { v: d.v, l: d.l || '', t: Date.now() };
        aoEditarRef.current?.(d.v, d.l || '', String(d.valor ?? ''));
      }
    };
    addEventListener('message', f);
    return () => removeEventListener('message', f);
  }, []);

  useEffect(() => {
    editarRef.current = editar;
    iframe.current?.contentWindow?.postMessage({ tipo: 'pub-modo', editar }, '*');
  }, [editar]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth - 22));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [w, h] = TELAS[tela];
  const escala = Math.min(1, largura / w, altura / h);
  return (
    <div className="prev">
      <div className="row between">
        <b className="small">{titulo || 'Prévia'}</b>
        <span className="row" style={{ gap: 8 }}>
          {extra}
          <div className="seg" role="group" aria-label="Tamanho da prévia">
            <button type="button" aria-pressed={tela === 'cel'} onClick={() => setTela('cel')}>Celular</button>
            <button type="button" aria-pressed={tela === 'desk'} onClick={() => setTela('desk')}>Desktop</button>
          </div>
        </span>
      </div>
      <div className="frame-wrap" ref={caixa} style={{ height: h * escala + 22 }}>
        {html == null ? (
          <p className="empty">Nada para mostrar ainda.</p>
        ) : (
          <iframe ref={iframe} title={titulo || 'Prévia'} sandbox="allow-scripts" srcDoc={srcDoc} style={{ width: w, height: h, transform: `scale(${escala})` }} />
        )}
      </div>
    </div>
  );
}
