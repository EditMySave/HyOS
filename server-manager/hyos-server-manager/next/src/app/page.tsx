'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// Types
interface ServerStatus {
  online: boolean;
  name: string;
  motd: string;
  version: string;
  playerCount: number;
  maxPlayers: number;
  uptime: number | null;
  state: string;
  memory: { used: number; max: number; free: number } | null;
}

interface Player {
  uuid: string;
  name: string;
  world: string;
}

interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

interface LogsResponse {
  logs: string;
  auth: {
    waiting: boolean;
    url: string | null;
    code: string | null;
  };
  timestamp: number;
}

interface Config {
  adapterType: string;
  containerName: string;
  serverHost: string;
  serverPort: number;
  stateDir: string;
  restApiUrl: string;
  restApiClientId: string;
}

interface SetupStatus {
  setupComplete: boolean;
  apiClientId?: string;
  hasSecret?: boolean;
}

// =============================================================================
// Setup Wizard Component
// =============================================================================
function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [clientId, setClientId] = useState('hyos-manager');
  const [clientSecret, setClientSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (clientSecret !== confirmSecret) {
      setError('Passwords do not match');
      return;
    }

    if (clientSecret.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiClientId: clientId,
          apiClientSecret: clientSecret,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onComplete();
      }
    } catch (e) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            HyOS Server Manager
          </h1>
          <p className="text-[#888888]">Initial Setup</p>
        </div>

        <div className="bg-[#151515] rounded-2xl p-8 border border-[#222222]">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#222222] rounded-full flex items-center justify-center border border-[#333333]">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Configure API Access</h2>
                <p className="text-sm text-[#666666]">Set credentials for the REST API plugin</p>
              </div>
            </div>
            <p className="text-[#888888] text-sm">
              These credentials will be used by the Server Manager to communicate with your Hytale server
              via the REST API plugin. The password will be securely hashed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#555555]"
                required
              />
              <p className="text-[#555555] text-xs mt-1">Identifier for the API client</p>
            </div>

            <div>
              <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">
                Password
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#555555]"
                required
                minLength={8}
              />
              <p className="text-[#555555] text-xs mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmSecret}
                onChange={(e) => setConfirmSecret(e.target.value)}
                placeholder="Confirm your password"
                className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#555555]"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !clientSecret || !confirmSecret}
              className="w-full py-3 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {saving ? 'Saving...' : 'Complete Setup'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#222222]">
            <p className="text-[#666666] text-xs text-center">
              These credentials are saved locally and shared with your Hytale server container.
              The server will automatically configure the API plugin on next restart.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Dashboard Component
// =============================================================================
export default function Dashboard() {
  // Setup state
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Logs state
  const [logs, setLogs] = useState<string>('');
  const [authPrompt, setAuthPrompt] = useState<{ waiting: boolean; url: string | null; code: string | null }>({
    waiting: false,
    url: null,
    code: null,
  });
  const [autoScroll, setAutoScroll] = useState(true);
  const [logsTail, setLogsTail] = useState(200);
  const logsRef = useRef<HTMLPreElement>(null);
  
  // Config state
  const [config, setConfig] = useState<Config | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [editContainerName, setEditContainerName] = useState('');
  const [editAdapterType, setEditAdapterType] = useState('console');
  const [editRestApiUrl, setEditRestApiUrl] = useState('');
  const [editRestApiClientId, setEditRestApiClientId] = useState('');
  const [editRestApiClientSecret, setEditRestApiClientSecret] = useState('');

  // Check setup status on mount
  const checkSetup = useCallback(async () => {
    try {
      const res = await fetch('/api/setup');
      const data = await res.json();
      setSetupStatus(data);
    } catch (e) {
      // If we can't check setup, assume it's not complete
      setSetupStatus({ setupComplete: false });
    } finally {
      setCheckingSetup(false);
    }
  }, []);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/server/status');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStatus(data);
        setError(null);
      }
    } catch (e) {
      setError('Failed to fetch status');
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/server/players');
      const data = await res.json();
      if (data.players) {
        setPlayers(data.players);
      }
    } catch (e) {
      // Ignore player fetch errors
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/server/logs?tail=${logsTail}`);
      const data: LogsResponse = await res.json();
      if (data.logs !== undefined) {
        setLogs(data.logs);
        setAuthPrompt(data.auth);
        
        // Auto-scroll to bottom
        if (autoScroll && logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
      }
    } catch (e) {
      // Ignore log fetch errors
    }
  }, [logsTail, autoScroll]);

  const fetchConfig = useCallback(async () => {
    try {
      // Fetch runtime config
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
      setEditContainerName(data.containerName);
      setEditAdapterType(data.adapterType);
      setEditRestApiUrl(data.restApiUrl || '');
      setEditRestApiClientId(data.restApiClientId || '');
      
      // Also refresh setup status for the config panel
      const setupRes = await fetch('/api/setup');
      const setupData = await setupRes.json();
      setSetupStatus(setupData);
    } catch (e) {
      // Ignore config fetch errors
    }
  }, []);

  const updateConfig = async (updates: Partial<{
    containerName: string;
    adapterType: string;
    restApiUrl: string;
    restApiClientId: string;
    restApiClientSecret: string;
  }>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setEditContainerName(data.config.containerName);
        setEditAdapterType(data.config.adapterType);
        setEditRestApiUrl(data.config.restApiUrl || '');
        setEditRestApiClientId(data.config.restApiClientId || '');
        // Clear secret field after successful save
        if (updates.restApiClientSecret) {
          setEditRestApiClientSecret('');
        }
        // Refresh data after config change
        fetchStatus();
        fetchLogs();
        return true;
      }
    } catch (e) {
      alert('Failed to update config');
    }
    return false;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchStatus(), fetchPlayers(), fetchLogs()]);
      setLoading(false);
    };
    load();

    // Poll status every 5 seconds, logs every 2 seconds
    const statusInterval = setInterval(() => {
      fetchStatus();
      fetchPlayers();
    }, 5000);
    
    const logsInterval = setInterval(fetchLogs, 2000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(logsInterval);
    };
  }, [fetchConfig, fetchStatus, fetchPlayers, fetchLogs]);

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    setActionLoading('command');
    try {
      const res = await fetch('/api/server/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim() }),
      });
      const data = await res.json();
      setCommandResult(data);
      setCommand(''); // Clear input on success
    } catch (e) {
      setCommandResult({ success: false, output: '', error: 'Failed to execute command' });
    }
    setActionLoading(null);
  };

  const serverAction = async (action: 'start' | 'stop' | 'restart' | 'save') => {
    setActionLoading(action);
    try {
      const endpoint = action === 'save' ? '/api/world/save' : `/api/server/${action}`;
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        // Refresh immediately after action
        setTimeout(() => {
          fetchStatus();
          fetchLogs();
        }, 1000);
      }
    } catch (e) {
      alert(`Failed to ${action}`);
    }
    setActionLoading(null);
  };

  const broadcast = async () => {
    const message = prompt('Enter broadcast message:');
    if (!message) return;
    
    setActionLoading('broadcast');
    try {
      const res = await fetch('/api/world/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Failed to broadcast');
    }
    setActionLoading(null);
  };

  const formatUptime = (ms: number | null) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatMemory = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  // Parse player count from logs if HyQuery doesn't provide it
  const getPlayerCountFromLogs = () => {
    // Look for player join/leave messages
    const joinMatches = logs.match(/\[INFO\].*player.*joined|connected/gi) || [];
    const leaveMatches = logs.match(/\[INFO\].*player.*left|disconnected/gi) || [];
    return Math.max(0, joinMatches.length - leaveMatches.length);
  };

  // Show loading spinner while checking setup
  if (checkingSetup) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-xl text-[#888888]">Loading...</div>
      </div>
    );
  }

  // Show setup wizard if not configured
  if (!setupStatus?.setupComplete) {
    return (
      <SetupWizard
        onComplete={() => {
          setSetupStatus({ setupComplete: true });
          // Reset adapter to pick up new credentials
          fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-xl text-[#888888]">Loading server data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              HyOS Server Manager
          </h1>
            <p className="text-[#666666] mt-1">Development Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/commands"
              className="px-3 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Commands
            </Link>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-2 bg-[#1a1a1a] border border-[#333333] hover:bg-[#222222] rounded-lg text-sm font-medium transition flex items-center gap-2"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {config?.containerName || 'hyos'}
            </button>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full animate-pulse ${status?.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-sm text-[#888888]">{status?.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </header>

        {/* Config Panel */}
        {showConfig && (
          <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Configuration</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-[#666666] hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">Container Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editContainerName}
                    onChange={(e) => setEditContainerName(e.target.value)}
                    className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#555555]"
                  />
                  <button
                    onClick={() => updateConfig({ containerName: editContainerName })}
                    disabled={editContainerName === config?.containerName}
                    className="px-4 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[#555555] text-xs mt-2">Docker container to manage</p>
              </div>
              <div>
                <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">Adapter Type</label>
                <div className="flex gap-2">
                  <select
                    value={editAdapterType}
                    onChange={(e) => setEditAdapterType(e.target.value)}
                    className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                  >
                    <option value="console">Console (Docker exec)</option>
                    <option value="rest">REST API (Plugin)</option>
                  </select>
                  <button
                    onClick={() => updateConfig({ adapterType: editAdapterType })}
                    disabled={editAdapterType === config?.adapterType}
                    className="px-4 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[#555555] text-xs mt-2">How to communicate with the server</p>
              </div>
            </div>
            
            {/* REST API Settings */}
            {editAdapterType === 'rest' && (
              <div className="border-t border-[#222222] pt-4 mt-4">
                <h3 className="text-sm font-semibold text-[#888888] mb-4">REST API Plugin Settings</h3>
                
                {/* Show saved credentials status */}
                {setupStatus?.setupComplete && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-emerald-400 text-sm">
                      API credentials configured (Client ID: {setupStatus.apiClientId || editRestApiClientId})
                    </span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">API URL</label>
                    <input
                      type="text"
                      value={editRestApiUrl}
                      onChange={(e) => setEditRestApiUrl(e.target.value)}
                      placeholder="http://hytale:8080"
                      className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#555555]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">Client ID</label>
                    <div className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-[#888888] font-mono text-sm">
                      {setupStatus?.apiClientId || editRestApiClientId || 'hyos-manager'}
                    </div>
                    <p className="text-[#555555] text-xs mt-1">Set during initial setup</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[#666666] text-xs uppercase tracking-wide mb-2">
                      Change Password
                      <span className="text-[#555555] ml-1">(leave empty to keep current)</span>
                    </label>
                    <input
                      type="password"
                      value={editRestApiClientSecret}
                      onChange={(e) => setEditRestApiClientSecret(e.target.value)}
                      placeholder="Enter new password to change"
                      className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#555555]"
                    />
                    <p className="text-[#555555] text-xs mt-2">
                      Changing the password requires restarting the Hytale server to apply
          </p>
        </div>
                  <div className="md:col-span-2 flex gap-3">
                    <button
                      onClick={async () => {
                        const success = await updateConfig({
                          adapterType: 'rest',
                          restApiUrl: editRestApiUrl,
                        });
                        if (success) {
                          alert('API URL saved!');
                        }
                      }}
                      disabled={!editRestApiUrl}
                      className="px-6 py-2 bg-[#222222] border border-[#333333] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition"
                    >
                      Save URL
                    </button>
                    {editRestApiClientSecret && (
                      <button
                        onClick={async () => {
                          if (!confirm('Changing the API password requires restarting the Hytale server. Continue?')) return;
                          
                          // Save to the setup config file
                          const res = await fetch('/api/setup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              apiClientId: setupStatus?.apiClientId || editRestApiClientId || 'hyos-manager',
                              apiClientSecret: editRestApiClientSecret,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setEditRestApiClientSecret('');
                            alert('Password changed! Restart the Hytale server to apply.');
                          } else {
                            alert(data.error || 'Failed to change password');
                          }
                        }}
                        className="px-6 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] rounded-lg font-medium text-sm transition"
                      >
                        Change Password
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Read-only info */}
            <div className="border-t border-[#222222] pt-4 mt-4">
              <h3 className="text-sm font-semibold text-[#888888] mb-4">Environment Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#666666]">Server Host:</span>
                  <span className="ml-2 font-mono text-[#a1a1a1]">{config?.serverHost || 'N/A'}:{config?.serverPort || 5520}</span>
                </div>
                <div>
                  <span className="text-[#666666]">State Dir:</span>
                  <span className="ml-2 font-mono text-[#a1a1a1] truncate">{config?.stateDir || '/data/.state'}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Authentication Alert */}
        {authPrompt.waiting && authPrompt.url && (
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🔑</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
                <p className="text-[#888888] mb-4">
                  The server is waiting for you to authenticate. Click the button below or visit the URL manually.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href={authPrompt.url}
            target="_blank"
            rel="noopener noreferrer"
                    className="px-6 py-3 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] rounded-lg font-medium transition inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Authenticate Now
                  </a>
                  <div className="text-[#888888]">
                    Code: <code className="bg-[#0d0d0d] px-2 py-1 rounded font-mono text-white border border-[#333333]">{authPrompt.code}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Status & Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Server Status Card */}
            <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
              <h2 className="text-lg font-semibold mb-4 text-white">Server Status</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[#666666] text-xs uppercase tracking-wide">State</div>
                    <div className="text-lg font-medium capitalize flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        status?.state === 'running' ? 'bg-emerald-500' :
                        status?.state === 'starting' ? 'bg-yellow-500 animate-pulse' :
                        'bg-red-500'
                      }`} />
                      {status?.state || 'unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#666666] text-xs uppercase tracking-wide">Players</div>
                    <div className="text-lg font-medium">
                      <span className="text-white">{status?.playerCount || 0}</span>
                      <span className="text-[#666666]"> / {status?.maxPlayers || 20}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[#666666] text-xs uppercase tracking-wide">Name</div>
                  <div className="font-medium truncate text-[#a1a1a1]">{status?.name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[#666666] text-xs uppercase tracking-wide">Version</div>
                  <div className="font-mono text-sm text-[#a1a1a1]">{status?.version || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[#666666] text-xs uppercase tracking-wide">Uptime</div>
                  <div className="font-medium text-[#a1a1a1]">{formatUptime(status?.uptime ?? null)}</div>
                </div>
                {status?.memory && (
                  <div>
                    <div className="text-[#666666] text-xs uppercase tracking-wide">Memory</div>
                    <div className="font-medium">
                      <span className="text-white">{formatMemory(status.memory.used)}</span>
                      <span className="text-[#666666]"> / {formatMemory(status.memory.max)}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Server Controls */}
            <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
              <h2 className="text-lg font-semibold mb-4 text-white">Controls</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => serverAction('start')}
                  disabled={actionLoading !== null || status?.state === 'running'}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  {actionLoading === 'start' ? '...' : 'Start'}
                </button>
                <button
                  onClick={() => serverAction('stop')}
                  disabled={actionLoading !== null || status?.state !== 'running'}
                  className="px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12"/>
                  </svg>
                  {actionLoading === 'stop' ? '...' : 'Stop'}
                </button>
                <button
                  onClick={() => serverAction('restart')}
                  disabled={actionLoading !== null}
                  className="px-4 py-3 bg-[#222222] border border-[#333333] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {actionLoading === 'restart' ? '...' : 'Restart'}
                </button>
                <button
                  onClick={() => serverAction('save')}
                  disabled={actionLoading !== null || status?.state !== 'running'}
                  className="px-4 py-3 bg-[#222222] border border-[#333333] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {actionLoading === 'save' ? '...' : 'Save'}
                </button>
              </div>
              <button
                onClick={broadcast}
                disabled={actionLoading !== null || status?.state !== 'running'}
                className="w-full mt-3 px-4 py-3 bg-[#222222] border border-[#333333] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                {actionLoading === 'broadcast' ? '...' : 'Broadcast Message'}
              </button>
            </section>

            {/* Players List */}
            <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
              <h2 className="text-lg font-semibold mb-4 text-white">
                Players ({players.length || status?.playerCount || 0})
              </h2>
              {players.length === 0 ? (
                <div className="text-[#666666] text-sm space-y-2">
                  {status?.playerCount && status.playerCount > 0 ? (
                    <p>{status.playerCount} player(s) online</p>
                  ) : (
                    <p>No players online</p>
                  )}
                  {config?.adapterType !== 'rest' && (
                    <p className="text-[#555555] text-xs">
                      💡 Switch to REST adapter in Config for player names and details
                    </p>
                  )}
                  {config?.adapterType === 'rest' && status?.state === 'starting' && (
                    <p className="text-[#555555] text-xs">
                      ⏳ Waiting for REST API plugin to load...
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.uuid}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-xs text-[#666666] font-mono">{player.uuid.slice(0, 8)}...</div>
                      </div>
                      <button
                        onClick={async () => {
                          const reason = prompt('Kick reason (optional):');
                          await fetch(`/api/player/${player.uuid}/kick`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason }),
                          });
                          fetchPlayers();
                        }}
                        className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-sm transition"
                      >
                        Kick
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Logs & Console */}
          <div className="lg:col-span-2 space-y-6">
            {/* Command Console */}
            <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
              <h2 className="text-lg font-semibold mb-4 text-white">Command Console</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                  placeholder="Enter server command (e.g., say Hello World)"
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#555555] focus:outline-none focus:border-[#555555] font-mono"
                />
                <button
                  onClick={executeCommand}
                  disabled={actionLoading === 'command' || !command.trim()}
                  className="px-6 py-3 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
                >
                  {actionLoading === 'command' ? '...' : 'Run'}
                </button>
              </div>
              {commandResult && (
                <div className={`mt-4 p-4 rounded-lg font-mono text-sm ${
                  commandResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  <pre className="whitespace-pre-wrap">{commandResult.output || commandResult.error || 'Command executed'}</pre>
                </div>
              )}
            </section>

            {/* Server Logs */}
            <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Server Logs</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#888888]">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded border-[#333333] bg-[#0d0d0d] text-white focus:ring-[#555555]"
                    />
                    Auto-scroll
                  </label>
                  <select
                    value={logsTail}
                    onChange={(e) => setLogsTail(parseInt(e.target.value))}
                    className="bg-[#0d0d0d] border border-[#333333] rounded px-2 py-1 text-sm text-[#a1a1a1]"
                  >
                    <option value={50}>50 lines</option>
                    <option value={100}>100 lines</option>
                    <option value={200}>200 lines</option>
                    <option value={500}>500 lines</option>
                  </select>
                </div>
              </div>
              <pre
                ref={logsRef}
                className="bg-[#0d0d0d] rounded-lg p-4 font-mono text-xs text-[#a1a1a1] overflow-auto max-h-[500px] whitespace-pre-wrap border border-[#222222]"
              >
                {logs || 'No logs available. The container may not be running.'}
              </pre>
            </section>

            {/* Quick Actions */}
            <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
              <h2 className="text-lg font-semibold mb-4 text-white">Quick Commands</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'List Players', cmd: 'list' },
                  { label: 'Server Info', cmd: 'info' },
                  { label: 'Help', cmd: 'help' },
                  { label: 'Time Day', cmd: 'time set day' },
                  { label: 'Time Night', cmd: 'time set night' },
                  { label: 'Weather Clear', cmd: 'weather clear' },
                ].map((item) => (
                  <button
                    key={item.cmd}
                    onClick={() => {
                      setCommand(item.cmd);
                      // Auto-execute
                      fetch('/api/server/command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ command: item.cmd }),
                      })
                        .then((res) => res.json())
                        .then((data) => setCommandResult(data))
                        .catch(() => setCommandResult({ success: false, output: '', error: 'Failed' }));
                    }}
                    className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222222] rounded-lg text-sm font-mono transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-[#555555] text-sm pt-4 border-t border-[#222222]">
          HyOS Server Manager • Adapter: Console • Polling: 2s (logs) / 5s (status)
        </footer>
      </div>
    </div>
  );
}
