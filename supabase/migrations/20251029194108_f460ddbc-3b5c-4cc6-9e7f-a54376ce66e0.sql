-- Add urgency_tag column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS urgency_tag TEXT CHECK (urgency_tag IN ('1-dia-util', 'mesmo-dia'));