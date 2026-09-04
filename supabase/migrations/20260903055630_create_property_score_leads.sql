/*
# Create property_score_leads table (single-tenant, no auth)

1. New Tables
- `property_score_leads`
  - `id` (uuid, primary key)
  - `name` (text, not null) — full name of the person requesting the score
  - `email` (text, not null) — contact email
  - `whatsapp` (text) — WhatsApp number
  - `listing_url` (text, not null) — Property24 / Private Property listing URL
  - `goal` (text, not null) — Buy to Live, Rental, or Flip
  - `created_at` (timestamptz, default now)

2. Security
- Enable RLS on `property_score_leads`.
- Allow anon + authenticated INSERT only (public lead submission form).
- No SELECT/UPDATE/DELETE for anon — leads are private to operators.
*/

CREATE TABLE IF NOT EXISTS property_score_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  listing_url text NOT NULL,
  goal text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_score_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_leads" ON property_score_leads;
CREATE POLICY "anon_insert_leads"
ON property_score_leads FOR INSERT
TO anon, authenticated WITH CHECK (true);
