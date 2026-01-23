/**
 * Setup API
 * 
 * Handles initial configuration and persistent settings storage.
 * Settings are stored in the shared data volume so both the manager
 * and Hytale server can access them.
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '@/lib/config';

const SETUP_FILE = 'manager-config.json';

interface ManagerConfig {
  apiClientId: string;
  apiClientSecret: string;  // Plaintext - will be hashed by the server
  setupComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the path to the setup config file
 */
function getConfigPath(): string {
  const stateDir = getConfig('HYTALE_STATE_DIR', '/data/.state');
  return path.join(stateDir, SETUP_FILE);
}

/**
 * Read the current config
 */
async function readConfig(): Promise<ManagerConfig | null> {
  try {
    const configPath = getConfigPath();
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error('Failed to read manager config:', error);
    return null;
  }
}

/**
 * Write the config
 */
async function writeConfig(config: ManagerConfig): Promise<void> {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  
  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  
  // Write atomically
  const tempPath = `${configPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(config, null, 2));
  await fs.rename(tempPath, configPath);
}

/**
 * Check if credentials are set via environment variables
 */
function hasEnvCredentials(): boolean {
  const envSecret = process.env.REST_API_CLIENT_SECRET || process.env.API_CLIENT_SECRET;
  return !!envSecret;
}

/**
 * GET - Check setup status
 * Priority: 1) Saved config file, 2) Environment variables
 */
export async function GET() {
  // First check saved config file
  const config = await readConfig();
  
  if (config && config.setupComplete) {
    return NextResponse.json({
      setupComplete: true,
      configuredVia: 'file',
      apiClientId: config.apiClientId,
      // Never return the secret
      hasSecret: !!config.apiClientSecret,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  }
  
  // Fall back to environment variables
  if (hasEnvCredentials()) {
    const clientId = process.env.REST_API_CLIENT_ID || process.env.API_CLIENT_ID || 'hyos-manager';
    return NextResponse.json({
      setupComplete: true,
      configuredVia: 'environment',
      apiClientId: clientId,
      hasSecret: true,
      message: 'Credentials configured via environment variables',
    });
  }
  
  return NextResponse.json({
    setupComplete: false,
    message: 'Initial setup required',
  });
}

/**
 * POST - Complete initial setup or update settings
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiClientId, apiClientSecret } = body;
    
    if (!apiClientId || !apiClientSecret) {
      return NextResponse.json(
        { error: 'Client ID and secret are required' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (apiClientSecret.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    const existingConfig = await readConfig();
    const now = new Date().toISOString();
    
    const config: ManagerConfig = {
      apiClientId,
      apiClientSecret,
      setupComplete: true,
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
    };
    
    await writeConfig(config);
    
    return NextResponse.json({
      success: true,
      message: 'Setup complete',
      apiClientId: config.apiClientId,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Reset setup (for development/testing)
 */
export async function DELETE() {
  try {
    const configPath = getConfigPath();
    await fs.unlink(configPath);
    return NextResponse.json({ success: true, message: 'Setup reset' });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ success: true, message: 'No setup to reset' });
    }
    return NextResponse.json(
      { error: 'Failed to reset setup' },
      { status: 500 }
    );
  }
}
