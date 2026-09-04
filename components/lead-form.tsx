'use client';

import { useState } from 'react';
import { Loader2, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PropertySourceDetector } from '@/components/property-source-detector';
import { SupportedPlatforms } from '@/components/supported-platforms';
import { ConfidenceMeter } from '@/components/confidence-meter';
import type { PropertySource } from '@/lib/property-source';

type Goal = 'Buy to Live' | 'Rental' | 'Flip';

export function LeadForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    listing_url: '',
    goal: '' as Goal | '',
  });
  const [detectedSource, setDetectedSource] = useState<PropertySource | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.listing_url || !form.goal) {
      toast({
        title: 'Please fill in all required fields',
        description: 'Name, email, listing URL, and goal are required.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          whatsapp: form.whatsapp || undefined,
          listing_url: form.listing_url,
          goal: form.goal,
          product: 'standard_report',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Checkout failed');
      }

      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description:
          err instanceof Error ? err.message : 'We could not start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-6 sm:p-7">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/20">
          <Sparkles className="h-4 w-4 text-teal-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">
            Get Your Property Score — R149
          </h3>
          <p className="text-xs text-white/50">
            Founding Beta price · Delivered within 24 hours
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white/70">
            Full Name <span className="text-teal-400">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Thabo Mokoena"
            className="border-white/10 bg-white/5 text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-white/70">
              Email <span className="text-teal-400">*</span>
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="thabo@email.com"
              className="border-white/10 bg-white/5 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">WhatsApp Number</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              placeholder="+27 82 123 4567"
              className="border-white/10 bg-white/5 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">
            Property Listing URL or Address <span className="text-teal-400">*</span>
          </Label>
          <PropertySourceDetector
            value={form.listing_url}
            onChange={(v) => handleChange('listing_url', v)}
            onSourceDetected={setDetectedSource}
          />
          <div className="pt-1">
            <SupportedPlatforms />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">
            Your Goal <span className="text-teal-400">*</span>
          </Label>
          <Select value={form.goal} onValueChange={(v) => handleChange('goal', v)}>
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Select your investment goal" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-midnight-200 text-white">
              <SelectItem value="Buy to Live">Buy to Live</SelectItem>
              <SelectItem value="Rental">Rental Investment</SelectItem>
              <SelectItem value="Flip">Flip / Resell</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {detectedSource && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <ConfidenceMeter
              value={
                detectedSource === 'property24'
                  ? 95
                  : detectedSource === 'private_property'
                    ? 82
                    : detectedSource === 'agency'
                      ? 75
                      : detectedSource === 'facebook'
                        ? 68
                        : 45
              }
              size="sm"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 py-6 text-base font-semibold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(14,165,164,0.5)] hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirecting to secure checkout...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 opacity-70" />
              Pay R149 — Get My Property Score
              <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-white/40">
          Secure checkout via PayFast. Your report is delivered to your email and
          WhatsApp within 24 hours.
        </p>
      </div>
    </form>
  );
}
