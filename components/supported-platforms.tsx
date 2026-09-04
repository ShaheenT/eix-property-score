'use client';

import { Globe, MapPin, Facebook, Building2, Home } from 'lucide-react';
import { SUPPORTED_SOURCES } from '@/lib/property-source';

const ICONS: Record<string, React.ReactNode> = {
  property24: <Globe className="h-3.5 w-3.5" />,
  private_property: <Home className="h-3.5 w-3.5" />,
  facebook: <Facebook className="h-3.5 w-3.5" />,
  agency: <Building2 className="h-3.5 w-3.5" />,
  address_only: <MapPin className="h-3.5 w-3.5" />,
};

export function SupportedPlatforms() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-white/40">Supports:</span>
      {SUPPORTED_SOURCES.map((src) => (
        <span
          key={src.source}
          className="inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-[11px] font-medium text-white/60"
        >
          {ICONS[src.source]}
          {src.label}
        </span>
      ))}
    </div>
  );
}
