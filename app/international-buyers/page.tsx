import Link from 'next/link';
import { ArrowRight, Check, Globe2, ShieldCheck, Sparkles } from 'lucide-react';

const focusAreas = [
  ['Property evidence', 'What the listing supports, what is calculated, and what still needs verification.'],
  ['Local market context', 'Price position, property context and available evidence around the location.'],
  ['Lifestyle fit', 'Golf, schools, healthcare, airports, beaches, Winelands and other location factors.'],
  ['International buyer view', 'A buyer-oriented lens for overseas purchasers considering South African property.'],
  ['Risk & due diligence', 'Questions and unknowns to resolve before committing capital.'],
  ['Confidence', 'Clear separation between verified evidence, estimates and missing information.'],
];

export default function InternationalBuyersPage() {
  return (
    <main className="min-h-screen bg-[#F7F4EE] text-[#20231F]">
      <nav className="border-b border-[#2A2D27]/10 bg-[#F7F4EE]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" aria-label="EiXPropScore home">
            <img src="/images/eix-property-score-logo.svg" alt="EiXPropScore" className="h-12 w-auto" />
          </Link>
          <Link href="/#form" className="rounded-full bg-[#0E847B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#08756D]">
            Score a Property
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-[#2A2D27]/10">
        <div className="absolute -right-48 -top-48 h-[620px] w-[620px] rounded-full bg-[#DDEFEA] blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0E847B] ring-1 ring-[#2A2D27]/10">
              <Globe2 className="h-4 w-4" /> International Buyer Intelligence
            </div>
            <h1 className="mt-7 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.2rem]">
              Buying South African property from overseas?
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#3E413B] sm:text-xl">
              Understand the property, market, location and risks before committing capital — even when you are making the decision from another country.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/#form" className="group inline-flex items-center gap-2 rounded-xl bg-[#0E847B] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(14,132,123,.18)] hover:bg-[#08756D]">
                Analyse a Property — R1,495 equivalent <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/" className="inline-flex items-center rounded-xl border border-[#2A2D27]/10 bg-white px-6 py-4 text-sm font-semibold hover:bg-[#FCFAF6]">
                Explore EiXPropScore™
              </Link>
            </div>
            <div className="mt-6 rounded-2xl bg-white/80 p-5 ring-1 ring-[#2A2D27]/8 sm:max-w-xl">
              <p className="text-2xl font-bold tracking-tight">R1,495 equivalent</p>
              <p className="mt-1 text-sm leading-6 text-[#5F625B]">One property · International Buyer Intelligence · priced in ZAR, with your payment provider handling local-currency conversion where supported.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">Evidence before opinion</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The local intelligence layer your overseas decision needs.</h2>
            <p className="mt-5 leading-7 text-[#3E413B]">
              A listing can show you the house. It cannot, by itself, tell you whether the price makes sense, how the location fits your life, or which questions you should resolve before buying.
            </p>
            <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white p-5 ring-1 ring-[#2A2D27]/8">
              <ShieldCheck className="h-6 w-6 shrink-0 text-[#0E847B]" />
              <p className="text-sm leading-6 text-[#3E413B]">EiXPropScore™ separates evidence, calculations, assumptions and unknowns instead of presenting an unexplained black-box answer.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {focusAreas.map(([title, desc]) => (
              <div key={title} className="rounded-2xl bg-[#FFFDF8] p-6 ring-1 ring-[#2A2D27]/8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F7F5] text-[#0E847B]"><Check className="h-5 w-5" /></div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#3E413B]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#2A2D27]/8 bg-[#ECE7DC]/45">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-[1fr_.7fr] lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">Why R1,495?</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">One property. One international buyer intelligence report.</h2>
            <p className="mt-5 max-w-2xl leading-7 text-[#3E413B]">The International Buyer Intelligence report is deliberately focused: submit one property, get one evidence-based decision report, and see exactly what the evidence supports — and what still needs independent verification.</p>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-[#2A2D27]/10 bg-[#20231F] p-7 text-white shadow-[0_28px_80px_rgba(42,45,39,.16)] sm:p-8">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#11A397]/15 blur-3xl"></div>
            <div className="relative">
              <span className="inline-flex rounded-full bg-[#75D0C7]/10 px-3 py-1.5 text-xs font-semibold text-[#75D0C7] ring-1 ring-[#75D0C7]/20">International Buyer Intelligence</span>
              <div className="mt-6 flex items-baseline gap-2"><span className="text-5xl font-bold tracking-tight">R1,495</span><span className="text-sm text-white/50">equivalent</span></div>
              <p className="mt-2 text-sm text-white/60">One property · Delivered within 24 hours</p>
              <div className="my-7 h-px bg-white/10"></div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15"><Check className="h-3 w-3 text-[#75D0C7]" /></span>Property & market intelligence</li>
                <li className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15"><Check className="h-3 w-3 text-[#75D0C7]" /></span>Acquisition cost snapshot</li>
                <li className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15"><Check className="h-3 w-3 text-[#75D0C7]" /></span>Lifestyle indicators</li>
                <li className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15"><Check className="h-3 w-3 text-[#75D0C7]" /></span>Evidence gaps & confidence</li>
                <li className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15"><Check className="h-3 w-3 text-[#75D0C7]" /></span>International buyer due diligence</li>
                <li className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15"><Check className="h-3 w-3 text-[#75D0C7]" /></span>24-hour delivery</li>
              </ul>
              <div className="my-7 h-px bg-white/10"></div>
              <p className="text-xs leading-5 text-white/45">Canonical price is R1,495 in ZAR. Your payment provider may display the converted amount in your local currency.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#2A2D27]/8 bg-[#F7F4EE]">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="flex flex-col gap-5 rounded-[2rem] bg-[#FFFDF8] p-7 ring-1 ring-[#2A2D27]/8 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Sparkles className="mt-1 h-6 w-6 shrink-0 text-[#0E847B]" />
              <div><p className="font-semibold">Ready to analyse a South African property from overseas?</p><p className="mt-1 text-sm leading-6 text-[#3E413B]">Submit one property and receive the International Buyer Intelligence report within 24 hours.</p></div>
            </div>
            <Link href="/#form" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0E847B] px-6 py-4 text-sm font-semibold text-white hover:bg-[#08756D]">Analyse a Property — R1,495 equivalent <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2A2D27]/8 bg-[#F7F4EE]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 sm:px-10 sm:flex-row sm:items-center sm:justify-between"><img src="/images/eix-property-score-logo.svg" alt="EiXPropScore" className="h-10 w-auto" /><p className="text-xs text-[#4F524C]">EiXPropScore™ — Evidence-based property decision intelligence for South Africa.</p></div></footer>
    </main>
  );
}
