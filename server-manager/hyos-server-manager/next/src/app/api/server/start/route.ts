import { NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function POST() {
  try {
    const adapter = await getAdapter();
    await adapter.start();
    
    return NextResponse.json({ success: true, message: 'Server starting' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start server' },
      { status: 500 }
    );
  }
}
