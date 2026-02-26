-- Add tier_mode column to quote_drafts (was missing from Phase 2 deployment)
-- tier_good, tier_better, tier_best columns already exist

ALTER TABLE public.quote_drafts
  ADD COLUMN IF NOT EXISTS tier_mode TEXT DEFAULT 'single'
  CHECK (tier_mode IN ('single', 'tiered'));
