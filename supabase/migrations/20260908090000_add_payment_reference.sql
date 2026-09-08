/*
 * EiX Property Score — payment-specific PayFast references
 *
 * A submission can have multiple payments:
 *   standard_report       R149
 *   investor_report_pro   R349
 *
 * PayFast notifications must therefore identify the exact payment,
 * not merely the property submission.
 */

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_reference text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_reference_unique
  ON public.payments (payment_reference)
  WHERE payment_reference IS NOT NULL;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS pdf_url text;

CREATE INDEX IF NOT EXISTS payments_product_idx
  ON public.payments(product);

CREATE INDEX IF NOT EXISTS payments_submission_product_idx
  ON public.payments(submission_id, product);
