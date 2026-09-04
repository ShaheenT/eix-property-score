'use client';

import { useState } from 'react';
import { Loader2, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

type Goal = 'Buy to Live' | 'Rental' | 'Flip';

export function LeadForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    listing_url: '',
    goal: '' as Goal | '',
  });

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
      const { error } = await supabase.from('property_score_leads').insert({
        name: form.name,
        email: form.email,
        whatsapp: form.whatsapp || null,
        listing_url: form.listing_url,
        goal: form.goal,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Your Property Score request is in!',
        description:
          'Our AI is analyzing the listing. Check your email and WhatsApp for results within 24 hours.',
      });
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description:
          'We could not submit your request. Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-strong flex flex-col items-center justify-center rounded-2xl p-8 text-center animate-scale-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-white">
          Request Received
        </h3>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          Your AI Property Score report is being generated. We will send your
          Investment Score, Rental Yield Estimate, BondMatch scenario, and Risk
          Assessment to your email and WhatsApp within 24 hours.
        </p>
        <Button
          variant="outline"
          className="mt-6 border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={() => {
            setSubmitted(false);
            setForm({
              name: '',
              email: '',
              whatsapp: '',
              listing_url: '',
              goal: '',
            });
          }}
        >
          Analyze Another Property
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-strong rounded-2xl p-6 sm:p-7"
    >
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Sparkles className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">
            Get Your Free Property Score
          </h3>
          <p className="text-xs text-white/50">
            No credit card required. Results in 24 hours.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-white/70">
            Full Name <span className="text-emerald-400">*</span>
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
              Email <span className="text-emerald-400">*</span>
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
            Property Listing URL <span className="text-emerald-400">*</span>
          </Label>
          <Input
            value={form.listing_url}
            onChange={(e) => handleChange('listing_url', e.target.value)}
            placeholder="https://www.property24.com/for-sale/..."
            className="border-white/10 bg-white/5 text-white"
          />
          <p className="text-[11px] text-white/40">
            Paste a Property24 or Private Property listing link
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-white/70">
            Your Goal <span className="text-emerald-400">*</span>
          </Label>
          <Select
            value={form.goal}
            onValueChange={(v) => handleChange('goal', v)}
          >
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

        <Button
          type="submit"
          disabled={submitting}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-6 text-base font-semibold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(0,196,140,0.5)] hover:brightness-110"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing Property...
            </>
          ) : (
            <>
              Get My Free Property Score
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        <p className="text-center text-[11px] text-white/40">
          By submitting, you agree to receive your AI Property Score report via
          email and WhatsApp. No spam, ever.
        </p>
      </div>
    </form>
  );
}
