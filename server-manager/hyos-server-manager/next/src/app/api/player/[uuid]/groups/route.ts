import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const adapter = await getAdapter();
    const result = await adapter.getGroups(uuid);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get groups' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const body = await request.json();
    const { group } = body;
    
    if (!group) {
      return NextResponse.json({ error: 'group is required' }, { status: 400 });
    }
    
    const adapter = await getAdapter();
    const result = await adapter.addToGroup(uuid, group);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add to group' },
      { status: 500 }
    );
  }
}
