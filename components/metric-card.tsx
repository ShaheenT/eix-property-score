'use client';

import { useEffect, useRef, useState } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  delay?: number;
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendUp = true,
  icon,
  delay = 0,
}: MetricCardProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`group glass relative overflow-hidden rounded-2xl p-5 transition-all duration-500 hover:border-emerald-500/30 hover:bg-white/[0.05] ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl transition-opacity duration-500 group-hover:bg-emerald-500/10" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
              trendUp
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            <span>{trendUp ? '↑' : '↓'}</span>
            {trend}
          </div>
        )}
      </div>

      <div className="relative mt-4">
        <div className="text-xs font-medium uppercase tracking-wider text-white/40">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{value}</span>
          {unit && (
            <span className="text-sm font-medium text-white/40">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
