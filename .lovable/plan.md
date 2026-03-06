

## Problem

The reviewer name shows as "Unknown" because the `generate-reviewer-protocols` edge function tries to look up `review_id` in the `profiles` table. But these IDs are **external system IDs** (e.g., `B7B94D25-A4ED-4555-A23D-719EB04643E7`), not Supabase user UUIDs — so the lookup always fails.

Meanwhile, the correct reviewer name already exists in `translation_orders.review_name` (Daniele, Beatriz, Hellem, etc.).

## Solution (2 parts)

### 1. Fix the edge function (`generate-reviewer-protocols/index.ts`)

Instead of looking up `profiles` by `review_id`, use `review_name` directly from the translation orders:

- Remove the profiles lookup entirely (lines 102-113)
- In the grouping loop, use `order.review_name` as the reviewer name
- Use `order.review_email` as the email (though note: this field currently stores names too, not actual emails)

### 2. Fix existing "Unknown" protocols via SQL

Run an UPDATE to backfill `reviewer_name` on existing `reviewer_protocols` using the `review_name` from linked `translation_orders`:

```sql
UPDATE reviewer_protocols rp
SET reviewer_name = sub.review_name
FROM (
  SELECT DISTINCT ON (to2.reviewer_protocol_id) 
    to2.reviewer_protocol_id, to2.review_name
  FROM translation_orders to2
  WHERE to2.reviewer_protocol_id IS NOT NULL 
    AND to2.review_name IS NOT NULL
) sub
WHERE rp.id = sub.reviewer_protocol_id
  AND (rp.reviewer_name IS NULL OR rp.reviewer_name = 'Unknown');
```

Also fix protocols without linked orders (using `orders_data` JSONB):

```sql
UPDATE reviewer_protocols
SET reviewer_name = orders_data->0->>'review_name'
WHERE (reviewer_name IS NULL OR reviewer_name = 'Unknown')
  AND orders_data IS NOT NULL
  AND jsonb_array_length(orders_data) > 0
  AND orders_data->0->>'review_name' IS NOT NULL;
```

### Files changed
- `supabase/functions/generate-reviewer-protocols/index.ts` — remove profiles lookup, use `review_name` from orders directly

