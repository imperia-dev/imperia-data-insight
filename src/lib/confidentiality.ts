import { z } from "zod";

export const policySchema = z.object({
  id: z.string().uuid(), version: z.string(), title: z.string(), body: z.string(),
  body_sha256: z.string().regex(/^[a-f0-9]{64}$/), published_at: z.string(),
});
export const receiptSchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), policy_id: z.string().uuid(),
  policy_sha256: z.string(), accepted_at: z.string(), account_email: z.string().nullable(),
  declaration: z.string(), user_agent: z.string().nullable(), authentication_method: z.unknown(),
});
export type ConfidentialityPolicy = z.infer<typeof policySchema>;
export type ConfidentialityReceipt = z.infer<typeof receiptSchema>;

const publicPaths = new Set([
  "/auth", "/reset-password", "/unauthorized", "/pending-approval",
  "/terms-of-service", "/privacy-policy", "/confidentiality-policy",
  "/portal", "/portal/login", "/portal/cadastro", "/portal/aguardando",
]);
export function requiresConfidentiality(pathname: string) {
  return !publicPaths.has(pathname.replace(/\/+$/, "") || "/");
}
export function hasCurrentAcceptance(policy: ConfidentialityPolicy | null, receipt: ConfidentialityReceipt | null, userId: string) {
  return Boolean(policy && receipt && receipt.user_id === userId && receipt.policy_id === policy.id && receipt.policy_sha256 === policy.body_sha256);
}
export function canAcceptConfidentiality(confirmed: boolean, policy: ConfidentialityPolicy | null, busy: boolean) {
  return confirmed && policy !== null && !busy;
}
export function downloadConfidentiality(policy: ConfidentialityPolicy, receipt?: ConfidentialityReceipt | null) {
  const evidence = receipt ? `\n\nCOMPROVANTE DE ACEITE\n${JSON.stringify(receipt, null, 2)}` : "";
  const blob = new Blob([policy.body, `\n\nSHA-256 do texto: ${policy.body_sha256}`, evidence], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `imperia-confidencialidade-${policy.version}${receipt ? "-comprovante" : ""}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}