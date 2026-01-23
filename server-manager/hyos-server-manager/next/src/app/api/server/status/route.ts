import { NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function GET() {
  try {
    const adapter = await getAdapter();
    const status = await adapter.getStatus();
    
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get server status' },
      { status: 500 }
    );
  }
}
