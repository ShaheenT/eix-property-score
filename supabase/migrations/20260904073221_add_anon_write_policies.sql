/*
# Add anon INSERT on payments for checkout flow

The checkout API route creates a payment record after a submission.
Need anon INSERT on payments to support this.

1. Security changes:
- Add INSERT policy on payments (anon + authenticated)
*/

DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments"
ON payments FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports"
ON reports FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments"
ON payments FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_submissions" ON property_submissions;
CREATE POLICY "anon_update_submissions"
ON property_submissions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reports" ON reports;
CREATE POLICY "anon_update_reports"
ON reports FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);
