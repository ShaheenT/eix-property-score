import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractPropertyFromUrl } from '@/lib/property-extractor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = typeof body.submissionId === 'string' ? body.submissionId : '';

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('property_submissions')
      .select('id, listing_url, status, goal')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'paid') {
      return NextResponse.json({ error: 'Submission is not paid' }, { status: 409 });
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, status, report_type')
      .eq('submission_id', submissionId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Queued report not found' }, { status: 404 });
    }

    if (report.status === 'sent') {
      return NextResponse.json({ status: 'already_sent', reportId: report.id });
    }

    const extraction = await extractPropertyFromUrl(submission.listing_url);

    if (extraction.status !== 'extracted') {
      await supabaseAdmin
        .from('reports')
        .update({ status: 'failed' })
        .eq('id', report.id);

      return NextResponse.json(
        { error: 'Property could not be reliably extracted', extractionStatus: extraction.status },
        { status: 422 },
      );
    }

    const facts = extraction.facts;
    const scoreInputs = [
      facts.askingPriceCents,
      facts.bedrooms,
      facts.bathrooms,
      facts.floorSizeM2,
      facts.landSizeM2,
    ];

    if (!scoreInputs.some((value) => value !== null && value !== undefined)) {
      await supabaseAdmin.from('reports').update({ status: 'failed' }).eq('id', report.id);
      return NextResponse.json({ error: 'Insufficient property facts for scoring' }, { status: 422 });
    }

    return NextResponse.json({
      status: 'extracted',
      reportId: report.id,
      submissionId,
      facts,
      evidence: extraction.evidence,
      goal: submission.goal,
      reportType: report.report_type,
      message: 'Property facts extracted. Score calculation and report persistence remain to be implemented.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
