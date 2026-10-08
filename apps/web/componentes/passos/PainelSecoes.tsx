'use client';
// Esconder e mostrar seções: cada <section id> do HTML, no evento todo e com exceção por cidade.
import { secoesDe, type TipoPagina } from '@norte/motor';
import { useMemo } from 'react';
import type { Evento } from '@/lib/comum/tipos';
import { useEditor } from '../Editor';

const garantir = (e: Evento) => (e.secoes ??= { ocultas: [], porLinha: {} });

export function PainelSecoes({ pag, linhaId }: { pag: TipoPagina; linhaId: string }) {
  const { evento, modelos, cad, alterar } = useEditor();
  const html = modelos[pag];
  const secoes = useMemo(() => (html == null ? [] : secoesDe(html)), [html]);
  if (!secoes.length) return null;

  const porCidade = pag !== 'tapume' && pag !== 'unica' && !!linhaId;
  const cidade = evento.cidades.find((c) => c._id === linhaId);
  const chave = (id: string) => `${pag}#${id}`;
  const ocultaGeral = (id: string) => (evento.secoes?.ocultas || []).includes(chave(id));
  const excecao = (id: string): boolean | undefined => evento.secoes?.porLinha?.[linhaId]?.[chave(id)];

  function setGeral(id: string, mostrar: boolean) {
    alterar((e) => {
      const s = garantir(e);
      const k = chave(id);
      s.ocultas = (s.ocultas || []).filter((x) => x !== k);
      if (!mostrar) s.ocultas.push(k);
    });
  }
  function setCidade(id: string, valor: 'igual' | 'mostrar' | 'esconder') {
    alterar((e) => {
      const s = garantir(e);
      const k = chave(id);
      const mapa = { ...(s.porLinha?.[linhaId] || {}) };
      if (valor === 'igual') delete mapa[k];
      else mapa[k] = valor === 'mostrar';
      s.porLinha = { ...(s.porLinha || {}), [linhaId]: mapa };
      if (!Object.keys(mapa).length) delete s.porLinha[linhaId];
    });
  }

  return (
    <section className="img-sec">
      <div>
        <h2 style={{ fontSize: 16 }}>Seções da página</h2>
        <p className="small muted">Seção escondida some da página, junto com os links do menu que levam a ela.{porCidade && cidade ? ` Em “${cad.nomeItem('cidade', cidade)}”, dá para fazer diferente do evento todo.` : ''}</p>
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px' }}>Seção</th>
              <th style={{ padding: '10px 12px' }}>No evento todo</th>
              {porCidade && cidade && <th style={{ padding: '10px 12px' }}>Em {cad.nomeItem('cidade', cidade)}</th>}
            </tr>
          </thead>
          <tbody>
            {secoes.map((s) => {
              const geralVisivel = !ocultaGeral(s.id);
              const exc = excecao(s.id);
              const visivelAqui = exc ?? geralVisivel;
              return (
                <tr key={s.id} style={{ opacity: porCidade && cidade ? (visivelAqui ? 1 : 0.55) : geralVisivel ? 1 : 0.55 }}>
                  <td style={{ padding: '8px 12px' }}><b>{s.nome}</b> <span className="mono small muted">#{s.id}</span></td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="seg" role="group" aria-label={`${s.nome} no evento todo`}>
                      <button type="button" aria-pressed={geralVisivel} onClick={() => setGeral(s.id, true)}>Mostrar</button>
                      <button type="button" aria-pressed={!geralVisivel} onClick={() => setGeral(s.id, false)}>Esconder</button>
                    </span>
                  </td>
                  {porCidade && cidade && (
                    <td style={{ padding: '8px 12px' }}>
                      <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} aria-label={`${s.nome} nesta cidade`}
                        value={exc === undefined ? 'igual' : exc ? 'mostrar' : 'esconder'}
                        onChange={(e) => setCidade(s.id, e.target.value as 'igual' | 'mostrar' | 'esconder')}>
                        <option value="igual">Igual ao evento ({geralVisivel ? 'mostra' : 'esconde'})</option>
                        <option value="mostrar">Mostrar</option>
                        <option value="esconder">Esconder</option>
                      </select>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
