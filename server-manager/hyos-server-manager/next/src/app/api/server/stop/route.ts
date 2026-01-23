import { NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function POST() {
  try {
    const adapter = await getAdapter();
    await adapter.stop();
    
    return NextResponse.json({ success: true, message: 'Server stopping' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop server' },
      { status: 500 }
    );
  }
}
