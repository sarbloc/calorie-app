-- Add name and items_json columns to meals table
-- name: short label (e.g. "Chicken rice bowl")
-- items_json: AI estimation per-item breakdown as JSONB
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS items_json JSONB;

-- Migrate existing data: copy description into name
UPDATE public.meals SET name = description WHERE name IS NULL;

-- Drop NOT NULL constraint on description so it can be used for optional ingredient details
ALTER TABLE public.meals ALTER COLUMN description DROP NOT NULL;

-- Clear description for migrated rows (it was used as a name, not ingredients)
UPDATE public.meals SET description = NULL;
