-- Task fullscreen modal (Phase 1): Set up accordion's Timeframe (Start/End) fields.
-- No due-date-shaped column existed on notes (confirmed live, Phase 0 + re-verified
-- Phase 1). Mirrors the type already used for the same concept on objectives
-- (objectives.start_date / objectives.end_date, both `date`, both nullable) —
-- the mockup's fields are date-only with no time-of-day shown, so `date` matches
-- both the UI need and the existing schema convention.
alter table public.notes
  add column start_date date null,
  add column end_date date null;
