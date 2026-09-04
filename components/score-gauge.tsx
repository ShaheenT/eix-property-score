'use client';

import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score?: number;
  size?: number;
}

export function ScoreGauge({ score = 91, size = 220 }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const duration = 2000;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [score]);

  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const fillPercentage = mounted ? displayScore / 100 : 0;
  const dashoffset = arcLength - arcLength * fillPercentage;
  const center = size / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-[135deg] transform"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C48C" />
            <stop offset="50%" stopColor="#00E6A8" />
            <stop offset="100%" stopColor="#00FFC2" />
          </linearGradient>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
          style={{
            transition: 'stroke-dashoffset 0.05s linear',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-400/70">
          Investment Score
        </div>
        <div className="mt-1 flex items-baseline">
          <span className="text-6xl font-bold text-white tabular-nums">
            {displayScore}
          </span>
          <span className="ml-1 text-2xl font-light text-white/40">/100</span>
        </div>
        <div className="mt-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
          Excellent
        </div>
      </div>

      <div className="absolute inset-0 -z-10 rounded-full bg-emerald-500/10 blur-3xl" />
    </div>
  );
}
