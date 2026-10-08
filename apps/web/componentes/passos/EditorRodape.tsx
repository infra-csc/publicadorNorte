'use client';
// Rodapé padrão do publicador: liga/desliga (evento e cidade), rodapé próprio por cidade e o editor dos campos.
import { FONTES_SUGERIDAS, REDES, RODAPE_PADRAO, type ConfigRodape, type EscolhaRodape, type RedeSocial } from '@norte/motor';
import { useState } from 'react';
import type { Evento } from '@/lib/comum/tipos';
import { urlArquivo } from '../api';
import { useEditor } from '../Editor';
import { enviarMidia, juntar, nomeLivre } from '../enviarMidia';

const garantir = (e: Evento): EscolhaRodape => (e.rodape ??= { ativo: false, geral: structuredClone(RODAPE_PADRAO), porLinha: {} });
const OUTRA = '__outra__';

const ehImagem = (c: string) => /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(c);

/** logo do rodapé: uma imagem da mídia do evento, ou enviada aqui (vai para _media/rodape/) */
function Logo({ c, mudar }: { c: ConfigRodape; mudar: (fn: (c: ConfigRodape) => void) => void }) {
  const { evento, arquivos, setArquivos } = useEditor();
  const [msg, setMsg] = useState('');
  // logos e marcas primeiro
  const imagens = arquivos
    .filter((a) => ehImagem(a.caminho))
    .sort((a, b) => Number(/logo|marca|rodape/i.test(b.caminho)) - Number(/logo|marca|rodape/i.test(a.caminho)) || (a.caminho < b.caminho ? -1 : 1));
  async function enviar(f: File | undefined) {
    if (!f) return;
    if (!ehImagem(f.name)) return setMsg('O logo precisa ser uma imagem (png, svg, webp ou jpg).');
    try {
      const caminho = nomeLivre('_media/rodape/', f.name.replace(/\.[^.]+$/, ''), f.name, new Set(arquivos.map((a) => a.caminho)));
      const r = await enviarMidia(evento.slug, [{ file: f, caminho }], arquivos, setMsg);
      if (r.novos.length) setArquivos(juntar(arquivos, r.novos));
      const final = r.porPedido.get(caminho)?.caminho || caminho;
      mudar((x) => { x.logo = final; });
      setMsg('');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <b className="small">Logo <span className="muted" style={{ fontWeight: 400 }}>(no alto da coluna da esquerda)</span></b>
      <div className="thumbs">
        <button type="button" className="thumb thumb-novo" aria-checked={!c.logo} role="radio" onClick={() => mudar((x) => { x.logo = ''; })}>
          <span className="mais">∅</span><span>Sem logo</span>
        </button>
        {imagens.map((a) => (
          <button key={a.caminho} type="button" role="radio" className="thumb" aria-checked={c.logo === a.caminho} title={a.caminho} onClick={() => mudar((x) => { x.logo = a.caminho; })}>
            <img src={urlArquivo(a.sha, a.caminho)} alt="" loading="lazy" style={{ objectFit: 'contain', background: c.corFundo }} />
            <span>{a.caminho.split('/').pop()}</span>
          </button>
        ))}
        <label className="thumb thumb-novo" title="Enviar uma imagem do computador">
          <span className="mais">+</span><span>Enviar logo</span>
          <input type="file" accept="image/*" className="sr" onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      {msg && <p className="small muted">{msg}</p>}
    </div>
  );
}

function Campos({ c, mudar }: { c: ConfigRodape; mudar: (fn: (c: ConfigRodape) => void) => void }) {
  const sugerida = c.fonte === '' || FONTES_SUGERIDAS.includes(c.fonte);
  const [outra, setOutra] = useState(!sugerida);
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="grid3">
        <label className="f">Fonte <small>Do Google Fonts</small>
          <select className="inp" value={outra ? OUTRA : c.fonte} onChange={(e) => {
            const v = e.target.value;
            if (v === OUTRA) { setOutra(true); return; }
            setOutra(false);
            mudar((x) => { x.fonte = v; });
          }}>
            <option value="">A mesma da página</option>
            {FONTES_SUGERIDAS.map((f) => <option key={f} value={f}>{f}</option>)}
            <option value={OUTRA}>Outra (digitar o nome)…</option>
          </select>
        </label>
        {outra && (
          <label className="f">Nome da fonte <small>Igual ao Google Fonts, ex.: Archivo Black</small>
            <input className="inp" value={c.fonte} onChange={(e) => { const v = e.target.value; mudar((x) => { x.fonte = v; }); }} />
          </label>
        )}
      </div>
      <div className="row" style={{ gap: 18 }}>
        {([['corFundo', 'Fundo'], ['corTexto', 'Texto e ícones'], ['corLinks', 'Links']] as const).map(([k, nome]) => (
          <label key={k} className="row small" style={{ gap: 8, fontWeight: 600 }}>
            <input type="color" value={c[k]} onChange={(e) => { const v = e.target.value; mudar((x) => { x[k] = v; }); }} style={{ width: 40, height: 32, border: 0, padding: 0, background: 'none' }} />
            {nome}
          </label>
        ))}
      </div>
      <Logo c={c} mudar={mudar} />
      <label className="f">Descrição <small>Fica embaixo do logo. Pode ter mais de uma linha. Para negrito, escreva entre dois asteriscos: **Circuito das Estações**</small>
        <textarea className="inp" rows={4} value={c.descricao} onChange={(e) => { const v = e.target.value; mudar((x) => { x.descricao = v; }); }} />
      </label>

      <div className="stack" style={{ gap: 8 }}>
        <label className="f">Título dos links <small>Fica em cima dos links, na coluna da direita</small>
          <input className="inp" placeholder="ex.: Dúvidas" value={c.tituloLinks || ''} onChange={(e) => { const v = e.target.value; mudar((x) => { x.tituloLinks = v; }); }} />
        </label>
        <b className="small">Links</b>
        {c.links.map((l, i) => (
          <div key={i} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <input className="inp" placeholder="Texto (ex.: Regulamento)" value={l.texto} onChange={(e) => { const v = e.target.value; mudar((x) => { x.links[i].texto = v; }); }} />
            <input className="inp mono" placeholder="https://…" value={l.url} onChange={(e) => { const v = e.target.value; mudar((x) => { x.links[i].url = v; }); }} />
            <button className="iconbtn" type="button" aria-label="Tirar link" onClick={() => mudar((x) => { x.links.splice(i, 1); })}>✕</button>
          </div>
        ))}
        <div><button className="btn sm ghost" type="button" onClick={() => mudar((x) => { x.links.push({ texto: '', url: '' }); })}>+ Link</button></div>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <b className="small">Redes sociais <span className="muted" style={{ fontWeight: 400 }}>(os ícones usam a cor do texto)</span></b>
        {c.redes.map((r, i) => (
          <div key={i} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <span className="rede-ico" style={{ color: c.corTexto, background: c.corFundo }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${REDES[r.rede].svg}</svg>` }} />
            <select className="inp" style={{ width: 'auto' }} value={r.rede} onChange={(e) => { const v = e.target.value as RedeSocial; mudar((x) => { x.redes[i].rede = v; }); }}>
              {(Object.keys(REDES) as RedeSocial[]).map((k) => <option key={k} value={k}>{REDES[k].nome}</option>)}
            </select>
            <input className="inp" placeholder="Texto ao lado (opcional), ex.: Siga no Instagram" value={r.texto || ''} onChange={(e) => { const v = e.target.value; mudar((x) => { x.redes[i].texto = v; }); }} />
            <input className="inp mono" placeholder={r.rede === 'email' ? 'mailto:contato@…' : r.rede === 'telefone' ? 'tel:+55…' : 'https://…'} value={r.url} onChange={(e) => { const v = e.target.value; mudar((x) => { x.redes[i].url = v; }); }} />
            <button className="iconbtn" type="button" aria-label="Tirar rede" onClick={() => mudar((x) => { x.redes.splice(i, 1); })}>✕</button>
          </div>
        ))}
        <div><button className="btn sm ghost" type="button" onClick={() => mudar((x) => { x.redes.push({ rede: 'instagram', url: '' }); })}>+ Rede social</button></div>
        <p className="small muted">Links precisam começar com https://, mailto: (e-mail) ou tel: (telefone). Os outros não aparecem no site.</p>
      </div>
    </div>
  );
}

export function EditorRodape({ linhaId, porCidade }: { linhaId: string; porCidade: boolean }) {
  const { evento, cad, alterar } = useEditor();
  const r = evento.rodape;
  const cidade = evento.cidades.find((c) => c._id === linhaId);
  const daCidade = porCidade && cidade ? r?.porLinha?.[linhaId] : undefined;
  const [editando, setEditando] = useState<'geral' | 'cidade'>('geral');
  const alvo = editando === 'cidade' && daCidade?.config ? 'cidade' : 'geral';
  const nomeCidade = cidade ? cad.nomeItem('cidade', cidade) : '';

  const mudar = (fn: (c: ConfigRodape) => void) =>
    alterar((e) => {
      const g = garantir(e);
      if (alvo === 'cidade') fn(g.porLinha![linhaId].config!);
      else fn(g.geral);
    });
  const linha = (fn: (p: { ativo?: boolean; config?: ConfigRodape }) => void) =>
    alterar((e) => {
      const g = garantir(e);
      g.porLinha ??= {};
      const p = (g.porLinha[linhaId] ??= {});
      fn(p);
      if (p.ativo === undefined && !p.config) delete g.porLinha[linhaId];
    });

  const config = alvo === 'cidade' ? daCidade!.config! : r?.geral || RODAPE_PADRAO;
  return (
    <section className="card stack">
      <div>
        <h2 style={{ fontSize: 18 }}>Rodapé padrão</h2>
        <p className="small muted">Rodapé feito aqui no publicador, colocado no fim de todas as páginas. Fica igual no evento todo, e dá para mudar numa cidade.</p>
      </div>
      <div className="row">
        <span className="small muted">Evento todo</span>
        <span className="seg" role="group" aria-label="Rodapé padrão no evento todo">
          <button type="button" aria-pressed={!!r?.ativo} onClick={() => alterar((e) => { garantir(e).ativo = true; })}>Mostrar</button>
          <button type="button" aria-pressed={!r?.ativo} onClick={() => alterar((e) => { garantir(e).ativo = false; })}>Esconder</button>
        </span>
        {porCidade && cidade && (
          <>
            <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} aria-label={`Rodapé padrão em ${nomeCidade}`}
              value={daCidade?.ativo === undefined ? 'igual' : daCidade.ativo ? 'mostrar' : 'esconder'}
              onChange={(e) => { const v = e.target.value; linha((p) => { p.ativo = v === 'igual' ? undefined : v === 'mostrar'; }); }}>
              <option value="igual">Em {nomeCidade}: igual ao evento</option>
              <option value="mostrar">Em {nomeCidade}: mostrar</option>
              <option value="esconder">Em {nomeCidade}: esconder</option>
            </select>
            <label className="row small" style={{ gap: 6 }}>
              <input type="checkbox" checked={!!daCidade?.config} onChange={(e) => {
                const sim = e.target.checked;
                linha((p) => { p.config = sim ? structuredClone(evento.rodape?.geral || RODAPE_PADRAO) : undefined; });
                setEditando(sim ? 'cidade' : 'geral');
              }} />
              Rodapé próprio em {nomeCidade}
            </label>
          </>
        )}
      </div>
      {daCidade?.config && (
        <div className="seg" role="group" aria-label="Qual rodapé editar">
          <button type="button" aria-pressed={alvo === 'geral'} onClick={() => setEditando('geral')}>Editar o do evento</button>
          <button type="button" aria-pressed={alvo === 'cidade'} onClick={() => setEditando('cidade')}>Editar o de {nomeCidade}</button>
        </div>
      )}
      <Campos key={alvo + linhaId} c={config} mudar={mudar} />
    </section>
  );
}
