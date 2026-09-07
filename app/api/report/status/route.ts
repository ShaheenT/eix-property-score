import { NextRequest, NextResponse } from 'next/server';
import { processReport } from '@/lib/report-processor';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const submissionId = req.nextUrl.searchParams.get('submission_id')?.trim() || '';

  if (!submissionId) {
    return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
  }

  try {
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('property_submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'paid') {
      return NextResponse.json({ status: 'awaiting_payment' });
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, status, access_token, pdf_url')
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (reportError) throw reportError;

    if (!report) {
      return NextResponse.json({ status: 'queued' });
    }

    if (report.status === 'completed' || report.status === 'sent') {
      const reportUrl = report.pdf_url ||
        `${process.env.NEXT_PUBLIC_BASE_URL || 'https://eix-property-score-beta.vercel.app'}/report/${report.id}?token=${encodeURIComponent(report.access_token || '')}`;
      return NextResponse.json({ status: 'completed', reportUrl });
    }

    if (report.status === 'failed') {
      try {
        const result = await processReport(submissionId);
        if (result.status === 'completed' && 'reportUrl' in result) {
          return NextResponse.json({ status: 'completed', reportUrl: result.reportUrl });
        }
      } catch (error) {
        console.error('[Report Status] Retry failed', error);
      }
      return NextResponse.json({ status: 'failed' }, { status: 500 });
    }

    if (report.status === 'queued') {
      try {
        const result = await processReport(submissionId);
        if (result.status === 'completed' && 'reportUrl' in result) {
          return NextResponse.json({ status: 'completed', reportUrl: result.reportUrl });
        }
      } catch (error) {
        console.error('[Report Status] Processing failed', error);
      }
    }

    return NextResponse.json({ status: report.status });
  } catch (error) {
    console.error('[Report Status]', error);
    return NextResponse.json({ error: 'Unable to check report status' }, { status: 500 });
  }
}
