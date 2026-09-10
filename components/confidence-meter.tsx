'use client';

import { useEffect, useState } from 'react';

interface ConfidenceMeterProps {
  value?: number;
  size?: 'sm' | 'md' | 'lg';
}

function getConfidenceLabel(value: number): { label: string; color: string } {
  if (value >= 90) return { label: 'Excellent data', color: '#0EA5A4' };
  if (value >= 75) return { label: 'Strong estimate', color: '#28C6C7' };
  if (value >= 60) return { label: 'Limited listing data', color: '#C8A24A' };
  return { label: 'Low confidence', color: '#EF4444' };
}

export function ConfidenceMeter({ value = 82, size = 'md' }: ConfidenceMeterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 50;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  const { label, color } = getConfidenceLabel(displayValue);
  const barWidth = `${displayValue}%`;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const valueSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <span className={`${textSize} font-medium uppercase tracking-wider text-white/40`}>
          AI Confidence Meter™
        </span>
        <span className={`${valueSize} font-bold tabular-nums`} style={{ color }}>
          {displayValue}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-100 ease-linear"
          style={{ width: barWidth, backgroundColor: color }}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
    </div>
  );
}
