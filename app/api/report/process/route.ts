import { NextRequest, NextResponse } from 'next/server';
import { processReport } from '@/lib/report-processor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    const result = await processReport(submissionId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Report Process]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
