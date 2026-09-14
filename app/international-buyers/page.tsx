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

const lifestyleImages = [
  {
    src: 'https://unsplash.com/photos/vJmJtm7AhJE/download?force=true&w=1800',
    alt: 'Cape Winelands home surrounded by vineyards and mountains',
    title: 'A home with a sense of place',
    text: 'Cape Dutch character, contemporary architecture, gardens, space and mountain views.',
    className: 'lg:col-span-7 lg:row-span-2',
  },
  {
    src: 'https://unsplash.com/photos/b2ZNdLFDrKc/download?force=true&w=1400',
    alt: 'Franschhoek vineyard with mountains in the background',
    title: 'The landscape',
    text: 'Vineyards, valleys and the Boland mountains become part of the everyday experience.',
    className: 'lg:col-span-5',
  },
  {
    src: 'https://unsplash.com/photos/pU4bB4ftIog/download?force=true&w=1400',
    alt: 'Paarl Winelands estate road lined with cypress trees and mountains',
    title: 'Room to breathe',
    text: 'Country tranquillity without giving up access to Cape Town, the airport and established amenities.',
    className: 'lg:col-span-5',
  },
];

export default function InternationalBuyersPage() {
  return (
    <main className="min-h-screen bg-[#F7F4EE] text-[#20231F]">
      <nav className="absolute inset-x-0 top-0 z-30 border-b border-white/15 bg-[#20231F]/20 text-white backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" aria-label="EiXPropScore home">
            <img src="/images/eix-property-score-logo.svg" alt="EiXPropScore" className="h-11 w-auto brightness-0 invert" />
          </Link>
          <Link href="/#form" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#20231F] hover:bg-[#F7F4EE]">
            Score a Property
          </Link>
        </div>
      </nav>

      <section className="relative min-h-[760px] overflow-hidden bg-[#20231F] text-white">
        <img
          src="https://unsplash.com/photos/vJmJtm7AhJE/download?force=true&w=2200"
          alt="Cape Winelands home, vineyard and mountain landscape"
          className="absolute inset-0 h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#101410]/90 via-[#101410]/55 to-[#101410]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101410]/85 via-transparent to-[#101410]/20" />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-end px-6 pb-20 pt-32 sm:px-10 sm:pb-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] backdrop-blur-md">
              <Globe2 className="h-4 w-4 text-[#75D0C7]" /> International Buyer Intelligence
            </div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-[.28em] text-[#C9E7E2]">South Africa · Cape Winelands · Boland</p>
            <h1 className="mt-4 text-5xl font-bold leading-[.98] tracking-tight sm:text-6xl lg:text-[6.3rem]">
              A property can be a home, an investment — and a way of life.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/80 sm:text-xl">
              Explore South African property through the lifestyle international buyers come for — then understand the evidence behind the decision before committing capital.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/#form" className="group inline-flex items-center gap-2 rounded-xl bg-[#0E847B] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(14,132,123,.3)] hover:bg-[#08756D]">
                Analyse a Property — R1,495 equivalent <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="#lifestyle" className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-6 py-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/15">
                Explore the lifestyle
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65">
              <span>Holiday home</span><span>Retirement</span><span>Relocation</span><span>Investment</span><span>Family home</span>
            </div>
          </div>
        </div>
      </section>

      <section id="lifestyle" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">The Cape Winelands proposition</span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">The lifestyle is part of the property decision.</h2>
          <p className="mt-5 text-lg leading-8 text-[#3E413B]">
            For international buyers, the attraction is rarely just the building. It is the combination of landscape, security, space, wine, food, golf, outdoor living and access to Cape Town that makes the Boland compelling.
          </p>
        </div>

        <div className="mt-12 grid auto-rows-[280px] gap-5 lg:grid-cols-12 lg:auto-rows-[300px]">
          {lifestyleImages.map((image) => (
            <article key={image.title} className={`group relative overflow-hidden rounded-[2rem] bg-[#20231F] ${image.className}`}>
              <img src={image.src} alt={image.alt} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101410]/85 via-[#101410]/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-8">
                <h3 className="text-2xl font-semibold tracking-tight">{image.title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{image.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-4">
          {[
            ['LIVE', 'Space, architecture, gardens and views'],
            ['TASTE', 'Wine estates, restaurants and local culture'],
            ['PLAY', 'Golf, horses, cycling and the outdoors'],
            ['CONNECT', 'Cape Town, airport, schools and healthcare'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl bg-[#FFFDF8] p-6 ring-1 ring-[#2A2D27]/8">
              <p className="text-xs font-bold tracking-[.2em] text-[#0E847B]">{title}</p>
              <p className="mt-3 text-sm leading-6 text-[#3E413B]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#20231F] text-white">
        <div className="absolute inset-0 opacity-35">
          <img src="https://unsplash.com/photos/pU4bB4ftIog/download?force=true&w=1800" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-[#20231F]/70" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <div className="max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-[.2em] text-[#75D0C7]">Before the dream becomes a decision</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">See the lifestyle. Understand the property. Verify the decision.</h2>
            <p className="mt-6 text-lg leading-8 text-white/70">
              EiXPropScore™ adds an evidence layer to the international buying journey — so the beauty of the location does not replace the questions that matter.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {focusAreas.map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/8 p-6 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#75D0C7]/10 text-[#75D0C7]"><Check className="h-5 w-5" /></div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{desc}</p>
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
                {['Property & market intelligence', 'Acquisition cost snapshot', 'Lifestyle indicators', 'Evidence gaps & confidence', 'International buyer due diligence', '24-hour delivery'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15"><Check className="h-3 w-3 text-[#75D0C7]" /></span>{item}</li>
                ))}
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
