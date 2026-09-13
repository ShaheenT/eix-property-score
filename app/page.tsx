'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Check, FileSearch, MessageCircle, Scale, ShieldCheck, Target, WalletCards } from 'lucide-react';
import { LeadForm } from '@/components/lead-form';
import { PricingCard } from '@/components/pricing-card';
import { SamplePropertyReport } from '@/components/sample-property-report';
import { Toaster } from '@/components/ui/toaster';

const evidenceRows = [
  ['Property facts', 'What the listing supports', 'Verified'],
  ['Acquisition costs', 'Deposit, duty and financing', 'Calculated'],
  ['Market evidence', 'Comparable and market signals', 'Evidence-based'],
  ['Unknowns', 'What still needs confirmation', 'Clearly stated'],
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F4EE] text-[#20231F]">
      <nav className="sticky top-0 z-50 border-b border-[#2A2D27]/10 bg-[#F7F4EE]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <a href="#top" aria-label="EiX Property Score home" className="shrink-0">
            <img src="/eixpropscorelogo.png" alt="EiX Property Score" className="h-12 w-auto object-contain sm:h-14" />
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm text-[#5F625B] transition-colors hover:text-[#20231F]">How it works</a>
            <a href="#report" className="text-sm text-[#5F625B] transition-colors hover:text-[#20231F]">Example report</a>
            <a href="#pricing" className="text-sm text-[#5F625B] transition-colors hover:text-[#20231F]">Pricing</a>
            <a href="#form" className="rounded-full bg-[#0E847B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#08756D]">Score a Property</a>
          </div>
          <span className="rounded-full bg-[#E8F7F5] px-3 py-1.5 text-xs font-semibold text-[#0E847B] ring-1 ring-[#0E847B]/15">Founding Beta</span>
        </div>
      </nav>

      <section id="top" className="relative overflow-hidden border-b border-[#2A2D27]/10 bg-[#F7F4EE]">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#DDEFEA] blur-3xl" />
        <div className="absolute -left-48 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-[#EEE5D6] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[1.02fr_.98fr] lg:py-28">
          <div className={mounted ? 'animate-fade-up' : 'opacity-0'}>
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0E847B] shadow-sm ring-1 ring-[#2A2D27]/10">South African Property Decision Intelligence</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.06] tracking-tight text-[#20231F] sm:text-5xl lg:text-[4.25rem]">
              Know the property before you make the decision.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#5F625B] sm:text-lg">
              Paste a South African property listing or address. EiX turns available property facts, acquisition costs, market evidence and risk signals into one transparent decision report — without pretending to know what cannot be verified.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#form" className="group inline-flex items-center gap-2 rounded-xl bg-[#0E847B] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(14,132,123,.18)] transition hover:bg-[#08756D]">
                Know Before You Buy — R149 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#report" className="inline-flex items-center rounded-xl border border-[#2A2D27]/10 bg-white px-6 py-4 text-sm font-semibold text-[#30332E] transition hover:bg-[#FCFAF6]">See a real example</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs text-[#5F625B]">
              {['Property24', 'Private Property', 'Agency listings', 'Address search'].map((item) => <span key={item} className="rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[#2A2D27]/8">{item}</span>)}
            </div>
          </div>

          <div className={mounted ? 'animate-scale-in' : 'opacity-0'} style={{ animationDelay: '120ms' }}>
            <div className="relative overflow-hidden rounded-[2rem] border border-[#2A2D27]/10 bg-[#FFFDF8] p-5 shadow-[0_28px_80px_rgba(42,45,39,.12)] sm:p-7">
              <div className="absolute inset-x-0 top-0 h-1 bg-[#0E847B]" />
              <div className="relative h-44 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#DDEFEA] via-[#F4EFE5] to-[#E7DCC9] sm:h-52">
                <div className="absolute left-7 top-7 h-24 w-28 rounded-t-[28px] rounded-b-md bg-white/80 shadow-lg ring-1 ring-[#2A2D27]/10" />
                <div className="absolute left-10 top-12 h-12 w-20 rounded-sm bg-[#C7DDD7]" />
                <div className="absolute left-8 bottom-0 h-20 w-36 rounded-t-[18px] bg-[#EEE7DB]" />
                <div className="absolute right-8 top-10 h-28 w-40 rounded-t-[32px] bg-white/75 shadow-lg ring-1 ring-[#2A2D27]/10" />
                <div className="absolute right-12 top-16 h-14 w-32 rounded-sm bg-[#C7DDD7]" />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#B9A887]/35" />
                <div className="absolute bottom-4 left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-[#6D7669]/25 blur-sm" />
                <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-[#0E847B] shadow-sm">Example property</div>
              </div>
              <div className="px-1 pb-1 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#0E847B]">EiX Property Score™</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Evidence before opinion.</h2><p className="mt-2 text-sm text-[#6A6D66]">A decision record, not a black-box answer.</p></div>
                  <div className="rounded-2xl bg-[#E8F7F5] px-4 py-3 text-center"><div className="text-3xl font-bold">72</div><div className="text-[10px] font-semibold uppercase tracking-wider text-[#0E847B]">/ 100</div></div>
                </div>
                <div className="mt-6 space-y-2.5">
                  {evidenceRows.map(([title, desc, status]) => <div key={title} className="flex items-center justify-between rounded-xl border border-[#2A2D27]/8 bg-[#F8F5EF] px-4 py-3"><div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-[#777970]">{desc}</p></div><span className="text-xs font-semibold text-[#0E847B]">{status}</span></div>)}
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-[#2A2D27]/8 pt-4 text-xs text-[#6A6D66]"><ShieldCheck className="h-4 w-4 text-[#0E847B]" /> When evidence isn't available, EiX tells you.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#2A2D27]/8 bg-white/45">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:px-10 md:grid-cols-3">
          {[['R149', 'one property'], ['24 hrs', 'report delivery'], ['Evidence', 'before opinion']].map(([value, label]) => <div key={label} className="rounded-2xl bg-[#FFFDF8] p-5 ring-1 ring-[#2A2D27]/8"><div className="text-xl font-bold text-[#20231F]">{value}</div><div className="mt-1 text-sm text-[#6A6D66]">{label}</div></div>)}
        </div>
      </section>

      <section id="report" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">See what you actually receive</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Not just an AI answer. A property decision record.</h2><p className="mt-5 leading-7 text-[#656860]">Before paying R149, you should know exactly what the output looks like. The report is designed to show the reasoning behind the score — not hide it behind a number.</p><div className="mt-7 space-y-4">{[[Check,'Verified facts','What the listing or available evidence supports.'],[Scale,'Calculated scenarios','Acquisition costs, financing assumptions, yield and cash flow.'],[MessageCircle,'Risk flags','What could materially change the decision.'],[Target,'Actionable verdict','BUY, PROCEED WITH CAUTION, NEGOTIATE or WALK AWAY — with reasons.']].map(([Icon,title,desc]) => <div key={title as string} className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F7F5] text-[#0E847B]"><Icon className="h-4 w-4" /></div><div><p className="text-sm font-semibold">{title as string}</p><p className="mt-1 text-sm leading-6 text-[#6A6D66]">{desc as string}</p></div></div>)}</div></div>
          <SamplePropertyReport />
        </div>
      </section>

      <section id="how" className="border-y border-[#2A2D27]/8 bg-[#ECE7DC]/45">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28"><div className="text-center"><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">How it works</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From property listing to decision</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-[#666960]">EiX does not ask you to trust a black-box score. It builds the score from the evidence available for the property.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[{icon:<FileSearch className="h-6 w-6"/>,title:'1. Give us the property',desc:'Paste a Property24, Private Property, agency or Facebook listing — or enter the address.'},{icon:<BarChart3 className="h-6 w-6"/>,title:'2. We analyse the evidence',desc:'EiX extracts facts, calculates acquisition scenarios and evaluates available market and risk evidence.'},{icon:<Target className="h-6 w-6"/>,title:'3. Make the decision',desc:'Receive the score, confidence level, financial picture, risks, unknowns and a clear next-step verdict.'}].map((step)=><div key={step.title} className="rounded-2xl bg-[#FFFDF8] p-7 shadow-[0_12px_35px_rgba(42,45,39,.05)] ring-1 ring-[#2A2D27]/8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F7F5] text-[#0E847B]">{step.icon}</div><h3 className="mt-5 text-lg font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[#6A6D66]">{step.desc}</p></div>)}</div></div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28"><div className="text-center"><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">The EiX difference</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What makes the score trustworthy</h2></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[{icon:<BarChart3 className="h-5 w-5"/>,title:'Investment Score™',desc:'A transparent score built from the property facts and evidence available.'},{icon:<FileSearch className="h-5 w-5"/>,title:'Verified Property Facts',desc:'Uncertain or missing information is clearly identified instead of invented.'},{icon:<WalletCards className="h-5 w-5"/>,title:'Acquisition Intelligence',desc:'Deposit, transfer duty, financing assumptions and estimated acquisition cost.'},{icon:<ShieldCheck className="h-5 w-5"/>,title:'Transparent Risk Review',desc:'Evidence-supported risks plus the unknowns you still need to investigate.'}].map((feature)=><div key={feature.title} className="rounded-2xl bg-white/55 p-6 ring-1 ring-[#2A2D27]/8"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F7F5] text-[#0E847B]">{feature.icon}</div><h3 className="mt-4 text-base font-semibold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-[#6A6D66]">{feature.desc}</p></div>)}</div></section>

      <section className="bg-[#20231F] px-6 py-20 text-white sm:px-10 sm:py-24"><div className="mx-auto max-w-4xl text-center"><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#75D0C7]">Why R149?</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Before you spend millions, spend R149 understanding the decision.</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-white/65">An affordable evidence-based second opinion before you commit to a viewing, offer or investment thesis.</p><a href="#form" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#11A397] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#0E8E84]">Analyse My Property — R149 <ArrowRight className="h-4 w-4" /></a></div></section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28"><div className="text-center"><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">Founding Beta Pricing</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">One property. One decision report. R149.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-[#6A6D66]">Founding Beta pricing while we build the full EiX Property Intelligence platform.</p></div><div className="mt-12 grid items-start gap-8 lg:grid-cols-2"><PricingCard /><div id="form"><LeadForm /></div></div></section>

      <section className="mx-auto max-w-4xl px-6 pb-16"><div className="rounded-2xl border border-[#D8D1C4] bg-[#FFFDF8] p-6 text-xs leading-6 text-[#74776F]"><strong className="text-[#3E413B]">Important:</strong> EiX Property Score™ is a decision-support tool, not a substitute for a professional property inspection, conveyancer, attorney, bank valuation, financial adviser or other professional due diligence. Scores and estimates depend on the evidence available and the assumptions used.</div></section>

      <footer className="border-t border-[#2A2D27]/10 bg-[#EEE9DF] px-6 py-8 sm:px-10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row"><img src="/eixpropscorelogo.png" alt="EiX Property Score" className="h-11 w-auto object-contain" /><p className="text-xs text-[#73766E]">Evidence-based property decision intelligence for South Africa. © 2026 EiX. All rights reserved.</p></div></footer>
      <Toaster />
    </main>
  );
}
