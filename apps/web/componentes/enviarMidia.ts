// Envio de arquivos de mídia: calcula o sha (igual ao do git), sobe só o que é novo e registra no evento num commit.
import { slug } from '@norte/motor';
import { shaGit } from '@/lib/comum/arquivos';
import type { ArquivoMidia } from '@/lib/comum/tipos';
import { api, json } from './api';

export interface ItemEnvio { file: File; caminho: string }
export interface ResultadoEnvio {
  /** arquivos registrados (novos ou trocados) */
  novos: ArquivoMidia[];
  /** caminho pedido → arquivo que ficou valendo (pode ser um igual que já existia) */
  porPedido: Map<string, ArquivoMidia>;
  pulados: number;
  grandes: string[];
}

const LIMITE = 100 * 1024 * 1024;

export async function enviarMidia(slugEvento: string, itens: ItemEnvio[], existentes: ArquivoMidia[], progresso: (t: string) => void): Promise<ResultadoEnvio> {
  const porCaminho = new Map(existentes.map((a) => [a.caminho, a]));
  const porSha = new Map(existentes.map((a) => [a.sha, a]));
  const novos: ArquivoMidia[] = [];
  const porPedido = new Map<string, ArquivoMidia>();
  const grandes: string[] = [];
  let feitos = 0;
  let pulados = 0;
  const fila = [...itens];
  const trabalhar = async () => {
    for (let x = fila.shift(); x; x = fila.shift()) {
      const bytes = new Uint8Array(await x.file.arrayBuffer());
      const sha = await shaGit(bytes);
      progresso(`Enviando ${++feitos} de ${itens.length}…`);
      // o mesmo conteúdo já está guardado: não sobe de novo
      if (porCaminho.get(x.caminho)?.sha === sha) { pulados++; porPedido.set(x.caminho, porCaminho.get(x.caminho)!); continue; }
      if (bytes.length > LIMITE) { grandes.push(x.caminho); continue; }
      if (!porSha.has(sha)) await api<{ sha: string }>('/api/arquivos', { method: 'POST', body: bytes });
      const a = { caminho: x.caminho, sha, bytes: bytes.length };
      novos.push(a);
      porPedido.set(x.caminho, a);
    }
  };
  await Promise.all([trabalhar(), trabalhar(), trabalhar(), trabalhar()]);
  if (novos.length) {
    progresso('Guardando…');
    await api(`/api/eventos/${slugEvento}/midia`, json('POST', { arquivos: novos }));
  }
  return { novos, porPedido, pulados, grandes };
}

/** junta os arquivos novos aos que já existiam (o caminho igual é trocado) */
export function juntar(existentes: ArquivoMidia[], novos: ArquivoMidia[]): ArquivoMidia[] {
  const mapa = new Map(existentes.map((a) => [a.caminho, a]));
  for (const n of novos) mapa.set(n.caminho, n);
  return [...mapa.values()].sort((a, b) => (a.caminho < b.caminho ? -1 : 1));
}

const extensao = (nome: string) => (/\.([a-z0-9]+)$/i.exec(nome)?.[1] || '').toLowerCase().replace(/^jpeg$/, 'jpg');

/**
 * Nome limpo e livre dentro da pasta: sem acento, espaço ou maiúscula; se já existir, ganha -2, -3…
 * `base` = nome desejado sem extensão (ex.: o nome do lugar, "desktop").
 */
export function nomeLivre(pasta: string, base: string, arquivoOriginal: string, ocupados: Set<string>): string {
  const ext = extensao(arquivoOriginal);
  const b = slug(base) || 'arquivo';
  let c = `${pasta}${b}.${ext}`;
  for (let i = 2; ocupados.has(c); i++) c = `${pasta}${b}-${i}.${ext}`;
  ocupados.add(c);
  return c;
}
