// Odoo: o que a tela e o servidor usam igual (a consulta fica em lib/servidor/odoo.ts)

/** ID do produto no fim do link da loja: https://…/shop/cde27combo4ct-combo-…-curitiba-415 → 415 (também /shop/combos/…-415) */
export function idDoCombo(link: unknown): number | null {
  const m = String(link ?? '').trim().match(/\/shop\/(?:[^?#]*[/-])?(\d+)\/?(?:[?#]|$)/);
  return m ? Number(m[1]) : null;
}
