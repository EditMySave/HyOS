export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startHeartbeat } = await import(
      "@/lib/services/analytics/heartbeat"
    );
    startHeartbeat();
  }
}
