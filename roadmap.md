# Confidentiality commitment
## Security remediation
- [ ] Close nullable-role sensitive RPCs and unauthorized target mutations; protect anonymous history writes.
- [ ] Actor-bind the provider webhook and redact sensitive translation webhook logging.
- [ ] Patch vulnerable dependencies and verify regressions and anonymous denial.
- [ ] Rotate compromised webhook credentials — blocked: user deferred entering secrets; outbound n8n calls must fail closed until configured.
- [ ] Enable hosted leaked-password protection — blocked: external Supabase hosted authentication settings require owner access.
- [ ] Verify authenticated correct-role/wrong-role/wrong-owner requests — blocked: external unmanaged Supabase has no authenticated test session.
## Security audit requested
- [x] Classify existing database advisor findings and validate actual public exposure without modifying production data.
- [x] Inspect integration authorization and vulnerable production dependencies.
- [x] Report verified risks, existing protections and remediation priorities without claiming a breach or complete security.

## Confidentiality implementation
- [x] Store a versioned confidentiality policy and immutable, authenticated acceptance evidence.
- [x] Require acceptance before mounting internal pages for existing and new accounts; keep legal pages readable.
- [x] Provide policy consultation and downloadable acceptance evidence.
- [x] Test acceptance rules and verify public consultation/download in the browser.
- [x] Explain legal review requirement and verification limitations.
- [ ] Verify signed-in acceptance and receipt download end-to-end — blocked: external unmanaged Supabase has no available authenticated test session; a user must verify in the app.
- [ ] Legal validation — blocked: an attorney must review the commitment, organization details and electronic acceptance method.