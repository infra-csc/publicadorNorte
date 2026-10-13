'use client';
// SEO e compartilhamento: favicon, título e descrição do Google, e o card das redes sociais.
// O que ficar vazio sai automático (o motor preenche); a tela mostra o automático como sugestão.
import { acharArquivo, FORMATOS, lerSeo, normRef } from '@norte/motor';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { gerarEvento, urlDoSite } from '@/lib/comum/montagem';
import type { ArquivoMidia, SeoEvento } from '@/lib/comum/tipos';
import { urlArquivo } from '../api';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { enviarMidia, juntar, nomeLivre } from '../enviarMidia';

const IMAGEM = /\.(png|jpe?g|webp|svg|ico|gif|avif)$/i;

export function PassoSeo() {
  const { evento, modelos, arquivos, arquivosPrevia, banco, alterar } = useEditor();
  const ev = useDeferredValue(evento);
  const seo = evento.seo || {};
  const temInternas = FORMATOS[evento.formato].paginas.some((k) => k === 'praca' || k === 'etapa');

  // como sai agora e como sairia tudo automático (para as sugestões)
  const { atual, auto, autoInterna, internaNome } = useMemo(() => {
    const r = gerarEvento(ev, modelos, arquivos, banco);
    const a = gerarEvento({ ...ev, seo: {} }, modelos, arquivos, banco);
    const principal = (rr: typeof r) => rr.paginas.find((p) => p.tipo === 'tapume' || p.tipo === 'unica') || rr.paginas[0];
    const interna = a.paginas.find((p) => p.tipo === 'praca' || p.tipo === 'etapa');
    return {
      atual: principal(r) ? lerSeo(principal(r)!.html) : null,
      auto: principal(a) ? lerSeo(principal(a)!.html) : null,
      autoInterna: interna ? lerSeo(interna.html) : null,
      internaNome: interna?.titulo,
    };
  }, [ev, modelos, arquivos, banco]);

  const mudar = (fn: (s: SeoEvento) => void) => alterar((e) => { fn((e.seo ??= {})); });
  const url = urlDoSite(evento) || 'seu-site.com.br/';
  const dominio = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const imagemDe = (caminho?: string) => {
    if (!caminho) return undefined;
    if (/^https?:/i.test(caminho)) {
      const rel = caminho.replace(/^https?:\/\/[^/]+\/[^?#]*?(_media\/)/i, '$1');
      caminho = rel;
    }
    const k = acharArquivo(normRef(caminho), arquivosPrevia.map((a) => a.caminho));
    const a = k ? arquivosPrevia.find((x) => x.caminho === k) : undefined;
    return a ? urlArquivo(a.sha, a.caminho) : undefined;
  };

  return (
    <>
      <Cabecalho passo="seo" titulo="SEO e compartilhamento">Como o site aparece no Google, na aba do navegador e quando alguém compartilha o link. O que ficar vazio é preenchido sozinho com o que já está na página.</Cabecalho>

      <section className="card stack">
        <h2 style={{ fontSize: 18 }}>Ícone da aba (favicon)</h2>
        <p className="small muted" style={{ margin: 0 }}>Imagem quadrada, de preferência PNG ou SVG com pelo menos 512 × 512 px.</p>
        <div className="seo-aba">
          <span className="seo-aba__icone">{imagemDe(atual?.favicon) ? <img src={imagemDe(atual?.favicon)} alt="" /> : <span>◌</span>}</span>
          <span className="seo-aba__titulo">{atual?.titulo || evento.nome}</span>
        </div>
        <EscolherImagem valor={seo.favicon} pasta="_media/seo/" nome="favicon" aoMudar={(v) => mudar((s) => { s.favicon = v; })} automatico={auto?.favicon ? 'o do HTML' : 'sem ícone'} />
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 18 }}>Google</h2>
        <Campo rotulo="Título SEO" ideal={60} valor={seo.titulo} sugestao={auto?.titulo} aoMudar={(v) => mudar((s) => { s.titulo = v; })} />
        <Campo rotulo="Meta descrição" ideal={155} longo valor={seo.descricao} sugestao={auto?.descricao} aoMudar={(v) => mudar((s) => { s.descricao = v; })} />
        <div className="seo-google">
          <span className="seo-google__url">{dominio}</span>
          <span className="seo-google__titulo">{atual?.titulo || '(sem título)'}</span>
          <span className="seo-google__desc">{atual?.descricao || '(sem descrição)'}</span>
        </div>
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 18 }}>Compartilhamento (WhatsApp, Facebook, LinkedIn, X)</h2>
        <p className="small muted" style={{ margin: 0 }}>Imagem de 1200 × 630 px (horizontal), JPG ou PNG. Vazio: usa o título e a descrição do Google e a primeira foto da página.</p>
        <EscolherImagem valor={seo.share?.imagem} pasta="_media/seo/" nome="compartilhar" aoMudar={(v) => mudar((s) => { s.share = { ...s.share, imagem: v }; })} automatico="a primeira foto da página" />
        <Campo rotulo="Título para redes sociais" ideal={60} valor={seo.share?.titulo} sugestao={seo.titulo || auto?.titulo} aoMudar={(v) => mudar((s) => { s.share = { ...s.share, titulo: v }; })} />
        <Campo rotulo="Descrição para redes sociais" ideal={155} longo valor={seo.share?.descricao} sugestao={seo.descricao || auto?.descricao} aoMudar={(v) => mudar((s) => { s.share = { ...s.share, descricao: v }; })} />
        <div className="seo-card">
          {imagemDe(atual?.ogImagem) ? <img src={imagemDe(atual?.ogImagem)} alt="" /> : <div className="seo-card__sem">sem imagem</div>}
          <div className="seo-card__txt">
            <span className="seo-card__dom">{dominio}</span>
            <b>{atual?.ogTitulo || '(sem título)'}</b>
            <span>{atual?.ogDescricao || ''}</span>
          </div>
        </div>
      </section>

      {temInternas && (
        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>Páginas das cidades</h2>
          <p className="small muted" style={{ margin: 0 }}>Valem para cada cidade (e etapa). Use <code>{'{cidade}'}</code>, <code>{'{etapa}'}</code> e <code>{'{evento}'}</code> no texto. A imagem de compartilhamento e o ícone são os mesmos.</p>
          <Campo rotulo="Título SEO das cidades" ideal={60} valor={seo.interna?.titulo} sugestao={autoInterna?.titulo} exemplo={internaNome} aoMudar={(v) => mudar((s) => { s.interna = { ...s.interna, titulo: v }; })} />
          <Campo rotulo="Meta descrição das cidades" ideal={155} longo valor={seo.interna?.descricao} sugestao={autoInterna?.descricao} aoMudar={(v) => mudar((s) => { s.interna = { ...s.interna, descricao: v }; })} />
        </section>
      )}
      <NavPassos passo="seo" />
    </>
  );
}

function Campo({ rotulo, valor, sugestao, ideal, longo, exemplo, aoMudar }: { rotulo: string; valor?: string; sugestao?: string; ideal: number; longo?: boolean; exemplo?: string; aoMudar: (v: string) => void }) {
  const n = (valor || '').length;
  const props = {
    className: 'inp' + (longo ? ' campo-auto' : ''),
    value: valor || '',
    placeholder: sugestao ? `Automático: ${sugestao}` : 'Automático',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => aoMudar(e.target.value),
    'aria-label': rotulo,
  };
  return (
    <label className="stack" style={{ gap: 4 }}>
      <span className="row between small">
        <b>{rotulo}</b>
        <span className={n > ideal ? 'seo-conta seo-conta--muito' : 'seo-conta'}>{n ? `${n} / ${ideal}` : 'automático'}</span>
      </span>
      {longo ? <textarea rows={3} {...props} /> : <input {...props} />}
      {!valor && sugestao && <span className="small muted">Vai sair: “{sugestao}”{exemplo ? ` (ex.: ${exemplo})` : ''}</span>}
      {n > ideal && <span className="small" style={{ color: 'var(--warn)' }}>O Google costuma cortar depois de {ideal} caracteres.</span>}
    </label>
  );
}

/** escolhe uma imagem da mídia do evento ou envia uma nova (vazio = automático) */
function EscolherImagem({ valor, pasta, nome, automatico, aoMudar }: { valor?: string; pasta: string; nome: string; automatico: string; aoMudar: (v: string | undefined) => void }) {
  const { evento, arquivos, setArquivos } = useEditor();
  const [msg, setMsg] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const imagens = arquivos.filter((a) => IMAGEM.test(a.caminho));
  // as da pasta do SEO primeiro
  const lista: ArquivoMidia[] = [...imagens.filter((a) => a.caminho.startsWith(pasta)), ...imagens.filter((a) => !a.caminho.startsWith(pasta))];
  async function enviar(f?: File) {
    if (!f) return;
    if (!IMAGEM.test(f.name)) return setMsg('Use uma imagem (PNG, JPG, SVG, WEBP ou ICO).');
    try {
      const caminho = nomeLivre(pasta, nome, f.name, new Set(arquivos.map((a) => a.caminho)));
      const r = await enviarMidia(evento.slug, [{ file: f, caminho }], arquivos, setMsg);
      if (r.novos.length) setArquivos(juntar(arquivos, r.novos));
      aoMudar(r.porPedido.get(caminho)?.caminho || caminho);
      setMsg('');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="thumbs">
        <button type="button" className="thumb thumb-novo" role="radio" aria-checked={!valor} onClick={() => aoMudar(undefined)}>
          <span className="mais">A</span><span>Automático</span>
        </button>
        {lista.map((a) => (
          <button key={a.caminho} type="button" role="radio" className="thumb" aria-checked={valor === a.caminho} title={a.caminho} onClick={() => aoMudar(a.caminho)}>
            <img src={urlArquivo(a.sha, a.caminho)} alt="" loading="lazy" style={{ objectFit: 'contain' }} />
            <span>{a.caminho.split('/').pop()}</span>
          </button>
        ))}
        <button type="button" className="thumb thumb-novo" onClick={() => input.current?.click()}>
          <span className="mais">+</span><span>Enviar imagem</span>
        </button>
        <input ref={input} type="file" accept="image/*,.ico,.svg" hidden onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {!valor && <p className="small muted" style={{ margin: 0 }}>Automático: {automatico}.</p>}
      {msg && <p className="small muted" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
