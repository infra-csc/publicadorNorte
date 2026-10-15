'use client';
// Preços do Odoo: liga a consulta (preço, parcelas, O2 Prime, link, distâncias e status de cada cidade vêm do combo no Odoo),
// escolhe de quanto em quanto tempo conferir e mostra o endereço do aviso para o pessoal do Odoo e o último resultado.
import { useEffect, useState } from 'react';
import { idDoCombo } from '@/lib/comum/odoo';
import { INTERVALOS_ODOO, type Evento, type ResultadoOdoo } from '@/lib/comum/tipos';
import { api, json } from '../api';
import { useEditor } from '../Editor';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
type Config = { configurado: boolean; faltam?: string[]; aviso?: string | null };

export function SecaoOdoo() {
  const { evento, alterar, salvarJa, substituir } = useEditor();
  const o = evento.odoo;
  const comLink = evento.cidades.filter((l) => idDoCombo(l.link_inscricao) != null);
  const [config, setConfig] = useState<Config | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const visivel = !!o || comLink.length > 0;
  useEffect(() => {
    if (visivel) api<Config>(`/api/hotsites/${evento.slug}/odoo`).then(setConfig).catch(() => setConfig(null));
  }, [visivel, evento.slug]);
  if (!visivel) return null;

  async function enviar(corpo: object) {
    setErro('');
    setOcupado(true);
    try {
      await salvarJa();
      const r = await api<{ evento: Evento; versao: string | null; resultado?: ResultadoOdoo }>(`/api/hotsites/${evento.slug}/odoo`, json('POST', corpo));
      if (r.versao) substituir(r.evento, r.versao);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const horas = o?.intervalo ?? 6;
  const u = o?.ultima;
  return (
    <section className="card stack" style={{ gap: 10 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 18 }}>Preços do Odoo</h2>
          <p className="small muted" style={{ margin: 0 }}>
            {o?.ativo
              ? 'Ligado: preço, parcelas, O2 Prime, link de compra, distâncias e status vêm do combo de cada cidade no Odoo. Se algo mudar, o cadastro é atualizado e o site, republicado.'
              : `Desligado: ${comLink.length} cidade(s) com link de combo do Odoo. Ligado, o preço e o resto vêm de lá (pelo número no fim do link).`}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Preços do Odoo">
          <button type="button" aria-pressed={!o?.ativo} disabled={ocupado} onClick={() => o?.ativo && enviar({ ativo: false })}>Desligado</button>
          <button type="button" aria-pressed={!!o?.ativo} disabled={ocupado || config?.configurado === false} onClick={() => !o?.ativo && enviar({})}>Ligado</button>
        </div>
      </div>
      {config?.configurado === false && <p className="small" style={{ margin: 0 }}>O Odoo ainda não está configurado no publicador{config.faltam?.length ? ` (falta ${config.faltam.join(' e ')})` : ''}. Fale com quem cuida do publicador.</p>}
      {o?.ativo && (
        <>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="small">Verificar no Odoo</span>
            <div className="seg" role="group" aria-label="De quanto em quanto tempo verificar">
              {INTERVALOS_ODOO.map((h) => (
                <button key={h} type="button" aria-pressed={horas === h} onClick={() => alterar((e) => { if (e.odoo) e.odoo.intervalo = h; })}>a cada {h} horas</button>
              ))}
            </div>
            <button className="btn sm" type="button" disabled={ocupado} onClick={() => enviar({})}>{ocupado ? 'Consultando…' : 'Buscar agora'}</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {o.pendente && evento.versaoAtiva != null
              ? 'Valores novos do Odoo ainda não estão no site: são publicados em até 5 minutos (ou publique agora).'
              : 'Buscar agora traz na hora o que mudou no Odoo; se algo mudar, o site é publicado em até 5 minutos.'}
            {' '}Status: com preço à venda, a cidade fica <b>aberta</b>; sem preço, <b>em breve</b>; se saiu de venda depois de ter vendido, <b>esgotado</b>. Dá para trocar à mão no cadastro: vale até a próxima mudança no Odoo.
          </p>
          {config?.aviso && (
            <details className="small">
              <summary>Aviso do Odoo (para o pessoal de desenvolvimento)</summary>
              <p className="muted" style={{ margin: '6px 0' }}>Chamado pelo Odoo (botão ou ação automática) quando um combo muda: o publicador busca na hora, sem esperar o intervalo. Para avisar só alguns combos, acrescente <code>&amp;combo=346,407</code>. Não divulgue este endereço fora da equipe.</p>
              <div className="row" style={{ gap: 6 }}>
                <input className="inp" readOnly value={config.aviso} onFocus={(e) => e.target.select()} aria-label="Endereço do aviso do Odoo" style={{ fontFamily: 'monospace', fontSize: 12 }} />
                <button className="btn sm ghost" type="button" onClick={() => navigator.clipboard?.writeText(config.aviso!).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); })}>{copiado ? 'Copiado' : 'Copiar'}</button>
              </div>
            </details>
          )}
        </>
      )}
      {u && (
        <div className="small" style={{ display: 'grid', gap: 4 }}>
          <span><span className={'pill ' + (u.ok ? 'ok' : 'warn')}>{u.ok ? 'ok' : 'atenção'}</span> {u.mensagem} <span className="muted">({quando(u.em)})</span></span>
          {u.cidades.filter((c) => c.combo != null || !u.ok).map((c) => (
            <span key={c.id} className={c.ok ? 'muted' : ''}>{c.ok ? '✓' : '✗'} {c.nome}{c.combo != null ? ` (combo ${c.combo})` : ''}: {c.mensagem}</span>
          ))}
        </div>
      )}
      {erro && <p className="small" style={{ margin: 0, color: 'var(--erro, #b42318)' }}>{erro}</p>}
    </section>
  );
}
