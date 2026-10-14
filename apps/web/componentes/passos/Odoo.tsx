'use client';
// Preços do Odoo: liga a consulta (preço, parcelas, O2 Prime, link e distâncias de cada cidade vêm do combo no Odoo)
// e mostra o último resultado. A automação confere a cada 30 minutos e republica quando algo muda.
import { useEffect, useState } from 'react';
import { idDoCombo } from '@/lib/comum/odoo';
import type { Evento, ResultadoOdoo } from '@/lib/comum/tipos';
import { api, json } from '../api';
import { useEditor } from '../Editor';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export function SecaoOdoo() {
  const { evento, salvarJa, substituir } = useEditor();
  const o = evento.odoo;
  const comLink = evento.cidades.filter((l) => idDoCombo(l.link_inscricao) != null);
  const [config, setConfig] = useState<{ configurado: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const visivel = !!o || comLink.length > 0;
  useEffect(() => {
    if (visivel) api<{ configurado: boolean }>(`/api/hotsites/${evento.slug}/odoo`).then(setConfig).catch(() => setConfig(null));
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

  const u = o?.ultima;
  return (
    <section className="card stack" style={{ gap: 10 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 18 }}>Preços do Odoo</h2>
          <p className="small muted" style={{ margin: 0 }}>
            {o?.ativo
              ? 'Ligado: preço, parcelas, O2 Prime, link de compra e distâncias vêm do combo de cada cidade no Odoo. A cada 30 minutos o publicador confere e, se algo mudou, atualiza o cadastro e republica.'
              : `Desligado: ${comLink.length} cidade(s) com link de combo do Odoo. Ligado, o preço e o resto vêm de lá (pelo número no fim do link).`}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Preços do Odoo">
          <button type="button" aria-pressed={!o?.ativo} disabled={ocupado} onClick={() => o?.ativo && enviar({ ativo: false })}>Desligado</button>
          <button type="button" aria-pressed={!!o?.ativo} disabled={ocupado || config?.configurado === false} onClick={() => !o?.ativo && enviar({})}>Ligado</button>
        </div>
      </div>
      {config?.configurado === false && <p className="small" style={{ margin: 0 }}>O Odoo ainda não está configurado no publicador (falta a chave). Fale com quem cuida do publicador.</p>}
      {o?.ativo && (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm" type="button" disabled={ocupado} onClick={() => enviar({})}>{ocupado ? 'Consultando…' : 'Buscar agora'}</button>
          <span className="small muted">Buscar agora atualiza o cadastro. Para ir ao site, publique (ou espere a automação).</span>
        </div>
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
