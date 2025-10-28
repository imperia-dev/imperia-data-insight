-- Update reviewer_protocols with correct names from translation_orders
UPDATE reviewer_protocols rp
SET reviewer_name = subq.review_name
FROM (
  SELECT DISTINCT review_id, review_name
  FROM translation_orders
  WHERE review_id IS NOT NULL AND review_name IS NOT NULL
) subq
WHERE rp.reviewer_id = subq.review_id
  AND rp.reviewer_name = 'Unknown';