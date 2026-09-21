'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { SuccessCard } from '@/components/success-card';

export default function SuccessPage() {
  const [mounted, setMounted] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState('Checking payment and preparing your report…');
  const [failed, setFailed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const currentSubmissionId = params.get('submission_id')?.trim() || '';
    const currentPaymentId = params.get('payment_id')?.trim() || '';
    const currentReference = params.get('reference')?.trim() || '';
    setSubmissionId(currentSubmissionId || null);

    if (!currentSubmissionId && !currentPaymentId) {
      setStatus('No payment reference was attached to this page. Please return to EiX and start a new property analysis.');
      setFailed(true);
      return;
    }

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      attempts += 1;
      try {
        const query = new URLSearchParams();
        if (currentSubmissionId) query.set('submission_id', currentSubmissionId);
        if (currentPaymentId) query.set('payment_id', currentPaymentId);
        if (currentReference) query.set('reference', currentReference);

        const response = await fetch(`/api/report/status?${query.toString()}`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));

        if (response.status === 404) {
          setStatus('We could not match the Paystack payment to your property submission. Please contact EiX support before submitting another payment.');
          setFailed(true);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Unable to confirm your payment.');
        }

        if (typeof data.submissionId === 'string') {
          setSubmissionId(data.submissionId);
        }

        if (data.status === 'completed' && typeof data.reportUrl === 'string') {
          setPaymentConfirmed(true);
          setReportUrl(data.reportUrl);
          setStatus('Your report is ready.');
          return;
        }
        if (data.status === 'awaiting_payment') {
          setStatus('Confirming your payment with Paystack…');
        } else if (data.status === 'processing' || data.status === 'queued') {
          setPaymentConfirmed(true);
          setStatus('Your property analysis is being prepared…');
        } else if (data.status === 'failed') {
          setPaymentConfirmed(true);
          setStatus('We are retrying your report preparation…');
        }
      } catch {
        setStatus('We are checking your report status…');
      }
      if (attempts < 30) timer = setTimeout(check, 2000);
      else {
        setStatus('Your payment is recorded, but the report is taking longer than expected. Please try again shortly.');
        setFailed(true);
      }
    };

    void check();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const proUrl = submissionId
    ? `/upsell/pro?submission_id=${encodeURIComponent(submissionId)}`
    : '/upsell/pro';

  const whatsappHref = reportUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Hi EiX, my Property Score report is ready. Here is my secure report link: ${window.location.origin}${reportUrl.startsWith('/') ? reportUrl : new URL(reportUrl).pathname + new URL(reportUrl).search}`)}`
    : null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight flex items-center justify-center px-6 py-20">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0"><div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[120px]" /></div>
      <div className={`relative z-10 w-full max-w-2xl ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
        <div className="mb-8 flex items-center justify-center"><img src="/eixproplogo.png" alt="EiX Property Score" className="h-16 w-auto object-contain" /></div>
        <SuccessCard
          title={paymentConfirmed ? 'Payment Received' : 'Confirming Your Payment'}
          message="Your EiX Property Score™ request is being checked securely. Once Paystack confirms the payment, we prepare the report from the property listing you submitted."
          steps={[
            'Payment confirmation is checked securely.',
            'Your submitted property listing is analysed.',
            reportUrl ? 'Your EiX Property Score™ report is ready.' : status,
          ]}
          accent="teal"
        />
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          {reportUrl ? <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-teal-400" />
            <p className="mt-3 text-lg font-semibold">Your R149 report is ready</p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href={reportUrl} className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-8 py-4 text-sm font-bold text-midnight-900 transition-all hover:brightness-110">View My Report<ArrowRight className="h-4 w-4" /></a>
              {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10">Open WhatsApp &amp; Send Report</a>}
            </div>
          </> : <>
            <Loader2 className={`mx-auto h-8 w-8 text-teal-400 ${failed ? '' : 'animate-spin'}`} />
            <p className="mt-3 text-sm text-white/60">{status}</p>
            {failed && <a href="/" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">Return to EiX<ArrowRight className="h-4 w-4" /></a>}
          </>}
        </div>
        {submissionId && paymentConfirmed && <div className="mt-8 text-center">
          <a href={proUrl} className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 px-8 py-4 text-sm font-bold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(200,162,74,0.5)] hover:brightness-110">Unlock Investor Report — R349<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a>
        </div>}
        <div className="mt-4 text-center"><a href="/" className="inline-block text-sm text-white/40 transition-colors hover:text-white">Analyze Another Property</a></div>
      </div>
    </main>
  );
}
