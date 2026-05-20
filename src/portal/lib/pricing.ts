/**
 * Regras de preço do portal do cliente (tradução juramentada).
 *
 * - Documentos com até 3 páginas: valor fixo de R$ 70,00 por documento.
 * - Documentos com 4 páginas ou mais: páginas × R$ 50,00.
 *
 * Importante: o cálculo é por documento (arquivo) e NÃO sobre o total
 * agregado do pedido. 2 arquivos de 2 páginas custam R$ 140, não R$ 70.
 */

export const FLAT_PRICE = 70;
export const PAGE_PRICE = 50;
export const FLAT_PAGE_LIMIT = 3;

export function priceForDocument(pages: number): number {
  const p = Math.max(0, Math.floor(pages || 0));
  if (p === 0) return 0;
  if (p <= FLAT_PAGE_LIMIT) return FLAT_PRICE;
  return p * PAGE_PRICE;
}

export function priceForOrder(files: Array<{ pages: number | null }> | null | undefined): number {
  if (!files?.length) return 0;
  return files.reduce((sum, f) => sum + priceForDocument(f.pages ?? 0), 0);
}
