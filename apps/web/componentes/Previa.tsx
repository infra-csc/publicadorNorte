'use client';
// Prévia da página gerada: celular (390×780) ou desktop (1280×800), escalada para caber no painel.
// Os arquivos da _media vêm do armazenamento (não precisa publicar para ver).
// Mudanças entram sem recarregar (o script de dentro troca só o que mudou); se não der, recarrega na mesma rolagem
// num segundo quadro, por trás, que só aparece quando estiver pronto.
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
  // dois quadros: um aparece enquanto o outro carrega por trás (recarregar não pisca branco)
  const [docs, setDocs] = useState<[string, string]>(['', '']);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const quadro0 = useRef<HTMLIFrameElement>(null);
  const quadro1 = useRef<HTMLIFrameElement>(null);
  const quadros = [quadro0, quadro1];
  const [largura, setLargura] = useState(360);
  // a última página pedida, o quadro que aparece, o que está carregando, onde estava rolado e qual página é
  const atual = useRef('');
  const ativoRef = useRef(0);
  const temAtivo = useRef(false);
  const carregando = useRef<number | null>(null);
  const doQuadro = useRef<{ html: string; y: number }[]>([{ html: '', y: 0 }, { html: '', y: 0 }]);
  const recargas = useRef(0);
  const trocaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rolagem = useRef(0);
  const pagina = useRef(titulo);
  const editarRef = useRef(editar);
  const aoEditarRef = useRef(aoEditar);
  // último campo digitado na prévia (para voltar o cursor nele se precisar recarregar)
  const ultimoCampo = useRef<{ v: string; l: string; t: number } | null>(null);
  aoEditarRef.current = aoEditar;

  const janela = (i: number) => quadros[i].current?.contentWindow || null;

  /** carrega a página no quadro de trás; ele só aparece quando estiver desenhado */
  const recarregar = (h: string, y: number) => {
    const i = temAtivo.current ? 1 - ativoRef.current : ativoRef.current;
    atual.current = h;
    carregando.current = i;
    doQuadro.current[i] = { html: h, y };
    // o comentário muda a cada vez: o quadro recarrega mesmo se a página for igual à que ele já teve
    const doc = h + `<!-- ${++recargas.current} -->`;
    setDocs((d) => (i ? [d[0], doc] : [doc, d[1]]));
  };

  const mostrar = (i: number) => {
    clearTimeout(trocaTimer.current);
    if (carregando.current !== i) return;
    carregando.current = null;
    temAtivo.current = true;
    if (ativoRef.current !== i) {
      ativoRef.current = i;
      setAtivo(i);
      // o quadro de antes para de rodar (vídeos, animações)
      setDocs((d) => (i ? ['', d[1]] : [d[0], '']));
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (html == null) { atual.current = ''; temAtivo.current = false; carregando.current = null; setDocs(['', '']); return; }
      let h = comArquivosDaPrevia(html, arquivos, (a) => location.origin + urlArquivo(a.sha, a.caminho));
      if (baseUrl && !/<base\s/i.test(h)) h = h.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl.replace(/"/g, '')}">`);
      const script = `<script>${SCRIPT_PREVIA}</script>`;
      h = /<head[^>]*>/i.test(h) ? h.replace(/<head([^>]*)>/i, `<head$1>${script}`) : script + h;
      if (h === atual.current) return;
      const outraPagina = pagina.current !== titulo;
      pagina.current = titulo;
      if (!temAtivo.current || outraPagina || carregando.current != null) return recarregar(h, outraPagina ? 0 : rolagem.current);
      atual.current = h;
      janela(ativoRef.current)?.postMessage({ tipo: 'pub-atualizar', html: h }, '*');
    }, atual.current ? 120 : 0);
    return () => clearTimeout(t);
  }, [html, arquivos, baseUrl, titulo]);

  // conversa com o script de dentro da prévia
  useEffect(() => {
    const f = (e: MessageEvent) => {
      const i = [0, 1].find((k) => e.source && e.source === janela(k));
      if (i == null) return;
      const w = janela(i)!;
      const d = e.data || {};
      if (d.tipo === 'pub-pronto') {
        if (carregando.current !== i) return;
        const u = ultimoCampo.current;
        const foco = u && Date.now() - u.t < 4000 ? { v: u.v, l: u.l } : null;
        w.postMessage({ tipo: 'pub-base', html: doQuadro.current[i].html, y: doQuadro.current[i].y, editar: editarRef.current, foco }, '*');
        // se o quadro não avisar, aparece assim mesmo
        clearTimeout(trocaTimer.current);
        trocaTimer.current = setTimeout(() => mostrar(i), 1500);
      } else if (d.tipo === 'pub-visivel') mostrar(i);
      else if (d.tipo === 'pub-editar' && typeof d.v === 'string') {
        ultimoCampo.current = { v: d.v, l: d.l || '', t: Date.now() };
        aoEditarRef.current?.(d.v, d.l || '', String(d.valor ?? ''));
      } else if (i !== ativoRef.current || carregando.current != null) return;
      else if (d.tipo === 'pub-rolagem') rolagem.current = d.y;
      else if (d.tipo === 'pub-resultado') {
        rolagem.current = d.y;
        if (!d.ok) recarregar(atual.current, d.y);
      }
    };
    addEventListener('message', f);
    return () => { removeEventListener('message', f); clearTimeout(trocaTimer.current); };
  }, []);

  useEffect(() => {
    editarRef.current = editar;
    for (const i of [0, 1]) janela(i)?.postMessage({ tipo: 'pub-modo', editar }, '*');
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
          [0, 1].map((i) => (
            <iframe
              key={i}
              ref={quadros[i]}
              title={i === ativo ? titulo || 'Prévia' : undefined}
              aria-hidden={i !== ativo || undefined}
              tabIndex={i === ativo ? undefined : -1}
              className={i === ativo ? undefined : 'atras'}
              sandbox="allow-scripts"
              srcDoc={docs[i]}
              style={{ width: w, height: h, transform: `scale(${escala})` }}
            />
          ))
        )}
      </div>
    </div>
  );
}
