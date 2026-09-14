'use client';

import { useState } from 'react';
import { MapPin, Globe, Building2, Home, Facebook, Check } from 'lucide-react';
import { detectPropertySource, type PropertySource } from '@/lib/property-source';

const SOURCE_ICONS: Record<PropertySource, React.ReactNode> = {
  property24: <Globe className="h-4 w-4" />,
  private_property: <Home className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  agency: <Building2 className="h-4 w-4" />,
  address_only: <MapPin className="h-4 w-4" />,
};

const SOURCE_COLORS: Record<PropertySource, string> = {
  property24: 'bg-teal-500/10 text-teal-400 ring-teal-500/20',
  private_property: 'bg-teal-500/10 text-teal-400 ring-teal-500/20',
  facebook: 'bg-electric-500/10 text-electric-400 ring-electric-500/20',
  agency: 'bg-white/5 text-white/60 ring-white/10',
  address_only: 'bg-gold-500/10 text-gold-400 ring-gold-500/20',
};

interface PropertySourceDetectorProps {
  value: string;
  onChange: (value: string) => void;
  onSourceDetected?: (source: PropertySource) => void;
}

export function PropertySourceDetector({
  value,
  onChange,
  onSourceDetected,
}: PropertySourceDetectorProps) {
  const [detected, setDetected] = useState<{
    source: PropertySource;
    label: string;
  } | null>(null);

  const handleInput = (input: string) => {
    onChange(input);
    if (input.trim().length > 3) {
      const result = detectPropertySource(input);
      setDetected(result);
      onSourceDetected?.(result.source);
    } else {
      setDetected(null);
    }
  };

  return (
    <div>
      <input
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Paste a Property24, Private Property, Facebook or agency link—or enter the address"
        className="flex h-12 w-full rounded-xl border border-[#2A2D27]/12 bg-white px-4 py-2 text-sm text-[#20231F] shadow-none placeholder:text-[#92958D] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E847B]/30"
      />
      {detected && (
        <div className="mt-2 flex items-center gap-2 animate-fade-in">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${SOURCE_COLORS[detected.source]}`}
          >
            {SOURCE_ICONS[detected.source]}
            {detected.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-teal-400/70">
            <Check className="h-3 w-3" />
            Source detected
          </span>
        </div>
      )}
    </div>
  );
}
