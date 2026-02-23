const UMAMI_HOST = process.env.UMAMI_HOST;

let cachedScript: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  const headers = { "Content-Type": "application/javascript" };

  if (!UMAMI_HOST) {
    return new Response("/* analytics disabled */", { headers });
  }

  const now = Date.now();
  if (cachedScript && now - cachedAt < CACHE_TTL) {
    return new Response(cachedScript, {
      headers: { ...headers, "Cache-Control": "public, max-age=86400" },
    });
  }

  try {
    const res = await fetch(`${UMAMI_HOST}/script.js`);
    if (!res.ok) throw new Error(`Upstream ${res.status}`);

    cachedScript = await res.text();
    cachedAt = now;

    return new Response(cachedScript, {
      headers: { ...headers, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new Response("/* script unavailable */", {
      status: 502,
      headers,
    });
  }
}
