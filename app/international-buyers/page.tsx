import Link from 'next/link';
import { ArrowRight, Check, Globe2, Sparkles } from 'lucide-react';
import { LeadForm } from '@/components/lead-form';

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
    src: '/images/winelands/winelands-home.jpg',
    alt: 'Cape Winelands home surrounded by vineyards and mountains',
    title: 'A home with a sense of place',
    text: 'Cape Dutch character, contemporary architecture, gardens, space and mountain views.',
    className: 'lg:col-span-7 lg:row-span-2',
  },
  {
    src: '/images/winelands/winelands-landscape.jpg',
    alt: 'Franschhoek vineyard with mountains in the background',
    title: 'The landscape',
    text: 'Vineyards, valleys and the Boland mountains become part of the everyday experience.',
    className: 'lg:col-span-5',
  },
  {
    src: '/images/winelands/winelands-lifestyle.jpg',
    alt: 'Cape Winelands outdoor lifestyle and estate living',
    title: 'Room to breathe',
    text: 'Country tranquillity without giving up access to Cape Town, the airport and established amenities.',
    className: 'lg:col-span-5',
  },
  {
    src: '/images/winelands/winelands-golf.jpg',
    alt: 'Cape Winelands golf and lifestyle estate',
    title: 'Live, taste, play',
    text: 'Golf, wine estates, outdoor living and the recreation that makes the region distinctive.',
    className: 'lg:col-span-12',
  },
];

export default function InternationalBuyersPage() {
  return (
    <main className="min-h-screen bg-[#F7F4EE] text-[#20231F]">
      <nav className="absolute inset-x-0 top-0 z-30 border-b border-white/20 bg-black/10 text-white backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" aria-label="EiXPropScore home">
            <img src="/images/eix-property-score-logo.svg" alt="EiXPropScore" className="h-11 w-auto brightness-0 invert" />
          </Link>
          <Link href="#form" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#20231F] shadow-sm hover:bg-[#FFFDF8]">
            Analyse a Property
          </Link>
        </div>
      </nav>

      <section className="relative min-h-[720px] overflow-hidden bg-[#6E756B] text-white sm:min-h-[760px]">
        <img src="/images/winelands/winelands-hero.jpg" alt="Cape Winelands home, vineyard and mountain landscape" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#273028]/72 via-[#273028]/28 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#273028]/55 via-transparent to-transparent" />
        <div className="relative mx-auto flex min-h-[720px] max-w-7xl items-end px-6 pb-16 pt-32 sm:min-h-[760px] sm:px-10 sm:pb-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] backdrop-blur-md"><Globe2 className="h-4 w-4 text-[#B8E1DB]" /> International Buyer Intelligence</div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-[.28em] text-[#E0F0ED]">South Africa · Cape Winelands · Boland</p>
            <h1 className="mt-4 text-5xl font-bold leading-[.98] tracking-tight sm:text-6xl lg:text-[6.1rem]">A property can be a home, an investment — and a way of life.</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/90 sm:text-xl">Explore South African property through the lifestyle international buyers come for — then understand the evidence behind the decision before committing capital.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="#form" className="group inline-flex items-center gap-2 rounded-xl bg-[#0E847B] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(14,132,123,.25)] hover:bg-[#08756D]">Analyse a Property — R1,495 equivalent <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              <Link href="#lifestyle" className="inline-flex items-center rounded-xl border border-white/35 bg-white/12 px-6 py-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20">Explore the lifestyle</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80"><span>Holiday home</span><span>Retirement</span><span>Relocation</span><span>Investment</span><span>Family home</span></div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#2A2D27]/8 bg-[#FFFDF8] px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">Where international buyers begin</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {['Cape Town', 'Stellenbosch', 'Franschhoek', 'Paarl', 'Somerset West'].map((place) => (
              <span key={place} className="rounded-full border border-[#2A2D27]/10 bg-[#F7F4EE] px-4 py-2 text-sm font-medium text-[#3E413B]">{place}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#6A6D66]">Wine estates · Golf · Mountains · Coast · International connectivity</p>
        </div>
      </section>

      <section id="form" className="scroll-mt-6 border-b border-[#2A2D27]/8 bg-[#F7F4EE] px-6 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.78fr_1fr] lg:items-start">
          <div className="pt-2 lg:sticky lg:top-8">
            <span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">International Buyer Intelligence</span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Analyse the property before you commit.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#3E413B]">Tell us who you are buying as, what matters to you and which South African property you are considering. We will build the evidence-based intelligence report around that decision.</p>
            <div className="mt-7 space-y-3 text-sm text-[#4B4E47]">
              {['One property · R1,495 equivalent', 'International buyer profile and lifestyle context', 'Evidence gaps, acquisition snapshot and due diligence', 'Delivered within 24 hours'].map((item) => <div key={item} className="flex items-start gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F7F5]"><Check className="h-3 w-3 text-[#0E847B]" /></span>{item}</div>)}
            </div>
          </div>
          <LeadForm />
        </div>
      </section>

      <section id="lifestyle" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="max-w-3xl"><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">The Cape Winelands proposition</span><h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">The lifestyle is part of the property decision.</h2><p className="mt-5 text-lg leading-8 text-[#3E413B]">For international buyers, the attraction is rarely just the building. It is the combination of landscape, security, space, wine, food, golf, outdoor living and access to Cape Town that makes the Boland compelling.</p></div>
        <div className="mt-12 grid auto-rows-[280px] gap-5 lg:grid-cols-12 lg:auto-rows-[300px]">
          {lifestyleImages.map((image) => <article key={image.title} className={`group relative overflow-hidden rounded-[2rem] bg-[#D9D4C8] ${image.className}`}><img src={image.src} alt={image.alt} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-[#273028]/65 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-8"><h3 className="text-2xl font-semibold tracking-tight">{image.title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-white/85">{image.text}</p></div></article>)}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-4">{[['LIVE', 'Space, architecture, gardens and views'], ['TASTE', 'Wine estates, restaurants and local culture'], ['PLAY', 'Golf, horses, cycling and the outdoors'], ['CONNECT', 'Cape Town, airport, schools and healthcare']].map(([title, text]) => <div key={title} className="rounded-2xl bg-[#FFFDF8] p-6 ring-1 ring-[#2A2D27]/8"><p className="text-xs font-bold tracking-[.2em] text-[#0E847B]">{title}</p><p className="mt-3 text-sm leading-6 text-[#3E413B]">{text}</p></div>)}</div>
      </section>

      <section className="border-y border-[#2A2D27]/8 bg-[#ECE7DC]/55">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <div className="max-w-3xl"><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">Before the dream becomes a decision</span><h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">See the lifestyle. Understand the property. Verify the decision.</h2><p className="mt-6 text-lg leading-8 text-[#4B4E47]">EiXPropScore™ adds an evidence layer to the international buying journey — so the beauty of the location does not replace the questions that matter.</p></div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{focusAreas.map(([title, desc]) => <div key={title} className="rounded-2xl border border-[#2A2D27]/8 bg-[#FFFDF8] p-6 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F7F5] text-[#0E847B]"><Check className="h-5 w-5" /></div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5D6059]">{desc}</p></div>)}</div>
        </div>
      </section>

      <section className="border-b border-[#2A2D27]/8 bg-[#F7F4EE]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-[1fr_.7fr] lg:items-center">
          <div><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">Why international buyers look here</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A lifestyle proposition deserves an evidence-based property decision.</h2><p className="mt-5 max-w-2xl leading-7 text-[#3E413B]">The Cape Winelands combines landscape, wine, outdoor living, recreation and access to Cape Town. EiX helps separate what the property evidence supports from what still needs independent verification.</p></div>
          <div className="rounded-[2rem] border border-[#2A2D27]/10 bg-[#FFFDF8] p-7 shadow-[0_24px_70px_rgba(42,45,39,.08)] sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {['International access', 'Wine & culinary culture', 'Golf & outdoor living', 'Mountain & vineyard lifestyle'].map((item) => <div key={item} className="rounded-xl bg-[#F7F4EE] p-4 text-sm font-medium text-[#3E413B] ring-1 ring-[#2A2D27]/8">{item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#2A2D27]/8 bg-[#F7F4EE]"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-[1fr_.7fr] lg:items-center"><div><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#0E847B]">Why R1,495?</span><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">One property. One international buyer intelligence report.</h2><p className="mt-5 max-w-2xl leading-7 text-[#3E413B]">The International Buyer Intelligence report is deliberately focused: submit one property, get one evidence-based decision report, and see exactly what the evidence supports — and what still needs independent verification.</p></div><div className="rounded-[2rem] border border-[#2A2D27]/10 bg-[#FFFDF8] p-7 shadow-[0_24px_70px_rgba(42,45,39,.10)] sm:p-8"><span className="inline-flex rounded-full bg-[#E8F7F5] px-3 py-1.5 text-xs font-semibold text-[#0E847B] ring-1 ring-[#0E847B]/10">International Buyer Intelligence</span><div className="mt-6 flex items-baseline gap-2"><span className="text-5xl font-bold tracking-tight">R1,495</span><span className="text-sm text-[#777970]">equivalent</span></div><p className="mt-2 text-sm text-[#6A6D66]">One property · Delivered within 24 hours</p><div className="my-7 h-px bg-[#2A2D27]/8" /><ul className="space-y-3">{['Property & market intelligence', 'Acquisition cost snapshot', 'Lifestyle indicators', 'Evidence gaps & confidence', 'International buyer due diligence', '24-hour delivery'].map((item) => <li key={item} className="flex items-center gap-3 text-sm text-[#4B4E47]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F7F5]"><Check className="h-3 w-3 text-[#0E847B]" /></span>{item}</li>)}</ul><div className="my-7 h-px bg-[#2A2D27]/8" /><p className="text-xs leading-5 text-[#777970]">Canonical price is R1,495 in ZAR. Your payment provider may display the converted amount in your local currency.</p></div></div></section>

      <section className="relative overflow-hidden bg-[#273028] text-white">
        <img src="/images/winelands/winelands-sunset.jpg" alt="Cape Winelands sunset over vineyards and mountains" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#273028]/80 via-[#273028]/45 to-[#273028]/55" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-32">
          <div className="max-w-3xl"><span className="text-xs font-semibold uppercase tracking-[.2em] text-[#D8EEEA]">The decision starts with evidence</span><h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Ready to analyse another South African property?</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">Submit one property and receive the International Buyer Intelligence report within 24 hours.</p><Link href="#form" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0E847B] px-6 py-4 text-sm font-semibold text-white hover:bg-[#08756D]">Analyse a Property — R1,495 equivalent <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <footer className="border-t border-[#2A2D27]/8 bg-[#F7F4EE]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between"><img src="/images/eix-property-score-logo.svg" alt="EiXPropScore" className="h-10 w-auto" /><p className="text-xs text-[#4F524C]">EiXPropScore™ — Evidence-based property decision intelligence for South Africa.</p></div></footer>
    </main>
  );
}
