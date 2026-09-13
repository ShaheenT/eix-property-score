import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeProperty, fetchAndAnalyze, type CanonicalProperty } from '@/lib/eix-engine';

const bodySchema = z.object({
  url: z.string().url().optional(),
  property: z.object({
    address: z.string().optional(),
    suburb: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    price: z.number().positive().optional(),
    bedrooms: z.number().int().positive().optional(),
    bathrooms: z.number().positive().optional(),
    floorAreaM2: z.number().positive().optional(),
    erfAreaM2: z.number().positive().optional(),
    propertyType: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    if (!body.url && !body.property) return NextResponse.json({ error: 'Provide a property URL or property facts.' }, { status: 400 });
    const analysis = body.url
      ? await fetchAndAnalyze(body.url)
      : analyzeProperty({ ...(body.property as CanonicalProperty), sourceType: 'manual', features: [], evidence: [] });
    return NextResponse.json({ ok: true, analysis }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyse property.';
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
