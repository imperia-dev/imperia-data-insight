export interface ProviderOrder {
  order_number: string;
  assigned_to: string | null;
  status_order: string | null;
  account_ID: string | null;
}

export function bindProviderRequest(
  userId: string,
  accountId: string | null,
  requestedAccountId: string,
  order: ProviderOrder | null,
) {
  if (!accountId || !order || order.assigned_to !== userId ||
    order.status_order !== "in_progress" || requestedAccountId !== accountId ||
    order.account_ID !== accountId) return null;
  return { translationOrderId: order.order_number, AccountId: accountId };
}

export function webhookConfigured(url: string | undefined, secret: string | undefined, header: string) {
  if (!url || !secret || !/^[a-zA-Z0-9-]+$/.test(header)) return false;
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}