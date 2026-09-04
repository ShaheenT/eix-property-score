'use client';

import { useEffect, useState } from 'react';
import { Building2, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfidenceMeter } from '@/components/confidence-meter';

interface DashboardRow {
  id: string;
  created_at: string;
  status: string;
  goal: string;
  source_platform: string | null;
  customer: { name: string; email: string; whatsapp: string | null } | null;
  payments: { amount_cents: number; product: string; status: string }[] | null;
  reports: { status: string; report_type: string; investment_score: number | null; ai_confidence: number | null }[] | null;
}

const STATUS_STYLES: Record<string, string> = {
  awaiting_payment: 'bg-gold-500/10 text-gold-400 ring-gold-500/20',
  paid: 'bg-teal-500/10 text-teal-400 ring-teal-500/20',
  report_sent: 'bg-electric-500/10 text-electric-400 ring-electric-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Awaiting Payment',
  paid: 'Paid',
  report_sent: 'Report Sent',
};

function formatCurrency(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardPage() {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from('property_submissions')
          .select(
            'id, created_at, status, goal, source_platform, customer:customers(name, email, whatsapp), payments(amount_cents, product, status), reports(status, report_type, investment_score, ai_confidence)'
          )
          .order('created_at', { ascending: false })
          .limit(50);

        if (err) throw err;
        setRows((data as unknown as DashboardRow[]) || []);
      } catch {
        setError('Could not load dashboard data. The database may need data or RLS policies adjusted for read access.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.customer?.name?.toLowerCase().includes(q) || r.customer?.email?.toLowerCase().includes(q);
  });

  const stats = {
    total: rows.length,
    paid: rows.filter((r) => r.status === 'paid' || r.status === 'report_sent').length,
    reportSent: rows.filter((r) => r.status === 'report_sent').length,
    awaiting: rows.filter((r) => r.status === 'awaiting_payment').length,
    revenue: rows.reduce((sum, r) => {
      const paid = r.payments?.filter((p) => p.status === 'completed');
      return sum + (paid?.reduce((s, p) => s + p.amount_cents, 0) || 0);
    }, 0),
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-400">
            <Building2 className="h-5 w-5 text-midnight-900" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            EiX<span className="text-teal-400"> Dashboard</span>
          </span>
        </div>
        <a href="/" className="text-sm text-white/60 transition-colors hover:text-white">Back to site</a>
      </nav>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-white">Founder Dashboard</h1>
        <p className="mt-2 text-sm text-white/50">Operational view of all property submissions, payments, and reports.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Submissions', value: stats.total, color: 'text-white' },
            { label: 'Paid', value: stats.paid, color: 'text-teal-400' },
            { label: 'Reports Sent', value: stats.reportSent, color: 'text-electric-400' },
            { label: 'Revenue', value: formatCurrency(stats.revenue), color: 'text-gold-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-white/40">{stat.label}</div>
              <div className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl glass">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            </div>
          ) : error ? (
            <div className="px-6 py-20 text-center text-sm text-white/50">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-20 text-center text-sm text-white/50">
              No submissions yet. Once customers submit properties, they will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Report</th>
                    <th className="px-4 py-3 font-medium">AI Confidence</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const payment = row.payments?.[0];
                    const report = row.reports?.[0];
                    return (
                      <tr key={row.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{row.customer?.name || 'Unknown'}</div>
                          <div className="text-xs text-white/40">{row.customer?.email}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLES[row.status] || 'bg-white/5 text-white/60 ring-white/10'}`}>
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {payment ? (
                            <div>
                              <div className="text-white/80">{formatCurrency(payment.amount_cents)}</div>
                              <div className="text-xs text-white/40 capitalize">{payment.product.replace(/_/g, ' ')} · {payment.status}</div>
                            </div>
                          ) : <span className="text-white/30">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          {report ? (
                            <div>
                              <div className="text-white/80 capitalize">{report.report_type}</div>
                              <div className="text-xs text-white/40">{report.status}</div>
                            </div>
                          ) : <span className="text-white/30">—</span>}
                        </td>
                        <td className="px-4 py-4 w-32">
                          {report?.ai_confidence != null ? (
                            <ConfidenceMeter value={report.ai_confidence} size="sm" />
                          ) : <span className="text-white/30">—</span>}
                        </td>
                        <td className="px-4 py-4 text-xs text-white/50">{formatDate(row.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
