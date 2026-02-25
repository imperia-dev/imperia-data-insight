
# Fix: "Acesso Negado" for Operation Users

## Problem Identified

Both users (`marianadiassbastos@gmail.com` and `jhulliegama@hotmail.com`) have:
- Role: `operation`
- Approval status: `approved`
- Email confirmed

However, when they log in, they land on the `/` route (home page). The `operation` role does **not** include `/` in its list of permitted routes in `src/lib/permissions.ts`. The `ProtectedRouteWithApproval` component blocks access before the `HomePage` component can redirect them to `/announcements` (which IS in their allowed routes).

## Solution

Add `/` to the `operation` and `translator` role permissions in `src/lib/permissions.ts`. This is safe because the `HomePage` component already redirects these roles to their appropriate pages (`/announcements`), so they never actually see the admin dashboard.

## Technical Details

**File: `src/lib/permissions.ts`**

- Add `'/'` to the `operation` role's route list (line 139)
- Add `'/'` to the `translator` role's route list (line 154)

This mirrors what already exists for `owner`, `master`, and `admin` roles, and ensures the redirect logic in `HomePage.tsx` can execute before being blocked by the route guard.
