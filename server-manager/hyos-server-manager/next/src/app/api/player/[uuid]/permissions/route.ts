import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const adapter = await getAdapter();
    const result = await adapter.getPermissions(uuid);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get permissions' },
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
    const { permission } = body;
    
    if (!permission) {
      return NextResponse.json({ error: 'permission is required' }, { status: 400 });
    }
    
    const adapter = await getAdapter();
    const result = await adapter.grantPermission(uuid, permission);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to grant permission' },
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
    const { searchParams } = new URL(request.url);
    const permission = searchParams.get('permission');
    
    if (!permission) {
      return NextResponse.json({ error: 'permission query param is required' }, { status: 400 });
    }
    
    const adapter = await getAdapter();
    const result = await adapter.revokePermission(uuid, permission);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke permission' },
      { status: 500 }
    );
  }
}
