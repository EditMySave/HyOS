import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const body = await request.json().catch(() => ({}));
    const { durationMinutes, reason } = body;
    
    const adapter = await getAdapter();
    const result = await adapter.mutePlayer(uuid, durationMinutes, reason);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mute player' },
      { status: 500 }
    );
  }
}
