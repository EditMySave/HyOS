import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const x = parseInt(searchParams.get('x') || '');
    const y = parseInt(searchParams.get('y') || '');
    const z = parseInt(searchParams.get('z') || '');
    
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      return NextResponse.json({ error: 'x, y, z query params are required' }, { status: 400 });
    }
    
    const adapter = await getAdapter();
    const result = await adapter.getBlock(id, x, y, z);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get block' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { x, y, z, blockId, nbt } = body;
    
    if (x === undefined || y === undefined || z === undefined) {
      return NextResponse.json({ error: 'x, y, z are required' }, { status: 400 });
    }
    if (!blockId) {
      return NextResponse.json({ error: 'blockId is required' }, { status: 400 });
    }
    
    const adapter = await getAdapter();
    const result = await adapter.setBlock(id, x, y, z, blockId, nbt);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set block' },
      { status: 500 }
    );
  }
}
