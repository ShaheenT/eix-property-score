/*
# EiX Property Score server-side access

Checkout and PayFast processing use the Supabase service-role client.
Therefore no anonymous INSERT/UPDATE policies are required.

RLS remains enabled on all operational tables.

This migration intentionally does not expose customer, payment,
submission, or report records to anonymous browser clients.
*/
