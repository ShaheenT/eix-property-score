import { NextResponse } from 'next/server';
import { verifyVerificationLedger } from '@/lib/verification/verify-ledger';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { ledgerId: string } },
) {
  const ledgerId = decodeURIComponent(params.ledgerId).trim();

  if (!/^EIX-\d{4}-\d{6}$/.test(ledgerId)) {
    return NextResponse.json(
      { valid: false, reason: 'Invalid EiX verification ledger ID.' },
      { status: 400 },
    );
  }

  try {
    const result = await verifyVerificationLedger(ledgerId);
    return NextResponse.json(result, { status: result.valid || result.reason === 'Ledger not found.' ? 200 : 409 });
  } catch {
    return NextResponse.json(
      { valid: false, reason: 'Verification service temporarily unavailable.' },
      { status: 503 },
    );
  }
}
