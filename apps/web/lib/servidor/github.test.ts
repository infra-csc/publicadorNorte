// Erros do GitHub: limite de pedidos (403/429) não é falta de permissão
import { describe, expect, it } from 'vitest';
import { limiteDoGitHub } from './github';

const resp = (status: number, h: Record<string, string> = {}) => new Response(null, { status, headers: h });

describe('limite de pedidos do GitHub', () => {
  it('403 com "rate limit" ou sem pedidos sobrando, e 429, são limite; com a hora em que libera', () => {
    expect(limiteDoGitHub(resp(403, { 'x-ratelimit-reset': '1792440000' }), 'API rate limit exceeded for user ID 1')?.liberaEm?.getTime()).toBe(1792440000000);
    expect(limiteDoGitHub(resp(403, { 'x-ratelimit-remaining': '0' }), 'Forbidden')).toBeDefined();
    expect(limiteDoGitHub(resp(429), 'Too many')).toBeDefined();
  });
  it('403 de permissão e outros erros não são limite', () => {
    expect(limiteDoGitHub(resp(403, { 'x-ratelimit-remaining': '4999' }), 'Resource not accessible by personal access token')).toBeUndefined();
    expect(limiteDoGitHub(resp(404), 'Not Found')).toBeUndefined();
  });
});
