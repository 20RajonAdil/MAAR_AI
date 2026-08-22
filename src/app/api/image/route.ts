import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai/providers/openrouter-image';
import { getModel, IMAGE_MODEL_ID } from '@/lib/ai/models';
import { friendlyErrorMessage } from '@/lib/ai/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const prompt: string = typeof payload?.prompt === 'string' ? payload.prompt.trim() : '';
  const modelId: string = typeof payload?.model === 'string' ? payload.model : IMAGE_MODEL_ID;

  if (!prompt) {
    return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 });
  }

  const model = getModel(modelId);
  if (!model || !model.capabilities.outputs?.includes('image')) {
    return NextResponse.json(
      { errorCode: 'model-unavailable', error: friendlyErrorMessage('model-unavailable') },
      { status: 400 },
    );
  }

  const result = await generateImage(modelId, prompt, req.signal);

  if (!result.ok) {
    return NextResponse.json(
      { errorCode: result.errorCode, error: friendlyErrorMessage(result.errorCode) },
      { status: 502 },
    );
  }

  return NextResponse.json({ images: result.images });
}
