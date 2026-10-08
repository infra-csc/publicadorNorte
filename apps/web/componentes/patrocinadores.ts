// Cadastro de patrocinador no banco geral: sobe o logo e cria o registro (usado no passo Patrocínios e na tela do banco).
import { slug } from '@norte/motor';
import { shaGit } from '@/lib/comum/arquivos';
import type { BancoPatrocinios, PatrocinadorBanco } from '@/lib/comum/tipos';
import { api } from './api';

export const ehImagemLogo = (nome: string) => /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(nome);
const ext = (nome: string) => (/\.([a-z0-9]+)$/i.exec(nome)?.[1] || 'png').toLowerCase().replace(/^jpeg$/, 'jpg');

/** sobe o arquivo do logo e devolve os dados para guardar no banco */
export async function subirLogo(nome: string, f: File): Promise<Pick<PatrocinadorBanco, 'logo' | 'sha' | 'bytes'>> {
  if (!ehImagemLogo(f.name)) throw new Error('O logo precisa ser uma imagem (svg, png, webp ou jpg).');
  const bytes = new Uint8Array(await f.arrayBuffer());
  const sha = await shaGit(bytes);
  await api<{ sha: string }>('/api/arquivos', { method: 'POST', body: bytes });
  return { logo: `${slug(nome) || 'logo'}-${sha.slice(0, 7)}.${ext(f.name)}`, sha, bytes: bytes.length };
}

/** novo patrocinador (o id é o nome limpo, sem repetir) */
export function novoPatrocinador(banco: BancoPatrocinios, dados: { nome: string; url: string } & Pick<PatrocinadorBanco, 'logo' | 'sha' | 'bytes'>): PatrocinadorBanco {
  const base = slug(dados.nome) || 'patrocinador';
  let id = base;
  for (let i = 2; banco.patrocinadores.some((p) => p.id === id); i++) id = `${base}-${i}`;
  return { id, nome: dados.nome.trim(), url: dados.url.trim(), ativo: true, logo: dados.logo, sha: dados.sha, bytes: dados.bytes, criadoEm: new Date().toISOString() };
}

/** ordem alfabética em português (sem diferença de acento e maiúscula) */
export const porNome = <T extends { nome: string }>(a: T, b: T) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

export const urlLogo = (p: Pick<PatrocinadorBanco, 'sha' | 'logo'>) => `/api/arquivos/${p.sha}?n=${encodeURIComponent(p.logo)}`;
