/* EiXPropScore™ — International Buyer Intelligence profile fields. */
ALTER TABLE public.property_submissions
  ADD COLUMN IF NOT EXISTS buyer_type text NOT NULL DEFAULT 'south_african',
  ADD COLUMN IF NOT EXISTS buyer_country text,
  ADD COLUMN IF NOT EXISTS buyer_purpose text,
  ADD COLUMN IF NOT EXISTS buyer_budget text;

ALTER TABLE public.property_submissions
  DROP CONSTRAINT IF EXISTS property_submissions_buyer_type_check;

ALTER TABLE public.property_submissions
  ADD CONSTRAINT property_submissions_buyer_type_check
  CHECK (buyer_type IN ('south_african', 'international'));

CREATE INDEX IF NOT EXISTS idx_property_submissions_buyer_type
  ON public.property_submissions(buyer_type);

CREATE INDEX IF NOT EXISTS idx_property_submissions_buyer_country
  ON public.property_submissions(buyer_country);
