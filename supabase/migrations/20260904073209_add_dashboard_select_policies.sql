/*
# Create EiX Property Score operational schema

The application uses:
customers -> property_submissions -> payments -> reports

The earlier version of this migration referenced tables that had never
been created in this repository.

This migration creates the required schema and enables RLS.

IMPORTANT:
- Browser/anon access is NOT granted to customer/payment/report data.
- The Next.js server uses the Supabase service-role client for checkout
  and PayFast processing.
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  listing_url text NOT NULL,
  source_platform text,
  goal text NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_payment',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  product text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payfast_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  report_type text NOT NULL DEFAULT 'standard_report',
  investment_score integer,
  ai_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_submissions_customer_id
  ON property_submissions(customer_id);

CREATE INDEX IF NOT EXISTS idx_property_submissions_created_at
  ON property_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_submission_id
  ON payments(submission_id);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id
  ON payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_reports_submission_id
  ON reports(submission_id);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
