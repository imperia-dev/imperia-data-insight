import { bindProviderRequest, webhookConfigured } from "../../supabase/functions/n8n-webhook-proxy/authorization";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Provider authorization assertion failed");
}
const order = { order_number: "order-test", assigned_to: "actor", status_order: "in_progress", account_ID: "account" };
equal(bindProviderRequest("actor", "account", "account", order), { translationOrderId: "order-test", AccountId: "account" });
equal(bindProviderRequest("intruder", "account", "account", order), null);
equal(bindProviderRequest("actor", "account", "alternative-owner", order), null);
equal(bindProviderRequest("actor", null, "account", order), null);
equal(bindProviderRequest("actor", "account", "account", { ...order, account_ID: "other" }), null);
equal(bindProviderRequest("actor", "account", "account", { ...order, status_order: "available" }), null);
equal(bindProviderRequest("actor", "account", "account", null), null);
equal(webhookConfigured("https://example.invalid", undefined, "x-webhook-secret"), false);
equal(webhookConfigured("http://example.invalid", "test-fixture", "x-webhook-secret"), false);
equal(webhookConfigured("https://example.invalid", "test-fixture", "bad\r\nheader"), false);
equal(webhookConfigured("https://example.invalid", "test-fixture", "x-webhook-secret"), true);
console.log("Provider actor-binding and fail-closed rules passed");