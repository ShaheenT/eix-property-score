import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { ReportPrintButton } from '@/components/report-print-button';

function currency(cents: number | null): string {
  return cents === null ? 'Not verified' : `R ${(cents / 100).toLocaleString('en-ZA')}`;
}

function yesNo(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not verified';
}

export default async function CustomerReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const { data: report } = await supabaseAdmin
    .from('reports')
    .select('id, status, report_type, investment_score, ai_confidence, property_facts, property_evidence, score_breakdown, assumptions, limitations, rental_yield_percent, bond_monthly_payment_cents, bond_loan_amount_cents, risk_level, recommendation, confidence_label, access_token, processed_at')
    .eq('id', id)
    .eq('access_token', token)
    .single();

  if (!report || !['completed', 'sent'].includes(report.status)) notFound();

  const facts = (report.property_facts || {}) as Record<string, unknown>;
  const evidence = Array.isArray(report.property_evidence) ? report.property_evidence : [];
  const limitations = Array.isArray(report.limitations) ? report.limitations : [];
  const assumptions = Array.isArray(report.assumptions) ? report.assumptions : [];

  const verifiedFacts: Array<[string, string]> = [
    ['Asking Price', currency(typeof facts.askingPriceCents === 'number' ? facts.askingPriceCents : null)],
    ['Property Type', String(facts.propertyType || 'Not verified')],
    ['Bedrooms', String(facts.bedrooms ?? 'Not verified')],
    ['Bathrooms', String(facts.bathrooms ?? 'Not verified')],
    ['Floor Size', facts.floorSizeM2 ? `${facts.floorSizeM2} m²` : 'Not verified'],
    ['Land Size', facts.landSizeM2 ? `${facts.landSizeM2} m²` : 'Not verified'],
    ['Garages', String(facts.garages ?? 'Not verified')],
    ['Parking', String(facts.parking ?? 'Not verified')],
    ['Study', yesNo(facts.hasStudy)],
    ['Pool', yesNo(facts.hasPool)],
    ['Garden', yesNo(facts.hasGarden)],
    ['Fibre', yesNo(facts.hasFibre)],
    ['Solar', yesNo(facts.hasSolar)],
    ['Backup Power', yesNo(facts.hasBatteryBackup)],
    ['Levies', currency(typeof facts.leviesCents === 'number' ? facts.leviesCents : null)],
    ['Rates & Taxes', currency(typeof facts.ratesAndTaxesCents === 'number' ? facts.ratesAndTaxesCents : null)],
  ];

  return (
    <main className="min-h-screen bg-midnight px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <img src="/eixproplogo.png" alt="EiX Property Score" className="h-12 w-auto" />
          <ReportPrintButton />
        </div>

        <section className="glass-strong rounded-3xl p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">EiX Property Score™ Report</p>
          <h1 className="mt-3 text-3xl font-bold">{String(facts.title || 'Property Analysis')}</h1>
          <p className="mt-2 text-white/60">{String(facts.address || 'Address not verified')}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5"><p className="text-xs uppercase text-white/40">Investment Score</p><p className="mt-2 text-4xl font-bold text-teal-400">{report.investment_score ?? '—'}<span className="text-lg text-white/40">/100</span></p></div>
            <div className="glass rounded-2xl p-5"><p className="text-xs uppercase text-white/40">Confidence</p><p className="mt-2 text-3xl font-bold">{report.ai_confidence ?? 0}%</p><p className="text-sm text-white/50">{report.confidence_label || 'Unknown'}</p></div>
            <div className="glass rounded-2xl p-5"><p className="text-xs uppercase text-white/40">Recommendation</p><p className="mt-2 text-2xl font-bold text-teal-400">{report.recommendation || 'Insufficient Data'}</p></div>
          </div>
        </section>

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold">Verified Property Facts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {verifiedFacts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-white/40">{label}</p>
                <p className="mt-1 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-white/40">Evidence records attached: {evidence.length}</p>
        </section>

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold">Financial Scenarios</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs uppercase text-white/40">Gross Rental Yield</p><p className="mt-1 text-xl font-semibold">{report.rental_yield_percent === null ? 'Not available — verified rent required' : `${report.rental_yield_percent}%`}</p></div>
            <div><p className="text-xs uppercase text-white/40">BondMatch Monthly Payment</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_monthly_payment_cents)}</p></div>
            <div><p className="text-xs uppercase text-white/40">BondMatch Loan Amount</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_loan_amount_cents)}</p></div>
            <div><p className="text-xs uppercase text-white/40">Risk</p><p className="mt-1 text-xl font-semibold">{report.risk_level || 'Unrated'}</p></div>
          </div>
        </section>

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold">What EiX Could Not Verify</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/60">{limitations.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul>
          {assumptions.length > 0 && <><h3 className="mt-6 text-sm font-semibold">Scenario assumptions</h3><ul className="mt-3 space-y-2 text-sm text-white/60">{assumptions.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></>}
        </section>

        <p className="mt-8 pb-8 text-center text-xs text-white/30">EiX Property Score™ · Evidence-first analysis · Generated {report.processed_at ? new Date(report.processed_at).toLocaleString('en-ZA') : 'recently'}</p>
      </div>
    </main>
  );
}
