'use client';
// Módulo de imagem do passo Seções: adicionar (PNG, JPG ou SVG) e editar largura, fundo, espaço e cor do SVG.
import { limparSvg, pintarSvg, PREFIXO_MODULO, type ModuloImagem, type TipoPagina } from '@norte/motor';
import { useRef, useState } from 'react';
import type { Evento } from '@/lib/comum/tipos';
import { urlArquivo } from '../api';
import { useEditor } from '../Editor';
import { enviarMidia, juntar, nomeLivre } from '../enviarMidia';

const LIMITE_SVG = 300 * 1024;
const ACEITA = '.png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml';
const tipoDe = (f: File) => (/\.svg$/i.test(f.name) || f.type === 'image/svg+xml' ? 'svg' : /\.(png|jpe?g)$/i.test(f.name) || /^image\/(png|jpeg)$/.test(f.type) ? 'img' : null);

export const modulosDe = (e: Evento, pag: TipoPagina): ModuloImagem[] => e.secoes?.modulos?.[pag] || [];

/** lê o arquivo escolhido e devolve o que muda no módulo (SVG embutido, ou PNG/JPG enviado para a mídia) */
function useImagem() {
  const { evento, arquivos, setArquivos } = useEditor();
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  async function ler(f: File): Promise<Partial<ModuloImagem> | null> {
    setErro('');
    const tipo = tipoDe(f);
    if (!tipo) { setErro('Use uma imagem PNG, JPG ou SVG.'); return null; }
    if (tipo === 'svg') {
      if (f.size > LIMITE_SVG) { setErro('SVG grande demais (até 300 KB). Exporte simplificado ou use PNG.'); return null; }
      const svg = limparSvg(await f.text());
      if (!svg) { setErro('Esse arquivo não parece um SVG válido.'); return null; }
      return { svg, arquivo: undefined, nome: f.name };
    }
    try {
      const ocupados = new Set(arquivos.map((a) => a.caminho));
      const caminho = nomeLivre('_media/modulos/', f.name.replace(/\.[^.]+$/, ''), f.name, ocupados);
      const r = await enviarMidia(evento.slug, [{ file: f, caminho }], arquivos, setOcupado);
      if (r.grandes.length) { setErro('Imagem grande demais.'); return null; }
      if (r.novos.length) setArquivos(juntar(arquivos, r.novos));
      return { arquivo: r.porPedido.get(caminho)?.caminho || caminho, svg: undefined, cor: undefined, nome: f.name };
    } catch (x) {
      setErro('Não deu para enviar a imagem: ' + (x as Error).message);
      return null;
    } finally {
      setOcupado('');
    }
  }
  return { ler, ocupado, erro };
}

function Escolher({ rotulo, classe, aoEscolher, ocupado }: { rotulo: string; classe: string; aoEscolher: (f: File) => void; ocupado: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className={classe} type="button" disabled={!!ocupado} onClick={() => input.current?.click()}>{ocupado || rotulo}</button>
      <input ref={input} type="file" accept={ACEITA} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) aoEscolher(f); }} />
    </>
  );
}

/** botão "+ Módulo de imagem": o módulo entra no fim da página; depois é só arrastar */
export function AdicionarModulo({ pag }: { pag: TipoPagina }) {
  const { alterar } = useEditor();
  const { ler, ocupado, erro } = useImagem();
  async function escolher(f: File) {
    const dados = await ler(f);
    if (!dados) return;
    const id = PREFIXO_MODULO + Math.random().toString(36).slice(2, 8);
    alterar((e) => {
      const s = (e.secoes ??= { ocultas: [], porLinha: {}, ordem: {} });
      s.modulos = { ...(s.modulos || {}), [pag]: [...(s.modulos?.[pag] || []), { id, largura: 60, espaco: 'm', fundo: '', ...dados }] };
    });
    // mostra o módulo novo na lista (ele entra no fim)
    setTimeout(() => document.getElementById('secao-' + id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
  }
  return (
    <div className="row" style={{ gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
       <Escolher rotulo="+ Módulo de imagem" classe="btn sm pri" aoEscolher={escolher} ocupado={ocupado} />
      <span className="small muted">PNG, JPG ou SVG. Entra no fim da lista; arraste para o lugar.</span>
      {erro && <span className="small" style={{ color: 'var(--bad)' }}>{erro}</span>}
    </div>
  );
}

/** controles de um módulo, dentro da lista de seções */
export function EditorModulo({ pag, id }: { pag: TipoPagina; id: string }) {
  const { evento, arquivos, alterar } = useEditor();
  const { ler, ocupado, erro } = useImagem();
  const [confirmar, setConfirmar] = useState(false);
  const m = modulosDe(evento, pag).find((x) => x.id === id);
  if (!m) return null;
  const mudar = (d: Partial<ModuloImagem>) =>
    alterar((e) => {
      const lista = e.secoes?.modulos?.[pag];
      const i = lista?.findIndex((x) => x.id === id) ?? -1;
      if (lista && i >= 0) lista[i] = { ...lista[i], ...d };
    });
  const remover = () =>
    alterar((e) => {
      const s = e.secoes;
      if (!s) return;
      s.modulos = { ...(s.modulos || {}), [pag]: (s.modulos?.[pag] || []).filter((x) => x.id !== id) };
      const k = `${pag}#${id}`;
      s.ocultas = (s.ocultas || []).filter((x) => x !== k);
      if (s.ordem?.[pag]) s.ordem = { ...s.ordem, [pag]: s.ordem[pag]!.filter((x) => x !== id) };
      for (const l of Object.keys(s.porLinha || {})) delete s.porLinha![l][k];
    });
  const arq = m.arquivo ? arquivos.find((a) => a.caminho === m.arquivo) : undefined;
  const fundo = m.fundo || '';
  return (
    <div className="modulo-ed">
      <div className="modulo-miniatura" style={{ background: fundo || undefined, color: m.cor || undefined }}>
        {m.svg ? <span dangerouslySetInnerHTML={{ __html: m.cor ? pintarSvg(m.svg) : m.svg }} /> : arq ? <img src={urlArquivo(arq.sha, arq.caminho)} alt="" /> : <span className="small muted">sem imagem</span>}
      </div>
      <div className="modulo-campos">
        <label className="row small" style={{ gap: 8 }}>
          Largura
          <input type="range" min={10} max={100} step={5} value={m.largura} onChange={(e) => mudar({ largura: Number(e.target.value) })} aria-label="Largura da imagem" style={{ flex: 1, minWidth: 120 }} />
          <b style={{ width: 40, textAlign: 'right' }}>{m.largura}%</b>
        </label>
        <div className="row small" style={{ gap: 8, flexWrap: 'wrap' }}>
          Fundo
          <span className="seg" role="group" aria-label="Fundo">
            <button type="button" aria-pressed={!fundo} onClick={() => mudar({ fundo: '' })}>Sem fundo</button>
            <button type="button" aria-pressed={!!fundo} onClick={() => mudar({ fundo: fundo || '#ffffff' })}>Cor</button>
          </span>
          {fundo && <input type="color" value={fundo.length === 7 ? fundo : '#ffffff'} onChange={(e) => mudar({ fundo: e.target.value })} aria-label="Cor de fundo" />}
          <span style={{ marginLeft: 8 }}>Espaço</span>
          <span className="seg" role="group" aria-label="Espaço em volta">
            {([['nenhum', 'Nenhum'], ['p', 'P'], ['m', 'M'], ['g', 'G']] as const).map(([v, r]) => (
              <button key={v} type="button" aria-pressed={(m.espaco || 'm') === v} onClick={() => mudar({ espaco: v })}>{r}</button>
            ))}
          </span>
        </div>
        {m.svg && (
          <div className="row small" style={{ gap: 8 }}>
            Cor do SVG
            <span className="seg" role="group" aria-label="Cor do SVG">
              <button type="button" aria-pressed={!m.cor} onClick={() => mudar({ cor: '' })}>Original</button>
              <button type="button" aria-pressed={!!m.cor} onClick={() => mudar({ cor: m.cor || '#000000' })}>Uma cor</button>
            </span>
            {m.cor && <input type="color" value={m.cor.length === 7 ? m.cor : '#000000'} onChange={(e) => mudar({ cor: e.target.value })} aria-label="Cor do SVG" />}
          </div>
        )}
        <input className="inp" style={{ padding: '6px 10px' }} value={m.alt || ''} placeholder="Descrição da imagem (para leitores de tela)" onChange={(e) => mudar({ alt: e.target.value })} aria-label="Descrição da imagem" />
        <div className="row" style={{ gap: 8 }}>
          <span className="small muted" style={{ overflowWrap: 'anywhere' }}>{m.nome}</span>
          <Escolher rotulo="Trocar imagem" classe="btn sm ghost" ocupado={ocupado} aoEscolher={async (f) => { const d = await ler(f); if (d) mudar(d); }} />
          {confirmar ? (
            <>
              <span className="small">Tirar este módulo da página?</span>
              <button className="btn sm pri" type="button" onClick={remover}>Tirar</button>
              <button className="btn sm ghost" type="button" onClick={() => setConfirmar(false)}>Cancelar</button>
            </>
          ) : <button className="btn sm ghost" type="button" onClick={() => setConfirmar(true)}>Tirar módulo</button>}
        </div>
        {erro && <span className="small" style={{ color: 'var(--bad)' }}>{erro}</span>}
      </div>
    </div>
  );
}
