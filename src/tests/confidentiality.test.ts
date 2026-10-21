import { canAcceptConfidentiality, hasCurrentAcceptance, requiresConfidentiality, type ConfidentialityPolicy, type ConfidentialityReceipt } from "../lib/confidentiality";

const assert = { equal(actual: unknown, expected: unknown, message = "Assertion failed") {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
} };

const policy: ConfidentialityPolicy = { id: "00000000-0000-4000-8000-000000000001", version: "1.0", title: "Test", body: "Test", body_sha256: "a".repeat(64), published_at: "2026-10-21T00:00:00Z" };
const receipt: ConfidentialityReceipt = { id: "receipt", user_id: "account-a", policy_id: policy.id, policy_sha256: policy.body_sha256, accepted_at: "2026-10-21T00:00:00Z", account_email: null, declaration: "test", user_agent: null, authentication_method: [] };

assert.equal(hasCurrentAcceptance(policy, null, "account-a"), false, "Existing or new accounts without acceptance must be blocked");
assert.equal(hasCurrentAcceptance(policy, receipt, "account-a"), true, "Persisted acceptance for the current account releases access");
assert.equal(hasCurrentAcceptance(policy, receipt, "account-b"), false, "One account cannot reuse another account's acceptance");
assert.equal(hasCurrentAcceptance({ ...policy, id: "new-version" }, receipt, "account-a"), false, "A new policy requires new acceptance");
assert.equal(hasCurrentAcceptance({ ...policy, body_sha256: "b".repeat(64) }, receipt, "account-a"), false, "Mismatched content integrity blocks access");
assert.equal(canAcceptConfidentiality(false, policy, false), false, "Explicit acknowledgment is mandatory");
assert.equal(canAcceptConfidentiality(true, null, false), false, "Unavailable policy cannot be accepted");
assert.equal(canAcceptConfidentiality(true, policy, true), false, "Pending verification cannot be bypassed");
assert.equal(canAcceptConfidentiality(true, policy, false), true);
for (const path of ["/", "/orders", "/my-orders", "/portal/app", "/portal/app/novo"]) assert.equal(requiresConfidentiality(path), true, `Gate must cover ${path}`);
for (const path of ["/auth", "/portal/login", "/portal/cadastro", "/privacy-policy", "/confidentiality-policy", "/confidentiality-policy/"]) assert.equal(requiresConfidentiality(path), false, `Public document or authentication must remain accessible: ${path}`);
console.log("Confidentiality access rules passed");