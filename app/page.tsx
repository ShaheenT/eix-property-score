'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, ArrowRight, Check, Zap, Building2, FileSearch, Target, BarChart3, MessageCircle, Scale, WalletCards } from 'lucide-react';
import { LeadForm } from '@/components/lead-form';
import { PricingCard } from '@/components/pricing-card';
import { SamplePropertyReport } from '@/components/sample-property-report';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="absolute right-0 top-[40%] h-[400px] w-[400px] rounded-full bg-teal-400/5 blur-[100px]" />
        <div className="absolute left-0 bottom-0 h-[300px] w-[500px] rounded-full bg-midnight-100/30 blur-[100px]" />
      </div>

      <nav className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <img src="/eixpropscorelogo.png" alt="EiX Property Score" className="h-14 w-auto object-contain sm:h-16" />
        <div className="hidden items-center gap-7 sm:flex">
          <a href="#how" className="text-sm text-white/60 transition-colors hover:text-white">How it works</a>
          <a href="#report" className="text-sm text-white/60 transition-colors hover:text-white">Example report</a>
          <a href="#pricing" className="text-sm text-white/60 transition-colors hover:text-white">Pricing</a>
          <a href="/admin/login" title="Admin" aria-label="Admin" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition-all hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-400"><ShieldAlert className="h-4 w-4" /></a>
        </div>
        <span className="hidden rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400 ring-1 ring-teal-500/20 sm:inline-flex">Founding Beta</span>
      </nav>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 sm:pt-20 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-white/70 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" /></span>
              South African Property Decision Intelligence
            </div>

            <h1 className={`mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
              Before you spend millions, <span className="text-gradient-teal">know what the property is really telling you.</span>
            </h1>

            <p className={`mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
              Paste a South African property listing or address. EiX turns available property facts, acquisition costs, market evidence and risk signals into one transparent decision report — without pretending to know what cannot be verified.
            </p>

            <div className={`mt-8 flex flex-wrap items-center gap-4 ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
              <a href="#form" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-3.5 text-sm font-semibold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(14,165,164,0.5)] hover:brightness-110">
                Know Before You Buy — R149 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#report" className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5">See a real example</a>
            </div>

            <div className={`mt-9 grid max-w-xl grid-cols-3 gap-3 ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
              {[
                ['R149', 'one property'],
                ['24 hrs', 'report delivery'],
                ['Evidence', 'before opinion'],
              ].map(([value, label]) => <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3"><div className="text-sm font-semibold text-white">{value}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{label}</div></div>)}
            </div>
          </div>

          <div id="score" className={`relative ${mounted ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <div className="glass-strong relative overflow-hidden rounded-[2rem] p-7 sm:p-9">
              <div className="absolute left-1/2 top-0 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
              <div className="text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-teal-400/70">EiX Property Score™</span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Evidence before opinion.</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/40">AI can sound certain and still be wrong. EiX separates what is verified, calculated, evidenced and unknown.</p>
              </div>
              <div className="mt-8 space-y-3">
                {[
                  ['Property facts', 'What the listing supports', 'Verified'],
                  ['Acquisition costs', 'Deposit, duty and financing', 'Calculated'],
                  ['Market evidence', 'Comparable and market signals', 'Evidence-based'],
                  ['Unknowns', 'What still needs confirmation', 'Clearly stated'],
                ].map(([title, desc, status]) => <div key={title} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4"><div><p className="text-sm font-medium text-white/80">{title}</p><p className="mt-1 text-xs text-white/35">{desc}</p></div><span className="text-xs font-semibold text-teal-400">{status}</span></div>)}
              </div>
              <div className="mt-7 border-t border-white/[0.06] pt-5 text-center"><p className="text-sm leading-relaxed text-white/40">When evidence isn't available, <span className="font-medium text-white/75">EiX tells you.</span></p></div>
            </div>
            <div className="absolute -right-3 -top-3 hidden rounded-xl glass-teal px-3 py-2 text-xs font-semibold text-teal-400 sm:block animate-float"><div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Evidence First</div></div>
          </div>
        </div>
      </section>

      <section id="report" className="relative z-10 mx-auto mt-28 max-w-7xl px-6 lg:mt-36">
        <div className="grid items-center gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">See what you actually receive</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Not just an AI answer. A property decision record.</h2>
            <p className="mt-5 text-white/50">Before paying R149, you should know exactly what the output looks like. Every report is designed to show the reasoning behind the score — not hide it behind a number.</p>
            <div className="mt-7 space-y-4">
              {[
                [Check, 'Verified facts', 'What the listing or available evidence supports.'],
                [Scale, 'Calculated scenarios', 'Acquisition costs, financing assumptions, yield and cash flow.'],
                [ShieldAlert, 'Risk flags', 'What could materially change the decision.'],
                [MessageCircle, 'Actionable verdict', 'BUY, PROCEED WITH CAUTION, NEGOTIATE or WALK AWAY — with reasons.'],
              ].map(([Icon, title, desc]) => <div key={title as string} className="flex gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400"><Icon className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-white">{title as string}</p><p className="mt-1 text-xs leading-relaxed text-white/40">{desc as string}</p></div></div>)}
            </div>
          </div>
          <SamplePropertyReport />
        </div>
      </section>

      <section id="how" className="relative z-10 mx-auto mt-32 max-w-7xl px-6">
        <div className="text-center"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">How it works</span><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">From property listing to decision</h2><p className="mx-auto mt-4 max-w-2xl text-white/50">EiX does not ask you to trust a black-box score. It builds the score from the evidence available for the property.</p></div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { icon: <FileSearch className="h-6 w-6" />, title: '1. Give us the property', desc: 'Paste a Property24, Private Property, agency or Facebook listing — or enter the address.' },
            { icon: <BarChart3 className="h-6 w-6" />, title: '2. We analyse the evidence', desc: 'EiX extracts facts, calculates acquisition scenarios and evaluates available market and risk evidence.' },
            { icon: <Target className="h-6 w-6" />, title: '3. Make the decision', desc: 'Receive the score, confidence level, financial picture, risks, unknowns and a clear next-step verdict.' },
          ].map((step) => <div key={step.title} className="group glass relative rounded-2xl p-7 transition-all duration-300 hover:border-teal-500/20 hover:bg-white/[0.04]"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">{step.icon}</div><h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/50">{step.desc}</p></div>)}
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto mt-32 max-w-7xl px-6">
        <div className="text-center"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">The EiX difference</span><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">What makes the score trustworthy</h2></div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <BarChart3 className="h-5 w-5" />, title: 'Investment Score™', desc: 'A transparent score built from the property facts and evidence available.' },
            { icon: <FileSearch className="h-5 w-5" />, title: 'Verified Property Facts', desc: 'Uncertain or missing information is clearly identified instead of invented.' },
            { icon: <WalletCards className="h-5 w-5" />, title: 'Acquisition Intelligence', desc: 'Deposit, transfer duty, financing assumptions and estimated acquisition cost.' },
            { icon: <ShieldAlert className="h-5 w-5" />, title: 'Transparent Risk Review', desc: 'Evidence-supported risks plus the unknowns you still need to investigate.' },
          ].map((feature) => <div key={feature.title} className="group glass rounded-2xl p-6 transition-all duration-300 hover:border-teal-500/20 hover:bg-white/[0.04]"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">{feature.icon}</div><h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/50">{feature.desc}</p></div>)}
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-28 max-w-4xl px-6">
        <div className="glass rounded-3xl p-7 text-center sm:p-10">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">Why R149?</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Before you spend millions, spend R149 understanding the decision.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/50">Property decisions involve real money. EiX is designed as an affordable evidence-based second opinion before you commit to a viewing, offer or investment thesis.</p>
          <a href="#form" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-3.5 text-sm font-semibold text-midnight-900 transition-all hover:brightness-110">Analyse My Property — R149 <ArrowRight className="h-4 w-4" /></a>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto mt-32 max-w-5xl px-6">
        <div className="text-center"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">Founding Beta Pricing</span><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">One property. One decision report. R149.</h2><p className="mx-auto mt-4 max-w-xl text-white/50">Founding Beta pricing while we build the full EiX Property Intelligence platform.</p></div>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2"><PricingCard /><div id="form"><LeadForm /></div></div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-4xl px-6">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-xs leading-relaxed text-white/35"><strong className="text-white/55">Important:</strong> EiX Property Score™ is a decision-support tool, not a substitute for a professional property inspection, conveyancer, attorney, bank valuation, financial adviser or other professional due diligence. Scores and estimates depend on the evidence available and the assumptions used.</div>
      </section>

      <footer className="relative z-10 mt-32 border-t border-white/5 bg-midnight-600/50 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row"><div className="flex items-center gap-3"><img src="/eixpropscorelogo.png" alt="EiX Property Score" className="h-12 w-auto object-contain" /><span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-400 ring-1 ring-teal-500/20">Founding Beta</span></div><p className="text-xs text-white/30">Evidence-based property decision intelligence for South Africa. © 2026 EiX. All rights reserved.</p></div>
      </footer>
      <Toaster />
    </main>
  );
}
