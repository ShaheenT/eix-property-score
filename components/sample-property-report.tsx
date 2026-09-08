'use client';

import { AlertTriangle, CheckCircle2, CircleHelp, TrendingUp } from 'lucide-react';

export function SamplePropertyReport() {
  return (
    <div className="glass-strong relative overflow-hidden rounded-[2rem] p-5 sm:p-7">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-teal-400">Example EiX report</span>
            <h3 className="mt-2 text-lg font-semibold text-white">2-bed apartment · Cape Town</h3>
            <p className="mt-1 text-xs text-white/40">Illustrative example · not a valuation</p>
          </div>
          <div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 px-4 py-3 text-center">
            <div className="text-3xl font-bold text-white">72</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">/ 100</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Asking price', 'R1.85m'],
            ['Est. acquisition', 'R1.97m'],
            ['Est. rent', 'R14.5k / mo'],
            ['Gross yield', '9.4%'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p>
              <p className="mt-1 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70"><TrendingUp className="h-4 w-4 text-teal-400" /> Price signal</div>
            <p className="mt-2 text-xs leading-relaxed text-white/45">Asking price appears competitive against the available evidence.</p>
          </div>
          <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70"><AlertTriangle className="h-4 w-4 text-amber-300" /> Risk flags</div>
            <p className="mt-2 text-xs leading-relaxed text-white/45">Levies and rental assumptions require verification.</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70"><CircleHelp className="h-4 w-4 text-white/50" /> Confidence</div>
            <p className="mt-2 text-xs leading-relaxed text-white/45">78% · based on the evidence available for this analysis.</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-teal-400/15 bg-teal-400/[0.04] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4 text-teal-400" /> EiX decision</div>
          <p className="mt-2 text-base font-semibold text-teal-300">PROCEED WITH CAUTION</p>
          <p className="mt-2 text-xs leading-relaxed text-white/50">The available evidence supports a closer look, but key costs and rental assumptions should be confirmed before making an offer.</p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-[11px] text-white/35">
          <span>Verified facts · Calculated figures · Evidence · Unknowns</span>
          <span className="font-medium text-teal-400">Evidence before opinion.</span>
        </div>
      </div>
    </div>
  );
}
