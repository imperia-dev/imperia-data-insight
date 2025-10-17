-- Add 'financeiro' to user_role enum (used in profiles table)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'financeiro';