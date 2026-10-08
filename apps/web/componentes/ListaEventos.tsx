'use client';
import { FORMATOS, type Formato } from '@norte/motor';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Evento, ResumoEvento } from '@/lib/comum/tipos';
import { api, json } from './api';

const quando = (iso: string) => {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

export function ListaEventos() {
  const router = useRouter();
  const [eventos, setEventos] = useState<ResumoEvento[] | null>(null);
  const [erro, setErro] = useState('');
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState('');
  const [formato, setFormato] = useState<Formato>('tapume_praca');
  const [criando, setCriando] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);

  const carregar = () => api<ResumoEvento[]>('/api/eventos').then(setEventos, (e) => setErro(e.message));
  useEffect(() => { carregar(); }, []);

  async function criar() {
    setCriando(true);
    setErro('');
    try {
      const e = await api<Evento>('/api/eventos', json('POST', { nome, formato }));
      router.push(`/eventos/${e.slug}/paginas`);
    } catch (e) {
      setErro((e as Error).message);
      setCriando(false);
    }
  }

  async function excluir(slug: string) {
    setConfirmar(null);
    try {
      await api(`/api/eventos/${slug}`, { method: 'DELETE' });
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <>
      <div className="head">
        <h1>Eventos</h1>
        <p>Cada evento é um hotsite: uma home (tapume) e uma página por cidade.</p>
      </div>
      {erro && <div className="w-item bad"><span className="ic">✕</span><div><b>Não deu certo</b>{erro}</div></div>}
      {novo && (
        <section className="card stack">
          <label className="f">Nome do evento
            <input className="inp big" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Makai Beach Tennis Tour 2027" />
          </label>
          <div className="grid3" role="radiogroup" aria-label="Formato">
            {(Object.keys(FORMATOS) as Formato[]).map((f) => (
              <button key={f} type="button" className="fmt" role="radio" aria-checked={formato === f} onClick={() => setFormato(f)}>
                <h3>{FORMATOS[f].nome}</h3>
                <p>{DESC[f]}</p>
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn pri" type="button" disabled={!nome.trim() || criando} onClick={criar}>{criando ? 'Criando…' : 'Criar evento'}</button>
            <button className="btn ghost" type="button" onClick={() => setNovo(false)}>Cancelar</button>
          </div>
        </section>
      )}
      <div className="evs">
        {!novo && (
          <button className="ev new" type="button" onClick={() => setNovo(true)}>+ Novo evento</button>
        )}
        {eventos === null && !erro && <p className="muted">Carregando…</p>}
        {eventos?.map((e) => (
          <div key={e.slug} className="ev">
            {confirmar === e.slug ? (
              <div className="stack">
                <b>Excluir “{e.nome}”?</b>
                <p className="small muted">O evento sai da lista. O site publicado continua no ar até ser retirado.</p>
                <div className="row">
                  <button className="btn sm danger-fill" type="button" onClick={() => excluir(e.slug)}>Excluir</button>
                  <button className="btn sm ghost" type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <Link href={`/eventos/${e.slug}/paginas`} style={{ color: 'inherit', textDecoration: 'none' }} className="stack">
                  <h3>{e.nome}</h3>
                  <span className="row" style={{ gap: 6 }}>
                    <span className="pill">{FORMATOS[e.formato].nome}</span>
                    <span className="pill">{e.cidades} cidade(s)</span>
                    {e.url ? <span className="pill ok">no ar</span> : <span className="pill">rascunho</span>}
                    {e.pendente && <span className="pill warn" title="Há mudanças (ex.: em Patrocínios) esperando publicação">atualização pendente</span>}
                  </span>
                  <span className="foot">Editado {quando(e.atualizadoEm)}</span>
                </Link>
                <button className="iconbtn x" type="button" aria-label={`Excluir ${e.nome}`} onClick={() => setConfirmar(e.slug)}>✕</button>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export const DESC: Record<Formato, string> = {
  unica: 'Página única, sem variáveis. Publica o HTML do jeito que ele é.',
  tapume_praca: 'Uma página home que lista páginas internas por cidade.',
  tapume_etapa_praca: 'Uma página home, um seletor de etapa e uma interna.',
};
