'use client';

import { useEffect, useState } from 'react';
import {
  Home as HomeIcon,
  TrendingUp,
  Percent,
  ShieldAlert,
  ArrowRight,
  Check,
  Zap,
  Building2,
  FileSearch,
  Target,
  BarChart3,
} from 'lucide-react';
import { ScoreGauge } from '@/components/score-gauge';
import { MetricCard } from '@/components/metric-card';
import { LeadForm } from '@/components/lead-form';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight">
      {/* Background layers */}
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute right-0 top-[40%] h-[400px] w-[400px] rounded-full bg-emerald-400/5 blur-[100px]" />
        <div className="absolute left-0 bottom-0 h-[300px] w-[500px] rounded-full bg-midnight-100/30 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 shadow-[0_0_20px_rgba(0,196,140,0.3)]">
            <Building2 className="h-5 w-5 text-midnight-900" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            EiX<span className="text-emerald-400"> Property Score</span>
            <sup className="ml-0.5 text-[10px] text-emerald-400/70">™</sup>
          </span>
        </div>
        <div className="hidden items-center gap-7 sm:flex">
          <a href="#how" className="text-sm text-white/60 transition-colors hover:text-white">
            How it works
          </a>
          <a href="#score" className="text-sm text-white/60 transition-colors hover:text-white">
            AI Score
          </a>
          <a href="#features" className="text-sm text-white/60 transition-colors hover:text-white">
            Features
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 sm:inline-flex">
            Beta
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 sm:pt-20 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left column */}
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-white/70 ${
                mounted ? 'animate-fade-in' : 'opacity-0'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Powered by AI · South African Property Market
            </div>

            <h1
              className={`mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl ${
                mounted ? 'animate-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '0.1s' }}
            >
              Know if a property is{' '}
              <span className="text-gradient-emerald">worth buying</span> before
              you make an offer.
            </h1>

            <p
              className={`mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg ${
                mounted ? 'animate-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '0.2s' }}
            >
              Paste any South African Property24 or Private Property listing and
              receive an AI Investment Score™, Rental Yield Estimate, BondMatch™
              scenario and Risk Assessment.
            </p>

            <div
              className={`mt-8 flex flex-wrap items-center gap-4 ${
                mounted ? 'animate-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '0.3s' }}
            >
              <a
                href="#form"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3.5 text-sm font-semibold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(0,196,140,0.5)] hover:brightness-110"
              >
                Get My Free Property Score
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
              >
                See how it works
              </a>
            </div>

            <div
              className={`mt-10 flex items-center gap-6 ${
                mounted ? 'animate-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '0.4s' }}
            >
              {['Property24', 'Private Property', 'AI-Powered'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Score gauge + metrics */}
          <div
            id="score"
            className={`relative ${
              mounted ? 'animate-scale-in' : 'opacity-0'
            }`}
            style={{ animationDelay: '0.3s' }}
          >
            <div className="glass-strong relative overflow-hidden rounded-3xl p-8 glow-emerald">
              {/* Glow ring behind gauge */}
              <div className="absolute left-1/2 top-12 -z-10 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl animate-pulse-glow" />

              <div className="flex flex-col items-center">
                <ScoreGauge score={91} size={220} />

                <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live AI Analysis · Sample Report
                </div>
              </div>

              {/* Metric cards */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                <MetricCard
                  label="Market Value"
                  value="R 2.45M"
                  trend="3.2%"
                  trendUp
                  icon={<HomeIcon className="h-5 w-5" />}
                  delay={600}
                />
                <MetricCard
                  label="Monthly Cash Flow"
                  value="R 8,420"
                  unit="/mo"
                  trend="Positive"
                  trendUp
                  icon={<TrendingUp className="h-5 w-5" />}
                  delay={700}
                />
                <MetricCard
                  label="Gross Yield"
                  value="8.9%"
                  trend="1.4%"
                  trendUp
                  icon={<Percent className="h-5 w-5" />}
                  delay={800}
                />
                <MetricCard
                  label="Risk Score"
                  value="Low"
                  trend="Safe"
                  trendUp
                  icon={<ShieldAlert className="h-5 w-5" />}
                  delay={900}
                />
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -right-3 -top-3 hidden rounded-xl glass-emerald px-3 py-2 text-xs font-semibold text-emerald-400 sm:block animate-float">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                AI Rated
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="relative z-10 mx-auto mt-32 max-w-7xl px-6"
      >
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three steps to your AI Property Score
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            No spreadsheets, no guesswork. Just paste a link and let our AI do
            the heavy lifting.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: <FileSearch className="h-6 w-6" />,
              title: 'Paste your listing',
              desc: 'Copy any Property24 or Private Property URL and paste it into the form below.',
            },
            {
              icon: <BarChart3 className="h-6 w-6" />,
              title: 'AI analyzes the deal',
              desc: 'Our engine evaluates market value, rental yield, cash flow, and risk factors in seconds.',
            },
            {
              icon: <Target className="h-6 w-6" />,
              title: 'Get your score',
              desc: 'Receive a detailed report with your Investment Score, BondMatch scenario, and risk assessment.',
            },
          ].map((step, i) => (
            <div
              key={step.title}
              className="group glass relative rounded-2xl p-7 transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04]"
            >
              <div className="absolute right-5 top-5 text-5xl font-bold text-white/5">
                0{i + 1}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                {step.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 mx-auto mt-32 max-w-7xl px-6"
      >
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            What you get
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to decide with confidence
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: 'AI Investment Score™',
              desc: 'A single 0-100 score that factors in dozens of market and property data points.',
            },
            {
              icon: <Percent className="h-5 w-5" />,
              title: 'Rental Yield Estimate',
              desc: 'Projected gross and net rental yields based on comparable area rentals.',
            },
            {
              icon: <Building2 className="h-5 w-5" />,
              title: 'BondMatch™ Scenario',
              desc: 'See your bond affordability and monthly repayment scenarios at current rates.',
            },
            {
              icon: <ShieldAlert className="h-5 w-5" />,
              title: 'Risk Assessment',
              desc: 'Area crime trends, vacancy risk, and market volatility flagged in plain language.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group glass rounded-2xl p-6 transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Form section */}
      <section
        id="form"
        className="relative z-10 mx-auto mt-32 max-w-2xl px-6 pb-32"
      >
        <div className="mb-10 text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Start now
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Get your free AI Property Score
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/50">
            Fill in the form below and receive your personalized property
            investment report within 24 hours.
          </p>
        </div>

        <LeadForm />
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-midnight-600/50 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-400">
              <Building2 className="h-4 w-4 text-midnight-900" />
            </div>
            <span className="text-sm font-semibold text-white/70">
              EiX Property Score™
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
              Beta
            </span>
          </div>
          <p className="text-xs text-white/30">
            AI-powered property investment analysis for South Africa. © 2026
            EiX. All rights reserved.
          </p>
        </div>
      </footer>

      <Toaster />
    </main>
  );
}
