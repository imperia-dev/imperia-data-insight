# Architecture rules
- Reusable hooks and layout components must give each mounted instance its own Realtime channel name and remove it on cleanup; Supabase reuses equal names and rejects listeners added after subscription.
- Store confidentiality policy versions and immutable acceptance receipts in dedicated tables; record acceptance through an authenticated, version-and-hash-validated RPC so clients cannot choose an actor or acceptance timestamp.
- Wrap internal application content in the confidentiality gate before mounting page components; legal and authentication routes remain available, and existing authorization policies remain the security boundary for data access.
- Provider webhook requests must derive the external account and order from authenticated, assignment-checked database records; never forward arbitrary caller JSON.
- Authoritative login-attempt logging runs server-side after Supabase Auth evaluates credentials; client-reported results must not drive lockouts.
- Database RPC authorization must explicitly reject missing actors and NULL roles; internal service callers and trigger invocations are granted deliberately.