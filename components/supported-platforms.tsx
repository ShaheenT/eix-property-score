'use client';

import { Globe, MapPin, Facebook, Building2, Home } from 'lucide-react';
import { SUPPORTED_SOURCES } from '@/lib/property-source';

const ICONS: Record<string, React.ReactNode> = {
  property24: <Globe className="h-3.5 w-3.5 shrink-0" />,
  private_property: <Home className="h-3.5 w-3.5 shrink-0" />,
  facebook: <Facebook className="h-3.5 w-3.5 shrink-0" />,
  agency: <Building2 className="h-3.5 w-3.5 shrink-0" />,
  address_only: <MapPin className="h-3.5 w-3.5 shrink-0" />,
};

export function SupportedPlatforms() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold text-[#30332E]">Supports:</span>
      {SUPPORTED_SOURCES.map((src) => (
        <span
          key={src.source}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2D27]/10 bg-[#F8F5EF] px-3 py-1.5 text-[11px] font-semibold leading-none text-[#30332E] shadow-sm"
        >
          <span className="text-[#0E847B]">{ICONS[src.source]}</span>
          <span>{src.label}</span>
        </span>
      ))}
    </div>
  );
}
