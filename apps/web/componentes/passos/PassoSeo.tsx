'use client';
// SEO e compartilhamento: favicon, título e descrição do Google, e o card das redes sociais.
// O que ficar vazio sai automático (o motor preenche); a tela mostra o automático como sugestão.
import { acharArquivo, idGtm, lerSeo, normRef, type SeoPagina } from '@norte/motor';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { gerarEvento, urlDoSite } from '@/lib/comum/montagem';
import type { ArquivoMidia } from '@/lib/comum/tipos';
import { urlArquivo } from '../api';
import { Cabecalho, NavPassos, useEditor } from '../Editor';
import { enviarMidia, juntar, nomeLivre } from '../enviarMidia';

const IMAGEM = /\.(png|jpe?g|webp|svg|ico|gif|avif)$/i;

export function PassoSeo() {
  const { evento, modelos, arquivos, arquivosPrevia, banco, alterar } = useEditor();
  const ev = useDeferredValue(evento);
  const seo = evento.seo || {};
  // abas: a página principal e cada cidade/etapa (que herdam da principal)
  const [aba, setAba] = useState('');
  const paginas = useMemo(() => {
    const r = gerarEvento(ev, modelos, arquivos, banco);
    return r.paginas.map((p) => ({
      id: p.tipo === 'tapume' || p.tipo === 'unica' ? '' : p.etapaId || p.cidadeId || p.arquivo,
      nome: p.tipo === 'tapume' || p.tipo === 'unica' ? 'Página principal' : p.titulo,
      valores: lerSeo(p.html),
    }));
  }, [ev, modelos, arquivos, banco]);
  const pagina = paginas.find((p) => p.id === aba) || paginas[0];
  const ehPrincipal = !pagina || pagina.id === '';
  const atual = pagina?.valores;
  // o cadastro da aba: o da principal (raiz) ou o da cidade (porPagina)
  const cad: SeoPagina = ehPrincipal ? seo : seo.porPagina?.[pagina.id] || {};
  const mudar = (fn: (s: SeoPagina) => void) =>
    alterar((e) => {
      const raiz = (e.seo ??= {});
      if (ehPrincipal) return fn(raiz);
      const mapa = (raiz.porPagina ??= {});
      fn((mapa[pagina.id] ??= {}));
    });
  const temCadastro = (id: string) => {
    const x = seo.porPagina?.[id];
    return !!x && !!(x.titulo || x.descricao || x.favicon || x.share?.imagem || x.share?.titulo || x.share?.descricao);
  };

  const url = urlDoSite(evento) || 'seu-site.com.br/';
  const dominio = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const imagemDe = (caminho?: string) => {
    if (!caminho) return undefined;
    if (/^https?:/i.test(caminho)) caminho = caminho.replace(/^https?:\/\/[^/]+\/[^?#]*?(_media\/)/i, '$1');
    const k = acharArquivo(normRef(caminho), arquivosPrevia.map((a) => a.caminho));
    const a = k ? arquivosPrevia.find((x) => x.caminho === k) : undefined;
    return a ? urlArquivo(a.sha, a.caminho) : undefined;
  };
  const vazio = ehPrincipal ? 'Automático' : 'Da principal';

  return (
    <>
      <Cabecalho passo="seo" titulo="SEO e compartilhamento">Como o site aparece no Google, na aba do navegador e quando alguém compartilha o link. O que ficar vazio é preenchido sozinho; cada cidade herda da página principal, com o nome dela na frente do título.</Cabecalho>

      {paginas.length > 1 && (
        <div className="seo-abas" role="tablist" aria-label="Página">
          {paginas.map((p) => (
            <button key={p.id || 'principal'} type="button" role="tab" aria-selected={p.id === pagina.id} onClick={() => setAba(p.id)}>
              {p.nome}{p.id && temCadastro(p.id) && <span className="seo-abas__ponto" title="Tem cadastro próprio" />}
            </button>
          ))}
        </div>
      )}
      {!ehPrincipal && (
        <div className="w-item info"><span className="ic">i</span><div>
          <b>{pagina.nome}</b>O que ficar vazio aqui vem da página principal, com “{pagina.nome} - ” na frente do título. Preencha só o que quiser diferente.
          {temCadastro(pagina.id) && <> <button className="btn sm ghost" type="button" onClick={() => alterar((e) => { if (e.seo?.porPagina) delete e.seo.porPagina[pagina.id]; })}>Voltar a herdar tudo</button></>}
        </div></div>
      )}

      <section className="card stack">
        <h2 style={{ fontSize: 18 }}>Ícone da aba (favicon)</h2>
        <p className="small muted" style={{ margin: 0 }}>Imagem quadrada, de preferência PNG ou SVG com pelo menos 512 × 512 px.</p>
        <div className="seo-aba">
          <span className="seo-aba__icone">{imagemDe(atual?.favicon) ? <img src={imagemDe(atual?.favicon)} alt="" /> : <span>◌</span>}</span>
          <span className="seo-aba__titulo">{atual?.titulo || evento.nome}</span>
        </div>
        <EscolherImagem valor={cad.favicon} pasta="_media/seo/" nome="favicon" rotuloVazio={vazio}
          automatico={ehPrincipal ? (atual?.favicon ? 'o do HTML' : 'sem ícone') : 'o mesmo da página principal'}
          aoMudar={(v) => mudar((s) => { s.favicon = v; })} />
      </section>

      {ehPrincipal && (
        <section className="card stack">
          <h2 style={{ fontSize: 18 }}>Google Tag Manager</h2>
          <p className="small muted" style={{ margin: 0 }}>Cole o ID do contêiner (GTM-XXXXXX) ou o código inteiro que o Google dá. Entra em todas as páginas do site, no alto do &lt;head&gt; e logo depois do &lt;body&gt;. Só conta visitas na produção (domínio próprio): no endereço de teste e na prévia a tag fica desligada, e o teste continua fora do Google.</p>
          <label className="f">
            <span className="small">ID do contêiner</span>
            <input className="inp" placeholder="GTM-XXXXXX" value={seo.gtm || ''} aria-label="ID do Google Tag Manager"
              onChange={(e) => { const v = e.target.value; alterar((x) => { const s = (x.seo ??= {}); const id = idGtm(v); if (id || !v.trim()) { if (id) s.gtm = id; else delete s.gtm; } else s.gtm = v.trim(); }); }} />
          </label>
          {seo.gtm && !idGtm(seo.gtm) && <p className="small" style={{ margin: 0, color: 'var(--bad)' }}>Não achei um ID no formato GTM-XXXXXX. Sem ele, a tag não entra.</p>}
          {idGtm(seo.gtm) && <p className="small muted" style={{ margin: 0 }}>✓ {idGtm(seo.gtm)} entra na próxima publicação.</p>}
        </section>
      )}

      <section className="card stack">
        <h2 style={{ fontSize: 18 }}>Google</h2>
        <Campo rotulo="Título SEO" ideal={60} valor={cad.titulo} sugestao={atual?.titulo} aoMudar={(v) => mudar((s) => { s.titulo = v; })} />
        <Campo rotulo="Meta descrição" ideal={155} longo valor={cad.descricao} sugestao={atual?.descricao} aoMudar={(v) => mudar((s) => { s.descricao = v; })} />
        <div className="seo-google">
          <span className="seo-google__url">{dominio}</span>
          <span className="seo-google__titulo">{atual?.titulo || '(sem título)'}</span>
          <span className="seo-google__desc">{atual?.descricao || '(sem descrição)'}</span>
        </div>
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 18 }}>Compartilhamento (WhatsApp, Facebook, LinkedIn, X)</h2>
        <p className="small muted" style={{ margin: 0 }}>Imagem de 1200 × 630 px (horizontal), JPG ou PNG. {ehPrincipal ? 'Vazio: usa o título e a descrição do Google e a primeira foto da página.' : 'Vazio: o mesmo da página principal, com o nome na frente do título.'}</p>
        <EscolherImagem valor={cad.share?.imagem} pasta="_media/seo/" nome="compartilhar" rotuloVazio={vazio}
          automatico={ehPrincipal ? 'a primeira foto da página' : 'a mesma imagem da página principal'}
          aoMudar={(v) => mudar((s) => { s.share = { ...s.share, imagem: v }; })} />
        <Campo rotulo="Título para redes sociais" ideal={60} valor={cad.share?.titulo} sugestao={atual?.ogTitulo} aoMudar={(v) => mudar((s) => { s.share = { ...s.share, titulo: v }; })} />
        <Campo rotulo="Descrição para redes sociais" ideal={155} longo valor={cad.share?.descricao} sugestao={atual?.ogDescricao} aoMudar={(v) => mudar((s) => { s.share = { ...s.share, descricao: v }; })} />
        <div className="seo-card">
          {imagemDe(atual?.ogImagem) ? <img src={imagemDe(atual?.ogImagem)} alt="" /> : <div className="seo-card__sem">sem imagem</div>}
          <div className="seo-card__txt">
            <span className="seo-card__dom">{dominio}</span>
            <b>{atual?.ogTitulo || '(sem título)'}</b>
            <span>{atual?.ogDescricao || ''}</span>
          </div>
        </div>
      </section>
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
function EscolherImagem({ valor, pasta, nome, automatico, rotuloVazio = 'Automático', aoMudar }: { valor?: string; pasta: string; nome: string; automatico: string; rotuloVazio?: string; aoMudar: (v: string | undefined) => void }) {
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
          <span className="mais">{rotuloVazio === 'Automático' ? 'A' : '='}</span><span>{rotuloVazio}</span>
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
      {!valor && <p className="small muted" style={{ margin: 0 }}>{rotuloVazio}: {automatico}.</p>}
      {msg && <p className="small muted" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
