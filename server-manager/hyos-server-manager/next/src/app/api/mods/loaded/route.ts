import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import type { LoadedPluginsResponse } from "@/lib/services/mods/mods.types";

/**
 * Get loaded plugins from the Hytale server REST API
 */
export async function GET() {
  try {
    // Fetch from the Hytale API plugin
    const data = await apiRequest<LoadedPluginsResponse>("/server/plugins");

    return NextResponse.json(data);
  } catch (error) {
    console.error("[mods/loaded] Error fetching loaded plugins:", error);

    // Return empty list if server is not available
    // This is expected when the server is stopped
    return NextResponse.json({
      count: 0,
      plugins: [],
    });
  }
}
