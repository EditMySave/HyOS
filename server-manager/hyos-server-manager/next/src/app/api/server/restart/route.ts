import { NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function POST() {
  try {
    const adapter = await getAdapter();
    await adapter.restart();
    
    return NextResponse.json({ success: true, message: 'Server restarting' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restart server' },
      { status: 500 }
    );
  }
}
