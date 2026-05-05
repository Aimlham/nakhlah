-- Manual activation columns for subscriptions table.
-- Run this once in the Supabase SQL editor (project: nakhlah).
-- Safe to re-run: uses IF NOT EXISTS.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS activation_source text DEFAULT 'payment',
  ADD COLUMN IF NOT EXISTS manual_activation_reason text,
  ADD COLUMN IF NOT EXISTS manually_activated_by text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill existing rows so revenue queries treat legacy rows as paid.
UPDATE public.subscriptions
  SET activation_source = 'payment'
  WHERE activation_source IS NULL;

-- Optional index to speed up revenue queries that exclude manual rows.
CREATE INDEX IF NOT EXISTS idx_subscriptions_activation_source
  ON public.subscriptions (activation_source);
