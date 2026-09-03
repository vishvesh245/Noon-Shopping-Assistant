const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://www.noon.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function anthropicFetch(apiKey, payload) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });
}

// A Worker executes near the visitor, so for visitors in Asia the upstream call
// leaves from a colo Anthropic does not serve and comes back 403. Durable Objects
// honour a locationHint, so the relay below always runs in North America and the
// call to Anthropic leaves from there. If the relay is unreachable, fall back to
// calling directly: that still works for visitors in supported regions.
async function callAnthropic(env, payload) {
  if (env.RELAY) {
    try {
      const stub = env.RELAY.get(env.RELAY.idFromName("anthropic-relay"), {
        locationHint: "enam",
      });
      return await stub.fetch("https://relay.internal/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Relay unavailable, calling Anthropic directly:", err.message);
    }
  }
  return anthropicFetch(env.ANTHROPIC_API_KEY, payload);
}

export class AnthropicRelay {
  constructor(state, env) {
    this.env = env;
  }

  async fetch(request) {
    return anthropicFetch(this.env.ANTHROPIC_API_KEY, await request.json());
  }
}

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

      const response = await callAnthropic(env, {
        model: model || "claude-haiku-4-5-20251001",
        max_tokens: max_tokens || 2048,
        system: system || "",
        messages,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Anthropic's own errors carry {type:"error", error:{...}, request_id}.
        // A bare {error:{type:"forbidden"}} with no request_id comes from the edge
        // in front of the API, which rejects calls originating in regions Anthropic
        // does not serve — i.e. this Worker ran in the wrong colo. See wrangler.toml.
        const regionBlocked = response.status === 403 && data && !("request_id" in data);
        console.error("Anthropic request failed:", response.status, JSON.stringify(data));
        return Response.json(
          {
            error: {
              message: regionBlocked
                ? "Assistant is temporarily unavailable (upstream region block) — please try again shortly."
                : data?.error?.message || `Upstream error ${response.status}`,
            },
          },
          { status: response.status, headers: CORS_HEADERS }
        );
      }

      return Response.json(data, { status: response.status, headers: CORS_HEADERS });
    } catch (err) {
      return Response.json({ error: "Internal proxy error" }, { status: 500, headers: CORS_HEADERS });
    }
  },
};
