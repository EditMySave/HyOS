"use client";

import {
  AuthNotification,
  GameStats,
  HealthNotification,
  PerformanceChart,
  PlayerCountChart,
  PlayersTable,
  QuickActions,
  ServerStats,
} from "@/components/dashboard";

export default function Home() {
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Auth notification - shows when authentication is needed */}
      <AuthNotification />
      <HealthNotification />

      {/* Top row: Stats and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GameStats />
        <ServerStats />
        <QuickActions />
      </div>

      {/* Middle row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <PlayerCountChart />
      </div>

      {/* Bottom row: Players Table */}
      <div className="grid grid-cols-1 gap-6">
        <PlayersTable />
      </div>
    </div>
  );
}
