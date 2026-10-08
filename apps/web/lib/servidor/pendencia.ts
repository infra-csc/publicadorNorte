// "Atualização pendente": mudança feita fora do evento (aba Patrocínios) que ainda não foi publicada.
import type { Evento } from '../comum/tipos';
import type { Armazenamento } from './armazenamento';

/** registra o motivo no evento (só faz sentido em evento já publicado) */
export function anotarPendencia(e: Evento, motivo: string) {
  if (e.versaoAtiva == null) return;
  e.pendencia ??= { desde: new Date().toISOString(), motivos: [] };
  if (!e.pendencia.motivos.includes(motivo)) e.pendencia.motivos.push(motivo);
}

export async function marcarPendencia(armazenamento: Armazenamento, slug: string, motivo: string) {
  await armazenamento.atualizar(slug, (e) => anotarPendencia(e, motivo), `Marca atualização pendente em ${slug}`);
}
