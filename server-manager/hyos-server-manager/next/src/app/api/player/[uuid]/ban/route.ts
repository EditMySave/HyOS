import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, duration } = body;
    
    const adapter = await getAdapter();
    await adapter.banPlayer(uuid, reason, duration);
    
    return NextResponse.json({ success: true, message: `Player ${uuid} banned` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to ban player' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    
    const adapter = await getAdapter();
    await adapter.unbanPlayer(uuid);
    
    return NextResponse.json({ success: true, message: `Player ${uuid} unbanned` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unban player' },
      { status: 500 }
    );
  }
}
