# Security hardening — 22 October 2026 UTC

## Applied and deployed
- Sensitive company-cost/provider/secret RPCs and account approvals explicitly reject missing identity and NULL roles. Anonymous EXECUTE is revoked, including default PUBLIC grants. Owner-only and owner/master permissions remain unchanged.
- Session revocation is restricted to own account or owner/master (and trusted service requests). Failure-counter RPCs are service-only. Session validation resolves only the authenticated account's sessions.
- Workflow synchronization preserves automatic definer-trigger execution; direct calls require owner/master/admin or trusted service.
- get_user_email exposes only the authenticated account or privileged administration. Anonymous provider-token policy branches use CASE to avoid invoking that helper without an actor.
- Direct public history/security/login/SMS inserts are revoked; service and definer-trigger writers remain. Public lead tracking writes are closed; there are no repository callers for the removed anonymous tracking policies. External tracking integrations, if any, must use trusted server intake.
- Users cannot change their external operation-account mapping. Operation-role claims require a previously unassigned, available order and their own server-stored mapping; existing assignments and order numbers cannot be changed by operations.
- Provider proxy validates roles, approved profile, strict input shape, exact order lookup, current assignment/state and external account mapping before building the two-field outbound payload. Missing shared secret returns 503 without calling n8n; redirect following is disabled.
- Translation webhook still requires its existing shared secret. Incoming/prepared/saved records and raw database error details were removed from logging. Numeric zero no longer fails the required-field presence check.
- Login runs through secure-login in internal and trial UI, including automatic trial signup and backup-code retry. Only Supabase Auth's real result feeds login-attempt/lockout records; client-supplied success flags cannot forge failures through the old RPC. Secrets, passwords and sessions are not logged; session responses are no-store.
- Login-alert and suspicious-login endpoints validate a real user and reject caller-chosen alternative user IDs. Suspicious-login lookup checks the attempt's account and successful result. The unsafe direct REST session-revocation email link is replaced with authenticated account entry.
- The secret-rotation logging RPC now receives the verified owner's JWT rather than a service client with no user subject. This endpoint records a rotation candidate; it does not itself replace hosted credentials.

## Verification
- Live deployed schema confirms no anonymous execution on all 16 targeted RPCs; failure-counter and login/lockout/alert mutation helpers are also unavailable to ordinary authenticated callers.
- All ten targeted history/tracking tables report no anonymous insertion privilege.
- Live anonymous zero-row HTTP probes: get_company_costs_view 401, get_active_secrets_summary 401. No business records fetched.
- Live translation webhook with no secret: 401; no mutation executed.
- Browser: /auth renders, nonexistent synthetic credentials yield “Email ou senha incorretos”, /portal/login renders, and signed-out /orders redirects to /auth.
- Provider actor-binding and fail-closed regression tests passed; confidentiality tests passed; PDF/autotable export smoke test passed. Preview build OK.
- Production dependency scanner: no known vulnerabilities in 66 registry dependencies after upgrades and overrides. SheetJS 0.20.3 from its vendor archive is not registry-scanned. React Router upgraded to patched 7.18.4; DOMPurify including jsPDF's transitive copy, Supabase SDK, jsPDF/autotable, lodash and fflate are patched. Bun text lockfile is canonical; stale npm/binary lockfiles removed. Development-tool advisories remain and are not part of the production-only scanner result.

## Limits and remaining actions — not a complete-security guarantee
- **Authenticated path: UNVERIFIED.** External unmanaged Supabase provides no authenticated test session here. Correct/wrong-role and wrong-owner live requests, real account login, provider-token access and financial workflow regressions need real-user verification. Local actor-binding tests are not a signed-in end-to-end request.
- **Guest provider action: denied at the proxy** (authenticated action only); the live provider proxy's wrong-role/wrong-owner path remains unverified. No owner ID is accepted or persisted by this action.
- N8N_WEBHOOK_SECRET / header setup and TRANSLATION_WEBHOOK_SECRET rotation were deferred by the user. The outbound provider integration remains blocked until the shared secret is configured in both systems. Existing inbound credential is not claimed rotated.
- Hosted leaked-password protection remains disabled per the prior scan and requires external Supabase owner configuration. Other hosted signup/auth rate settings were not verified.
- Application lockouts protect the new login entrypoint, but direct Supabase Auth sign-in remains an upstream endpoint. This change does not establish globally enforced hosted lockouts, CAPTCHA or Auth hooks.
- Historical broad authenticated reads, public avatar/company-assets content, public registration abuse controls, other service-backed endpoints and development-tool advisories remain review areas. 110 advisor findings predated the last migration (47 anonymous and 62 authenticated definer routines plus leaked-password protection); an executable definer routine alone is not proof of vulnerability.
- No accounts or business records deleted; no compromised credential values read, printed or generated. Synthetic failed-login verification intentionally added an isolated login-attempt record, not a business mutation.
- Legal review and authenticated confidentiality acceptance/receipt verification remain pending from the earlier feature.