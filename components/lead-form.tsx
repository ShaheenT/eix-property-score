'use client';

import { useState } from 'react';
import { Loader2, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PropertySourceDetector } from '@/components/property-source-detector';
import { SupportedPlatforms } from '@/components/supported-platforms';
import { ConfidenceMeter } from '@/components/confidence-meter';
import type { PropertySource } from '@/lib/property-source';

type Goal = 'Buy to Live' | 'Rental' | 'Flip';
function isValidEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function normaliseSouthAfricanMobile(value: string): string | null { const digits = value.replace(/\D/g, ''); if (/^0[6-8]\d{8}$/.test(digits)) return `+27${digits.slice(1)}`; if (/^27[6-8]\d{8}$/.test(digits)) return `+${digits}`; return null; }

export function LeadForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', listing_url: '', goal: '' as Goal | '' });
  const [detectedSource, setDetectedSource] = useState<PropertySource | null>(null);
  const handleChange = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (submitting) return;
    const name = form.name.trim(), email = form.email.trim(), listingUrl = form.listing_url.trim(), whatsapp = form.whatsapp.trim();
    if (!name || name.length < 3) { toast({ title: 'Full name required', description: 'Please enter your full name.', variant: 'destructive' }); return; }
    if (!isValidEmail(email)) { toast({ title: 'Valid email required', description: 'Please enter a valid email address.', variant: 'destructive' }); return; }
    if (!whatsapp) { toast({ title: 'WhatsApp number required', description: 'Please enter a valid South African mobile number.', variant: 'destructive' }); return; }
    const normalisedWhatsapp = normaliseSouthAfricanMobile(whatsapp);
    if (!normalisedWhatsapp) { toast({ title: 'Invalid WhatsApp number', description: 'Use a South African mobile number such as 082 123 4567 or +27 82 123 4567.', variant: 'destructive' }); return; }
    if (!listingUrl || !form.goal) { toast({ title: 'Please complete the required fields', description: 'Property and goal are required.', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, whatsapp: normalisedWhatsapp, listing_url: listingUrl, goal: form.goal, product: 'standard_report' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (!data.checkout_url) throw new Error('Secure checkout could not be started. Please try again.');
      window.location.assign(data.checkout_url);
    } catch (err) { setSubmitting(false); toast({ title: 'Could not start checkout', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' }); }
  };

  const inputClass = 'w-full min-w-0 rounded-xl border border-[#2A2D27]/12 bg-white px-4 py-3.5 text-[#20231F] shadow-none placeholder:text-[#92958D] focus-visible:ring-[#0E847B]/30';
  return (
    <form onSubmit={handleSubmit} className="min-w-0 rounded-[2rem] border border-[#2A2D27]/10 bg-[#FFFDF8] p-6 shadow-[0_20px_60px_rgba(42,45,39,.08)] sm:p-7" noValidate>
      <div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F7F5] ring-1 ring-[#0E847B]/15"><Sparkles className="h-4 w-4 text-[#0E847B]" /></div><div><h3 className="text-base font-semibold">Analyse This Property — R149</h3><p className="text-xs text-[#6A6D66]">Founding Beta · Evidence-based report within 24 hours</p></div></div>
      <div className="space-y-4">
        <div className="space-y-2"><Label className="text-[#4B4E47]">Full Name <span className="text-[#0E847B]">*</span></Label><Input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Thabo Mokoena" className={inputClass} autoComplete="name" /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label className="text-[#4B4E47]">Email <span className="text-[#0E847B]">*</span></Label><Input required type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="thabo@email.com" className={inputClass} autoComplete="email" /></div><div className="space-y-2"><Label className="text-[#4B4E47]">WhatsApp Number <span className="text-[#0E847B]">*</span></Label><Input required inputMode="tel" value={form.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.value)} placeholder="+27 82 123 4567" className={inputClass} autoComplete="tel" /></div></div>
        <div className="space-y-2"><Label className="text-[#4B4E47]">Property Listing URL or Address <span className="text-[#0E847B]">*</span></Label><PropertySourceDetector value={form.listing_url} onChange={(v) => handleChange('listing_url', v)} onSourceDetected={setDetectedSource} /><div className="pt-1"><SupportedPlatforms /></div></div>
        <div className="space-y-2"><Label className="text-[#4B4E47]">What are you trying to decide? <span className="text-[#0E847B]">*</span></Label><Select value={form.goal} onValueChange={(v) => handleChange('goal', v)}><SelectTrigger className="w-full rounded-xl border-[#2A2D27]/12 bg-white py-3.5 text-[#20231F]"><SelectValue placeholder="Choose your property goal" /></SelectTrigger><SelectContent className="border-[#D8D1C4] bg-[#FFFDF8] text-[#20231F]"><SelectItem value="Buy to Live">Buy to Live</SelectItem><SelectItem value="Rental">Rental Investment</SelectItem><SelectItem value="Flip">Flip / Resell</SelectItem></SelectContent></Select></div>
        {detectedSource && <div className="rounded-xl border border-[#2A2D27]/8 bg-[#F8F5EF] p-3"><ConfidenceMeter value={detectedSource === 'property24' ? 95 : detectedSource === 'private_property' ? 82 : detectedSource === 'agency' ? 75 : detectedSource === 'facebook' ? 68 : 45} size="sm" /></div>}
        <button type="submit" disabled={submitting} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#0E847B] py-4 text-center text-sm font-semibold text-white transition-all hover:bg-[#08756D] hover:shadow-[0_14px_35px_rgba(14,132,123,.18)] disabled:cursor-wait disabled:opacity-60 sm:text-base">{submitting ? <><Loader2 className="h-5 w-5 animate-spin" /><span>Opening secure checkout…</span></> : <><Lock className="h-4 w-4 opacity-80" /><span>Analyse My Property — R149</span><ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" /></>}</button>
        <p className="text-center text-[11px] leading-5 text-[#777970]">Secure checkout via PayFast. Your evidence-based report is delivered to your email and WhatsApp within 24 hours.</p>
      </div>
    </form>
  );
}
