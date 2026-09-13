'use client';

import { AlertTriangle, CheckCircle2, CircleHelp, TrendingUp } from 'lucide-react';

const metrics = [
  ['Asking price', 'R1.85m'],
  ['Est. acquisition', 'R1.97m'],
  ['Est. rent', 'R14.5k / mo'],
  ['Gross yield', '9.4%'],
];

export function SamplePropertyReport() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#2A2D27]/10 bg-[#FFFDF8] p-5 shadow-[0_28px_80px_rgba(42,45,39,.10)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#0E847B]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div><span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0E847B]">Example EiX report</span><h3 className="mt-2 text-lg font-semibold">2-bed apartment · Cape Town</h3><p className="mt-1 text-xs text-[#777970]">Illustrative example · not a valuation</p></div>
          <div className="rounded-2xl bg-[#E8F7F5] px-4 py-3 text-center"><div className="text-3xl font-bold">72</div><div className="text-[10px] font-semibold uppercase tracking-wider text-[#0E847B]">/ 100</div></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{metrics.map(([label,value])=><div key={label} className="rounded-xl border border-[#2A2D27]/8 bg-[#F8F5EF] p-3"><p className="text-[10px] uppercase tracking-wider text-[#777970]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#2A2D27]/8 bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold"><TrendingUp className="h-4 w-4 text-[#0E847B]" /> Price signal</div><p className="mt-2 text-xs leading-5 text-[#6A6D66]">Asking price appears competitive against the available evidence.</p></div>
          <div className="rounded-xl border border-[#F0D58A] bg-[#FFF8E1] p-4"><div className="flex items-center gap-2 text-xs font-semibold"><AlertTriangle className="h-4 w-4 text-[#A87922]" /> Risk flags</div><p className="mt-2 text-xs leading-5 text-[#6A6D66]">Levies and rental assumptions require verification.</p></div>
          <div className="rounded-xl border border-[#2A2D27]/8 bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold"><CircleHelp className="h-4 w-4 text-[#6A6D66]" /> Confidence</div><p className="mt-2 text-xs leading-5 text-[#6A6D66]">78% · based on the evidence available for this analysis.</p></div>
        </div>
        <div className="mt-5 rounded-2xl border border-[#0E847B]/15 bg-[#E8F7F5]/65 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-[#0E847B]" /> EiX decision</div><p className="mt-2 text-base font-semibold text-[#0E847B]">PROCEED WITH CAUTION</p><p className="mt-2 text-xs leading-5 text-[#5F625B]">The available evidence supports a closer look, but key costs and rental assumptions should be confirmed before making an offer.</p></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#2A2D27]/8 pt-4 text-[11px] text-[#777970]"><span>Verified facts · Calculated figures · Evidence · Unknowns</span><span className="font-medium text-[#0E847B]">Evidence before opinion.</span></div>
      </div>
    </div>
  );
}
