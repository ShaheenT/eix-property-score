'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { SuccessCard } from '@/components/success-card';

export default function ProSuccessPage() {
  const [mounted, setMounted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('Confirming your Pro payment…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentSubmissionId = new URLSearchParams(window.location.search).get('submission_id');
    setSubmissionId(currentSubmissionId);
    if (!currentSubmissionId) {
      setStatus('Your payment return did not include the property reference.');
      setFailed(true);
      return;
    }

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/report/status?submission_id=${encodeURIComponent(currentSubmissionId)}&report_type=investor_report_pro`,
          { cache: 'no-store' },
        );
        const data = await response.json();
        if (data.status === 'completed' && typeof data.reportUrl === 'string') {
          setReportUrl(data.reportUrl);
          setStatus('Your Investor Report Pro is ready.');
          return;
        }
        if (data.status === 'awaiting_payment') setStatus('Confirming your R349 payment with PayFast…');
        else if (data.status === 'processing' || data.status === 'queued') setStatus('Your Investor Report Pro is being prepared…');
        else if (data.status === 'failed') setStatus('We are retrying your Pro report preparation…');
      } catch {
        setStatus('We are checking your Pro report status…');
      }

      if (attempts < 30) timer = setTimeout(check, 2000);
      else {
        setStatus('Your payment is recorded, but the Pro report is taking longer than expected. Please try again shortly.');
        setFailed(true);
      }
    };

    void check();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight flex items-center justify-center px-6 py-20">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0"><div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[120px]" /></div>
      <div className={`relative z-10 w-full max-w-2xl ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
        <div className="mb-8 flex items-center justify-center"><img src="/eixproplogo.png" alt="EiX Property Score" className="h-16 w-auto object-contain" /></div>
        <SuccessCard
          title="Investor Report Pro Purchased"
          message="Your R349 upgrade is attached to the same property submission as your standard report."
          steps={[
            'PayFast payment confirmation is checked securely.',
            'The Investor Report Pro analysis is generated from verified property evidence.',
            reportUrl ? 'Your Investor Report Pro is ready.' : status,
          ]}
          accent="gold"
        />
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          {reportUrl ? <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-gold-400" />
            <p className="mt-3 text-lg font-semibold">Your Investor Report Pro is ready</p>
            <a href={reportUrl} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold-400 px-8 py-4 text-sm font-bold text-midnight-900 transition-all hover:brightness-110">View Investor Report<ArrowRight className="h-4 w-4" /></a>
          </> : <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold-400" />
            <p className="mt-3 text-sm text-white/60">{status}</p>
            {failed && <p className="mt-2 text-xs text-white/40">Your payment remains recorded. Do not pay again.</p>}
          </>}
        </div>
        <div className="mt-8 text-center"><a href={submissionId ? `/success?submission_id=${encodeURIComponent(submissionId)}` : '/'} className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white">Back to Property Score<ArrowRight className="h-4 w-4" /></a></div>
      </div>
    </main>
  );
}
