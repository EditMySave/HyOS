import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking("/api/world/save", async () => {
  await apiRequest("/server/save", {
    method: "POST",
  });

  return NextResponse.json({ success: true });
});
