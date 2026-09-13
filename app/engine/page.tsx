'use client';

import { useState } from 'react';

interface Analysis {
  score: number; confidence: number; verdict: string;
  property: { title?: string; address?: string; price?: number; bedrooms?: number; bathrooms?: number; floorAreaM2?: number };
  price: { asking?: number; low?: number; high?: number; signal: string };
  components: { label: string; score: number; confidence: number; rationale: string }[];
  nextActions: string[];
  negotiation?: { opening?: number; target?: number; maximum?: number };
}
const money = (n?: number) => n == null ? '—' : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

export default function EnginePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  async function analyse() {
    setLoading(true); setError(''); setAnalysis(null);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Analysis failed.');
      setAnalysis(data.analysis);
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed.'); }
    finally { setLoading(false); }
  }
  return <main className="min-h-screen bg-[#07110f] px-5 py-10 text-white"><div className="mx-auto max-w-6xl">
    <div className="mb-10"><p className="text-xs font-semibold uppercase tracking-[.3em] text-teal-400">EiX Property Engine™</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Any property. One decision engine.</h1><p className="mt-3 max-w-2xl text-white/50">Ingestion → Property Identity → Evidence Graph → Analysis → Decision → Price → Negotiation → Action.</p></div>
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><label className="text-xs uppercase tracking-widest text-white/40">Property URL</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.property24.com/..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-teal-400"/><button onClick={analyse} disabled={!url || loading} className="rounded-xl bg-teal-400 px-6 py-3 text-sm font-bold text-black disabled:opacity-40">{loading ? 'Analysing…' : 'Analyse property'}</button></div>{error && <p className="mt-3 text-sm text-red-300">{error}</p>}</div>
    {analysis && <div className="mt-8 space-y-6">
      <div className="grid gap-5 md:grid-cols-[1fr_1fr_1fr]"><div className="rounded-2xl border border-teal-400/20 bg-teal-400/[.05] p-6"><p className="text-xs uppercase tracking-widest text-teal-300">EiX Score</p><p className="mt-2 text-6xl font-bold">{analysis.score}</p><p className="mt-2 text-sm text-white/50">Confidence {analysis.confidence}%</p></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><p className="text-xs uppercase tracking-widest text-white/40">Verdict</p><p className="mt-4 text-3xl font-bold text-teal-300">{analysis.verdict}</p><p className="mt-2 text-sm text-white/40">Decision is evidence-dependent.</p></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><p className="text-xs uppercase tracking-widest text-white/40">Price signal</p><p className="mt-4 text-2xl font-bold">{analysis.price.signal}</p><p className="mt-2 text-sm text-white/50">EiX range {money(analysis.price.low)} — {money(analysis.price.high)}</p></div></div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="text-lg font-semibold">Score components</h2><div className="mt-5 space-y-4">{analysis.components.map(c => <div key={c.label}><div className="flex justify-between text-sm"><span>{c.label}</span><span className="text-teal-300">{c.score}</span></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-teal-400" style={{width: `${c.score}%`}} /></div><p className="mt-1 text-xs text-white/35">{c.rationale} Confidence {Math.round(c.confidence * 100)}%.</p></div>)}</div></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="text-lg font-semibold">Negotiation intelligence</h2><div className="mt-5 space-y-3 text-sm">{analysis.negotiation ? <><div className="flex justify-between"><span className="text-white/40">Opening</span><b>{money(analysis.negotiation.opening)}</b></div><div className="flex justify-between"><span className="text-white/40">Target</span><b>{money(analysis.negotiation.target)}</b></div><div className="flex justify-between"><span className="text-white/40">Maximum</span><b>{money(analysis.negotiation.maximum)}</b></div></> : <p className="text-white/40">Insufficient evidence for a negotiation range.</p>}</div><h3 className="mt-8 text-sm font-semibold">Next actions</h3><ul className="mt-3 space-y-2 text-sm text-white/55">{analysis.nextActions.map(a => <li key={a}>• {a}</li>)}</ul></div></div>
    </div>}
  </div></main>;
}
