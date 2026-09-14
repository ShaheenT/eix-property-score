'use client';

import { useEffect, useState } from 'react';
import { Check, Crown } from 'lucide-react';

const STANDARD_FEATURES = ['EiX Investment Score™','Rental Yield Estimate','Cash Flow Analysis','Risk Score','AI Confidence Meter™','24-hour delivery'];
const INTERNATIONAL_FEATURES = ['Property & Market Intelligence','Acquisition Cost Snapshot','Lifestyle Indicators','Evidence Gaps & Confidence','International Buyer Due Diligence','24-hour delivery'];

type BuyerType = 'south_african' | 'international';

export function PricingCard() {
  const [buyerType, setBuyerType] = useState<BuyerType>('south_african');

  useEffect(() => {
    const handleBuyerTypeChange = (event: Event) => {
      const value = (event as CustomEvent<BuyerType>).detail;
      if (value === 'international' || value === 'south_african') setBuyerType(value);
    };
    window.addEventListener('eix-buyer-type-change', handleBuyerTypeChange);
    return () => window.removeEventListener('eix-buyer-type-change', handleBuyerTypeChange);
  }, []);

  const international = buyerType === 'international';
  const features = international ? INTERNATIONAL_FEATURES : STANDARD_FEATURES;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#2A2D27]/10 bg-[#20231F] p-7 text-white shadow-[0_28px_80px_rgba(42,45,39,.16)] sm:p-8">
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#11A397]/15 blur-3xl" />
      <div className="relative">
        <span className="inline-flex rounded-full bg-[#75D0C7]/10 px-3 py-1.5 text-xs font-semibold text-[#75D0C7] ring-1 ring-[#75D0C7]/20">
          {international ? 'International Buyer Intelligence' : 'Founding Beta'}
        </span>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tight">{international ? 'R1,495' : 'R149'}</span>
          <span className="text-sm text-white/50">{international ? 'equivalent' : 'one-time'}</span>
        </div>
        <p className="mt-2 text-sm text-white/60">
          {international ? 'One property · International Buyer Intelligence · Delivered within 24 hours' : 'One property · Delivered within 24 hours'}
        </p>
        <div className="my-7 h-px bg-white/10" />
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-white/80">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11A397]/15">
                <Check className="h-3 w-3 text-[#75D0C7]" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
        <div className="my-7 h-px bg-white/10" />
        <p className="text-xs leading-5 text-white/45">
          {international
            ? 'Canonical price is R1,495 in ZAR. Your payment provider may display the converted amount in your local currency.'
            : 'Limited launch pricing before the full platform rolls out.'}
        </p>
      </div>
    </div>
  );
}

export function PricingCardPro() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#B98F3F]/20 bg-[#FFF9EA] p-7 shadow-[0_20px_60px_rgba(42,45,39,.08)] sm:p-8">
      <div className="relative"><span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#9D742C]"><Crown className="h-3.5 w-3.5" /> Investor Report Pro</span><div className="mt-5 flex items-baseline gap-2"><span className="text-5xl font-bold">R349</span><span className="text-sm text-[#777970]">one-time</span></div><p className="mt-2 text-sm text-[#6A6D66]">Full investor analysis · Delivered with your report</p><div className="my-6 h-px bg-[#2A2D27]/8" /><ul className="space-y-3">{['Everything in Founding Beta','Comparable sales analysis','Rental demand insights','Negotiation opportunities','Investment risk breakdown','Growth outlook & exit strategy'].map((feature)=><li key={feature} className="flex items-center gap-3 text-sm text-[#4B4E47]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B98F3F]/10"><Check className="h-3 w-3 text-[#9D742C]" /></span>{feature}</li>)}</ul></div>
    </div>
  );
}
