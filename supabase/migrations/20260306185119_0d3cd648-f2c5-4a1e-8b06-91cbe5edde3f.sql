
-- Backfill reviewer_name from linked translation_orders
UPDATE reviewer_protocols rp
SET reviewer_name = sub.review_name
FROM (
  SELECT DISTINCT ON (to2.reviewer_protocol_id) 
    to2.reviewer_protocol_id, to2.review_name
  FROM translation_orders to2
  WHERE to2.reviewer_protocol_id IS NOT NULL 
    AND to2.review_name IS NOT NULL
    AND to2.review_name != ''
) sub
WHERE rp.id = sub.reviewer_protocol_id
  AND (rp.reviewer_name IS NULL OR rp.reviewer_name = 'Unknown');

-- Backfill from orders_data JSONB for protocols without linked orders
UPDATE reviewer_protocols
SET reviewer_name = orders_data->0->>'review_name'
WHERE (reviewer_name IS NULL OR reviewer_name = 'Unknown')
  AND orders_data IS NOT NULL
  AND jsonb_array_length(orders_data) > 0
  AND orders_data->0->>'review_name' IS NOT NULL;
