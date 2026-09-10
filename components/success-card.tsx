'use client';

import { CheckCircle2 } from 'lucide-react';

interface SuccessCardProps {
  title: string;
  message: string;
  steps: string[];
  accent?: 'teal' | 'gold';
}

export function SuccessCard({
  title,
  message,
  steps,
  accent = 'teal',
}: SuccessCardProps) {
  const accentColor = accent === 'gold' ? 'text-gold-400' : 'text-teal-400';
  const accentBg =
    accent === 'gold' ? 'bg-gold-500/15 ring-gold-500/30' : 'bg-teal-500/15 ring-teal-500/30';
  const cardBorder =
    accent === 'gold' ? 'border-gold-500/20' : 'border-teal-500/20';

  return (
    <div className="glass-strong mx-auto max-w-xl rounded-3xl p-8 text-center sm:p-10 animate-scale-in">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ring-1 ${accentBg}`}
      >
        <CheckCircle2 className={`h-8 w-8 ${accentColor}`} />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-white/60">{message}</p>
      <div className={`mt-8 rounded-2xl border ${cardBorder} bg-white/5 p-6 text-left`}>
        <h2 className={`font-bold ${accentColor}`}>What happens next</h2>
        <ul className="mt-4 space-y-3 text-sm text-white/70">
          {steps.map((step) => (
            <li key={step} className="flex items-start gap-2.5">
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accentColor}`} />
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
