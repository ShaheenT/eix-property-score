'use client';

import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Check,
  Zap,
  Building2,
  FileSearch,
  Target,
  BarChart3,
} from 'lucide-react';
import { LeadForm } from '@/components/lead-form';
import { PricingCard } from '@/components/pricing-card';
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
        <div className="flex items-center gap-2.5">
          <img
            src="/eixpropscorelogo.png"
            alt="EiX Property Score"
            className="h-14 w-auto object-contain sm:h-16"
          />
        </div>
        <div className="hidden items-center gap-7 sm:flex">
          <a href="#how" className="text-sm text-white/60 transition-colors hover:text-white">How it works</a>
          <a href="#score" className="text-sm text-white/60 transition-colors hover:text-white">AI Score</a>
          <a href="#pricing" className="text-sm text-white/60 transition-colors hover:text-white">Pricing</a>
          <a href="/admin/login" title="Admin" aria-label="Admin" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition-all hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-400" ><ShieldAlert className="h-4 w-4" /></a>
        </div>
        <span className="hidden rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400 ring-1 ring-teal-500/20 sm:inline-flex">
          Beta
        </span>
      </nav>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 sm:pt-20 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-white/70 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
              </span>
              AI Property Score · South African Market
            </div>

            <h1 className={`mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
              Avoid a R200,000 property mistake.{' '}
              <span className="text-gradient-teal">Know if it&apos;s worth buying</span> in under 24 hours.
            </h1>

            <p className={`mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
              Paste any South African property listing. Get AI-powered
              investment analysis with verified property facts, acquisition costs,
              risks and market evidence — without making up the numbers.
            </p>

            <div className={`mt-8 flex flex-wrap items-center gap-4 ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
              <a href="#form" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-3.5 text-sm font-semibold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(14,165,164,0.5)] hover:brightness-110">
                Get My Property Score — R149
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#how" className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5">
                See how it works
              </a>
            </div>

            <div className={`mt-10 flex flex-wrap items-center gap-6 ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
              {['Property24', 'Private Property', 'Facebook', 'Agency Sites', 'Address Only'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                  <Check className="h-3.5 w-3.5 text-teal-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div id="score" className={`relative ${mounted ? 'animate-scale-in' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <div className="glass-strong relative overflow-hidden rounded-[2rem] p-8 sm:p-10">
              <div className="absolute left-1/2 top-0 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />

              <div className="text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-teal-400/70">
                  EiX Property Score™
                </span>

                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Evidence before opinion.
                </h2>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/40">
                  Every report separates verified facts, calculated figures,
                  available evidence and what remains unknown.
                </p>
              </div>

              <div className="mt-10 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white/80">Property facts</p>
                    <p className="mt-1 text-xs text-white/35">What the listing supports</p>
                  </div>
                  <span className="text-xs font-semibold text-teal-400">Verified</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white/80">Acquisition costs</p>
                    <p className="mt-1 text-xs text-white/35">Deposit, duty and financing</p>
                  </div>
                  <span className="text-xs font-semibold text-teal-400">Calculated</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white/80">Market evidence</p>
                    <p className="mt-1 text-xs text-white/35">Used where available</p>
                  </div>
                  <span className="text-xs font-semibold text-white/50">Evidence-based</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white/80">Unknowns</p>
                    <p className="mt-1 text-xs text-white/35">Never hidden from you</p>
                  </div>
                  <span className="text-xs font-semibold text-white/50">Clearly stated</span>
                </div>
              </div>

              <div className="mt-8 border-t border-white/[0.06] pt-6 text-center">
                <p className="text-sm leading-relaxed text-white/40">
                  When the evidence isn&apos;t available,{' '}
                  <span className="font-medium text-white/75">EiX Property Score™</span>{' '}
                  tells you.
                </p>
              </div>
            </div>

            <div className="absolute -right-3 -top-3 hidden rounded-xl glass-teal px-3 py-2 text-xs font-semibold text-teal-400 sm:block animate-float">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Evidence First
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="relative z-10 mx-auto mt-32 max-w-7xl px-6">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">How it works</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three steps to your AI Property Score
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            Paste a listing. EiX Property Score™ verifies what it can, calculates what it can, and clearly identifies what it cannot verify.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { icon: <FileSearch className="h-6 w-6" />, title: 'Paste the property', desc: 'Use a South African property listing or enter the address directly.' },
            { icon: <BarChart3 className="h-6 w-6" />, title: 'We analyse the evidence', desc: 'EiX Property Score™ extracts property facts, calculates acquisition costs, and evaluates available market evidence.' },
            { icon: <Target className="h-6 w-6" />, title: 'Make the decision', desc: 'Receive a clear Investment Score, acquisition scenario, risks, and a record of what could and could not be verified.' },
          ].map((step, i) => (
            <div key={step.title} className="group glass relative rounded-2xl p-7 transition-all duration-300 hover:border-teal-500/20 hover:bg-white/[0.04]">
              <div className="absolute right-5 top-5 text-5xl font-bold text-white/5">0{i + 1}</div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
                {step.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto mt-32 max-w-7xl px-6">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">The evidence behind the decision</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to make a better-informed decision
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <BarChart3 className="h-5 w-5" />, title: 'Investment Score™', desc: 'A clear score built from the property facts and evidence available for the analysis.' },
            { icon: <FileSearch className="h-5 w-5" />, title: 'Verified Property Facts', desc: 'See the property details EiX could verify, with uncertain or missing information clearly identified.' },
            { icon: <Building2 className="h-5 w-5" />, title: 'Acquisition Intelligence', desc: 'Understand deposit, transfer duty, financing assumptions, and the estimated cost of acquiring the property.' },
            { icon: <ShieldAlert className="h-5 w-5" />, title: 'Transparent Risk Review', desc: 'Understand the risks EiX can support with evidence—and exactly where the available evidence is limited.' },
          ].map((feature) => (
            <div key={feature.title} className="group glass rounded-2xl p-6 transition-all duration-300 hover:border-teal-500/20 hover:bg-white/[0.04]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto mt-32 max-w-5xl px-6">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">Founding Beta Pricing</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            One property. One score. R149.
          </h2>
        </div>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
          <PricingCard />
          <div id="form">
            <LeadForm />
          </div>
        </div>
      </section>

      <footer className="relative z-10 mt-32 border-t border-white/5 bg-midnight-600/50 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <img
              src="/eixpropscorelogo.png"
              alt="EiX Property Score"
              className="h-12 w-auto object-contain"
            />
            <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-400 ring-1 ring-teal-500/20">Beta</span>
          </div>
          <p className="text-xs text-white/30">
            AI-powered property investment analysis for South Africa. © 2026 EiX. All rights reserved.
          </p>
        </div>
      </footer>

      <Toaster />
    </main>
  );
}
