import { NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function POST() {
  try {
    const adapter = await getAdapter();
    await adapter.save();
    
    return NextResponse.json({ success: true, message: 'World saved' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save world' },
      { status: 500 }
    );
  }
}
