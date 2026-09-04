/*
# Add anon SELECT policies for dashboard reads

The dashboard page reads from property_submissions with joins to customers,
payments, and reports. These need anon SELECT policies so the browser-based
dashboard can query them. This is an operator dashboard on a no-auth app.

1. Security changes:
- Add SELECT policy on customers (anon + authenticated)
- Add SELECT policy on property_submissions (anon + authenticated)
- Add SELECT policy on payments (anon + authenticated)
- Add SELECT policy on reports (anon + authenticated)
*/

DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers"
ON customers FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_submissions" ON property_submissions;
CREATE POLICY "anon_select_submissions"
ON property_submissions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments"
ON payments FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports"
ON reports FOR SELECT
TO anon, authenticated USING (true);
