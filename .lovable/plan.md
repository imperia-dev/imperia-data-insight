

## Plan: Show operation user name instead of just ID

**Problem:** Line 123 in `ReviewerProtocolDetailsDialog.tsx` displays the raw `assigned_operation_user_id` UUID. We need to resolve it to a human-readable name.

**Solution:** Fetch the user's `full_name` from the `profiles` table using the `assigned_operation_user_id`, and display it alongside or instead of the ID.

### Changes to `src/components/reviewerProtocols/ReviewerProtocolDetailsDialog.tsx`

1. Add a `useQuery` hook that fetches `full_name` from `profiles` where `id = protocol.assigned_operation_user_id` (only when the dialog is open and the ID exists)
2. Replace line 123's notes from `Responsável: ${protocol.assigned_operation_user_id}` to `Responsável: ${operationUserName}` (falling back to the ID if the lookup fails)

Imports to add: `useQuery` from `@tanstack/react-query`, `supabase` from `@/integrations/supabase/client`.

