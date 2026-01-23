/**
 * Configuration API
 * 
 * Returns current configuration and allows runtime updates
 */

import { NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/lib/config';

export async function GET() {
  return NextResponse.json(getAllConfig());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Update runtime config
    if (body.containerName !== undefined) {
      setConfig('HYTALE_CONTAINER_NAME', body.containerName);
    }
    if (body.serverHost !== undefined) {
      setConfig('HYTALE_SERVER_HOST', body.serverHost);
    }
    if (body.serverPort !== undefined) {
      setConfig('HYTALE_SERVER_PORT', String(body.serverPort));
    }
    if (body.stateDir !== undefined) {
      setConfig('HYTALE_STATE_DIR', body.stateDir);
    }
    if (body.adapterType !== undefined) {
      setConfig('ADAPTER_TYPE', body.adapterType);
    }
    // REST API settings
    if (body.restApiUrl !== undefined) {
      setConfig('REST_API_URL', body.restApiUrl);
    }
    if (body.restApiClientId !== undefined) {
      setConfig('REST_API_CLIENT_ID', body.restApiClientId);
    }
    if (body.restApiClientSecret !== undefined) {
      setConfig('REST_API_CLIENT_SECRET', body.restApiClientSecret);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Configuration updated',
      config: getAllConfig(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
