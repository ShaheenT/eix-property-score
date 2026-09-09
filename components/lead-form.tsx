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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normaliseSouthAfricanMobile(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (/^0[6-8]\d{8}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^27[6-8]\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

export function LeadForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', listing_url: '', goal: '' as Goal | '' });
  const [detectedSource, setDetectedSource] = useState<PropertySource | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    const email = form.email.trim();
    const listingUrl = form.listing_url.trim();
    const whatsapp = form.whatsapp.trim();

    if (!name || name.length < 3) {
      toast({ title: 'Full name required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }
    if (!isValidEmail(email)) {
      toast({ title: 'Valid email required', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    if (!whatsapp) {
      toast({ title: 'WhatsApp number required', description: 'Please enter a valid South African mobile number.', variant: 'destructive' });
      return;
    }
    const normalisedWhatsapp = normaliseSouthAfricanMobile(whatsapp);
    if (!normalisedWhatsapp) {
      toast({ title: 'Invalid WhatsApp number', description: 'Use a South African mobile number such as 082 123 4567 or +27 82 123 4567.', variant: 'destructive' });
      return;
    }
    if (!listingUrl || !form.goal) {
      toast({ title: 'Please complete the required fields', description: 'Property and goal are required.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, whatsapp: normalisedWhatsapp, listing_url: listingUrl, goal: form.goal, product: 'standard_report' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (!data.checkout_url) throw new Error('Secure checkout could not be started. Please try again.');
      window.location.assign(data.checkout_url);
    } catch (err) {
      setSubmitting(false);
      toast({ title: 'Could not start checkout', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-strong min-w-0 rounded-2xl p-6 sm:p-7" noValidate>
      <div className="mb-5 flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/20"><Sparkles className="h-4 w-4 text-teal-400" /></div>
        <div className="min-w-0"><h3 className="text-base font-semibold text-white">Analyse This Property — R149</h3><p className="text-xs text-white/50">Founding Beta · Evidence-based report within 24 hours</p></div>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="space-y-2"><Label className="text-white/70">Full Name <span className="text-teal-400">*</span></Label><Input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Thabo Mokoena" className="w-full min-w-0 border-white/10 bg-white/5 text-white" autoComplete="name" /></div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2"><Label className="text-white/70">Email <span className="text-teal-400">*</span></Label><Input required type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="thabo@email.com" className="w-full min-w-0 border-white/10 bg-white/5 text-white" autoComplete="email" /></div>
          <div className="min-w-0 space-y-2"><Label className="text-white/70">WhatsApp Number <span className="text-teal-400">*</span></Label><Input required inputMode="tel" value={form.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.value)} placeholder="+27 82 123 4567" className="w-full min-w-0 border-white/10 bg-white/5 text-white" autoComplete="tel" /></div>
        </div>
        <div className="min-w-0 space-y-2"><Label className="text-white/70">Property Listing URL or Address <span className="text-teal-400">*</span></Label><PropertySourceDetector value={form.listing_url} onChange={(v) => handleChange('listing_url', v)} onSourceDetected={setDetectedSource} /><div className="pt-1"><SupportedPlatforms /></div></div>
        <div className="min-w-0 space-y-2"><Label className="text-white/70">What are you trying to decide? <span className="text-teal-400">*</span></Label><Select value={form.goal} onValueChange={(v) => handleChange('goal', v)}><SelectTrigger className="w-full min-w-0 border-white/10 bg-white/5 text-white"><SelectValue placeholder="Choose your property goal" /></SelectTrigger><SelectContent className="border-white/10 bg-midnight-200 text-white"><SelectItem value="Buy to Live">Buy to Live</SelectItem><SelectItem value="Rental">Rental Investment</SelectItem><SelectItem value="Flip">Flip / Resell</SelectItem></SelectContent></div>
        {detectedSource && <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] p-3"><ConfidenceMeter value={detectedSource === 'property24' ? 95 : detectedSource === 'private_property' ? 82 : detectedSource === 'agency' ? 75 : detectedSource === 'facebook' ? 68 : 45} size="sm" /></div>}
        <button type="submit" disabled={submitting} className="group relative flex w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 py-6 text-center text-sm font-semibold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(14,165,164,0.5)] hover:brightness-110 disabled:cursor-wait disabled:opacity-60 sm:text-base">
          {submitting ? <><Loader2 className="h-5 w-5 shrink-0 animate-spin" /> <span>Opening secure checkout…</span></> : <><Lock className="h-4 w-4 shrink-0 opacity-70" /> <span>Analyse My Property — R149</span> <ArrowRight className="ml-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" /></>}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-white/40">Secure checkout via PayFast. Your evidence-based report is delivered to your email and WhatsApp within 24 hours.</p>
      </div>
    </form>
  );
}
