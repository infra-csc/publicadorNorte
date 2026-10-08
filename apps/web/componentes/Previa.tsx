'use client';
// Prévia da página gerada: celular (390×780) ou desktop (1280×800), escalada para caber no painel.
// Os arquivos da _media vêm do armazenamento (não precisa publicar para ver).
import { useEffect, useRef, useState } from 'react';
import { comArquivosDaPrevia } from '@/lib/comum/montagem';
import { urlArquivo } from './api';
import { useEditor } from './Editor';

const TELAS = { cel: [390, 780], desk: [1280, 800] } as const;

export function Previa({ html, titulo, altura = 640 }: { html: string | null; titulo?: string; altura?: number }) {
  const { arquivosPrevia: arquivos, evento } = useEditor();
  const [tela, setTela] = useState<keyof typeof TELAS>('cel');
  const [doc, setDoc] = useState('');
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(360);

  // espera a digitação parar antes de recarregar a prévia
  useEffect(() => {
    const t = setTimeout(() => {
      if (html == null) return setDoc('');
      let h = comArquivosDaPrevia(html, arquivos, (a) => location.origin + urlArquivo(a.sha, a.caminho));
      if (evento.baseUrl && !/<base\s/i.test(h)) h = h.replace(/<head([^>]*)>/i, `<head$1><base href="${evento.baseUrl.replace(/"/g, '')}">`);
      setDoc(h);
    }, 300);
    return () => clearTimeout(t);
  }, [html, arquivos, evento.baseUrl]);

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
        <div className="seg" role="group" aria-label="Tamanho da prévia">
          <button type="button" aria-pressed={tela === 'cel'} onClick={() => setTela('cel')}>Celular</button>
          <button type="button" aria-pressed={tela === 'desk'} onClick={() => setTela('desk')}>Desktop</button>
        </div>
      </div>
      <div className="frame-wrap" ref={caixa} style={{ height: h * escala + 22 }}>
        {html == null ? (
          <p className="empty">Nada para mostrar ainda.</p>
        ) : (
          <iframe title={titulo || 'Prévia'} sandbox="allow-scripts" srcDoc={doc} style={{ width: w, height: h, transform: `scale(${escala})` }} />
        )}
      </div>
    </div>
  );
}
