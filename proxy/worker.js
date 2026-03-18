const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.noon.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (new URL(request.url).pathname === "/health") {
      return Response.json({ status: "ok" }, { headers: CORS_HEADERS });
    }

    // Only allow POST to /api/chat
    if (request.method !== "POST" || new URL(request.url).pathname !== "/api/chat") {
      return Response.json({ error: "Not found" }, { status: 404, headers: CORS_HEADERS });
    }

    // IP-based rate limiting: 30 requests per minute per IP
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateLimitKey = `rate:${clientIP}`;
    const RATE_LIMIT_MAX = 30;
    const RATE_LIMIT_WINDOW = 60; // seconds

    try {
      const current = await env.RATE_LIMIT.get(rateLimitKey);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= RATE_LIMIT_MAX) {
        return Response.json(
          { error: "Rate limit exceeded. Maximum 30 requests per minute. Please try again later." },
          { status: 429, headers: CORS_HEADERS }
        );
      }

      // Increment counter with 60-second TTL on every write to ensure keys always expire
      await env.RATE_LIMIT.put(rateLimitKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
    } catch (err) {
      // If KV is unavailable, allow the request through rather than blocking users
      console.error("Rate limit check failed:", err);
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API key not configured" }, { status: 500, headers: CORS_HEADERS });
    }

    try {
      const body = await request.json().catch(() => null);
      if (!body) {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400, headers: CORS_HEADERS });
      }

      const { messages, system, model, max_tokens } = body;

      if (!messages || !Array.isArray(messages)) {
        return Response.json({ error: "messages array is required" }, { status: 400, headers: CORS_HEADERS });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-haiku-4-5-20251001",
          max_tokens: max_tokens || 2048,
          system: system || "",
          messages,
        }),
      });

      const data = await response.json();
      return Response.json(data, { status: response.status, headers: CORS_HEADERS });
    } catch (err) {
      return Response.json({ error: "Internal proxy error" }, { status: 500, headers: CORS_HEADERS });
    }
  },
};
