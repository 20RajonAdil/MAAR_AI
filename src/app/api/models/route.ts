import { NextResponse } from 'next/server';
import { MODELS } from '@/lib/ai/models';

export const dynamic = 'force-static';

/**
 * Exposes the model registry to the client. Deliberately returns only
 * public metadata (id/label/description/capabilities) — never anything
 * from the server environment.
 */
export async function GET() {
  return NextResponse.json({ models: MODELS });
}
