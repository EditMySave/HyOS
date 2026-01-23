import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adapter = await getAdapter();
    const result = await adapter.getWorldWeather(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get world weather' },
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
    const { weather, duration } = body;
    
    if (!weather) {
      return NextResponse.json({ error: 'weather is required' }, { status: 400 });
    }
    
    const validWeathers = ['clear', 'rain', 'thunder'];
    if (!validWeathers.includes(weather)) {
      return NextResponse.json({ error: 'weather must be clear, rain, or thunder' }, { status: 400 });
    }
    
    const adapter = await getAdapter();
    const result = await adapter.setWorldWeather(id, weather, duration);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set world weather' },
      { status: 500 }
    );
  }
}
