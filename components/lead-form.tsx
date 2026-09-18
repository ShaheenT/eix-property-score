'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowRight, Sparkles, Lock, Globe2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PropertySourceDetector } from '@/components/property-source-detector';
import { SupportedPlatforms } from '@/components/supported-platforms';
import { ConfidenceMeter } from '@/components/confidence-meter';
import type { PropertySource } from '@/lib/property-source';

type Goal = 'Buy to Live' | 'Rental' | 'Flip';
type BuyerType = 'south_african' | 'international';

const STANDARD_PRICE = 149;
const INTERNATIONAL_PRICE = 1495;

function isValidEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function normaliseWhatsApp(value: string): string | null { const digits = value.replace(/\D/g, ''); if (digits.length < 8 || digits.length > 15) return null; return value.trim().startsWith('+') ? `+${digits}` : `+${digits}`; }

export function LeadForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', listing_url: '', goal: '' as Goal | '', buyer_type: 'south_african' as BuyerType, buyer_country: '', buyer_purpose: '', buyer_budget: '' });
  const [detectedSource, setDetectedSource] = useState<PropertySource | null>(null);
  const handleChange = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const internationalPage = typeof window !== 'undefined' && window.location.pathname === '/international-buyers';
  const buyerType = internationalPage ? 'international' : form.buyer_type;
  const price = buyerType === 'international' ? INTERNATIONAL_PRICE : STANDARD_PRICE;
  const priceLabel = buyerType === 'international' ? 'R1,495 equivalent' : 'R149';

  useEffect(() => {
    if (internationalPage && form.buyer_type !== 'international') {
      setForm((prev) => ({ ...prev, buyer_type: 'international' }));
    }
  }, [internationalPage, form.buyer_type]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eix-buyer-type-change', { detail: buyerType }));
  }, [buyerType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (submitting) return;
    const name = form.name.trim(), email = form.email.trim(), listingUrl = form.listing_url.trim(), whatsapp = form.whatsapp.trim();
    if (!name || name.length < 3) { toast({ title: 'Full name required', description: 'Please enter your full name.', variant: 'destructive' }); return; }
    if (!isValidEmail(email)) { toast({ title: 'Valid email required', description: 'Please enter a valid email address.', variant: 'destructive' }); return; }
    const normalisedWhatsapp = normaliseWhatsApp(whatsapp);
    if (!normalisedWhatsapp) { toast({ title: 'Valid WhatsApp number required', description: 'Use an international format such as +44 7700 900123 or +27 82 123 4567.', variant: 'destructive' }); return; }
    if (!listingUrl || !form.goal) { toast({ title: 'Please complete the required fields', description: 'Property and goal are required.', variant: 'destructive' }); return; }
    if (buyerType === 'international' && !form.buyer_country) { toast({ title: 'Country required', description: 'Tell us where you are buying from.', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, whatsapp: normalisedWhatsapp, listing_url: listingUrl, goal: form.goal, product: 'standard_report', buyer_type: buyerType, buyer_country: form.buyer_country || null, buyer_purpose: form.buyer_purpose || null, buyer_budget: form.buyer_budget || null }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (!data.checkout_url) throw new Error('Secure checkout could not be started. Please try again.');
      window.location.assign(data.checkout_url);
    } catch (err) { setSubmitting(false); toast({ title: 'Could not start checkout', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' }); }
  };

  const inputClass = 'w-full min-w-0 rounded-xl border border-[#2A2D27]/12 bg-white px-4 py-3.5 text-[#20231F] shadow-none placeholder:text-[#92958D] focus-visible:ring-[#0E847B]/30';
  return (
    <form onSubmit={handleSubmit} className="min-w-0 rounded-[2rem] border border-[#2A2D27]/10 bg-[#FFFDF8] p-6 shadow-[0_20px_60px_rgba(42,45,39,.08)] sm:p-7" noValidate>
      <div className="mb-6 rounded-2xl border border-[#2A2D27]/8 bg-white px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <img src="/images/eix-property-score-logo.svg" alt="EiX Property Score" className="h-10 w-auto object-contain sm:h-12" />
          <div className="flex items-center gap-2 rounded-full bg-[#E8F7F5] px-3 py-1.5 text-[11px] font-semibold text-[#0E847B] ring-1 ring-[#0E847B]/15">
            <Lock className="h-3.5 w-3.5" /> Secure checkout
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-4 border-t border-[#2A2D27]/8 pt-4">
          <div>
            <p className="text-sm font-semibold text-[#20231F]">Property Intelligence Report</p>
            <p className="mt-1 text-xs text-[#6A6D66]">{buyerType === 'international' ? 'International Buyer Intelligence · one property · evidence-backed analysis · delivered within 24 hours' : 'Founding Beta · one property · evidence-backed analysis · delivered within 24 hours'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-[#20231F]">{priceLabel}</p>
            <p className="text-[10px] text-[#777970]">one-time</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2"><Label className="text-[#4B4E47]">Full Name <span className="text-[#0E847B]">*</span></Label><Input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Thabo Mokoena" className={inputClass} autoComplete="name" /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label className="text-[#4B4E47]">Email <span className="text-[#0E847B]">*</span></Label><Input required type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="you@email.com" className={inputClass} autoComplete="email" /></div><div className="space-y-2"><Label className="text-[#4B4E47]">WhatsApp <span className="text-[#0E847B]">*</span></Label><Input required inputMode="tel" value={form.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.value)} placeholder="+44 7700 900123" className={inputClass} autoComplete="tel" /></div></div>
        {!internationalPage && <div className="space-y-2"><Label className="text-[#4B4E47]">Who are you buying as?</Label><Select value={form.buyer_type} onValueChange={(v) => handleChange('buyer_type', v)}><SelectTrigger className="w-full rounded-xl border-[#2A2D27]/12 bg-white py-3.5 text-[#20231F]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="south_african">South African buyer</SelectItem><SelectItem value="international"><span className="flex items-center gap-2"><Globe2 className="h-4 w-4" /> International buyer</span></SelectItem></SelectContent></Select></div>}
        {buyerType === 'international' && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label className="text-[#4B4E47]">Buying from</Label><Select value={form.buyer_country} onValueChange={(v) => handleChange('buyer_country', v)}><SelectTrigger className="w-full rounded-xl border-[#2A2D27]/12 bg-white py-3.5 text-[#20231F]"><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent>{['United Kingdom','Germany','Netherlands','France','Austria','Switzerland','United States','Canada','United Arab Emirates','Australia','Other'].map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label className="text-[#4B4E47]">Budget</Label><Select value={form.buyer_budget} onValueChange={(v) => handleChange('buyer_budget', v)}><SelectTrigger className="w-full rounded-xl border-[#2A2D27]/12 bg-white py-3.5 text-[#20231F]"><SelectValue placeholder="Approximate budget" /></SelectTrigger><SelectContent>{['Under R5m','R5m–R10m','R10m–R20m','R20m–R50m','R50m+'].map((budget) => <SelectItem key={budget} value={budget}>{budget}</SelectItem>)}</SelectContent></Select></div></div>}
        {buyerType === 'international' && <div className="space-y-2"><Label className="text-[#4B4E47]">Primary purpose</Label><Select value={form.buyer_purpose} onValueChange={(v) => handleChange('buyer_purpose', v)}><SelectTrigger className="w-full rounded-xl border-[#2A2D27]/12 bg-white py-3.5 text-[#20231F]"><SelectValue placeholder="Holiday home, retirement, relocation or investment" /></SelectTrigger><SelectContent>{['Holiday home','Retirement','Relocation','Investment','Family home','Golf / lifestyle'].map((purpose) => <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>)}</SelectContent></Select></div>}
        <div className="space-y-2"><Label className="text-[#4B4E47]">Property Listing URL or Address <span className="text-[#0E847B]">*</span></Label><PropertySourceDetector value={form.listing_url} onChange={(v) => handleChange('listing_url', v)} onSourceDetected={setDetectedSource} /><div className="pt-1"><SupportedPlatforms /></div></div>
        <div className="space-y-2"><Label className="text-[#4B4E47]">What are you trying to decide? <span className="text-[#0E847B]">*</span></Label><Select value={form.goal} onValueChange={(v) => handleChange('goal', v)}><SelectTrigger className="w-full rounded-xl border-[#2A2D27]/12 bg-white py-3.5 text-[#20231F]"><SelectValue placeholder="Choose your property goal" /></SelectTrigger><SelectContent><SelectItem value="Buy to Live">Buy to Live</SelectItem><SelectItem value="Rental">Rental Investment</SelectItem><SelectItem value="Flip">Flip / Resell</SelectItem></SelectContent></Select></div>
        {detectedSource && <div className="rounded-xl border border-[#2A2D27]/8 bg-[#F8F5EF] p-3"><ConfidenceMeter value={detectedSource === 'property24' ? 95 : detectedSource === 'private_property' ? 82 : detectedSource === 'agency' ? 75 : detectedSource === 'facebook' ? 68 : 45} size="sm" /></div>}
        <button type="submit" disabled={submitting} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#0E847B] py-4 text-center text-sm font-semibold text-white hover:bg-[#08756D] disabled:cursor-wait disabled:opacity-60 sm:text-base">{submitting ? <><Loader2 className="h-5 w-5 animate-spin" /><span>Opening secure payment…</span></> : <><Lock className="h-4 w-4 opacity-80" /><span>Analyse My Property — {priceLabel}</span><ArrowRight className="ml-1 h-5 w-5" /></>}</button>
        <p className="text-center text-[11px] leading-5 text-[#777970]">Secure payment powered by PayFast. {buyerType === 'international' ? `International Buyer Intelligence is priced at R${price.toLocaleString('en-ZA')} in ZAR; your payment provider may display the converted amount in your local currency.` : 'Your evidence-backed report is delivered to your email and WhatsApp within 24 hours.'}</p>
      </div>
    </form>
  );
}
