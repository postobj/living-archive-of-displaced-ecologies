import { Resend } from "resend";

interface Env {
  BASEROW_API_TOKEN: string;
  BASEROW_SUBMISSIONS_TABLE_ID: string;
  RESEND_API_KEY: string;
  BASEROW_API_URL: string;
  /** Comma-separated list of origins allowed to call this worker. */
  ALLOWED_ORIGINS: string;
  /** Sender for verification emails, e.g. "Archive <hello@example.org>". */
  EMAIL_FROM: string;
  /** Archive name used in the verification email body. */
  SITE_NAME: string;
  OTP_STORE: KVNamespace;
}

interface VerifyRequest {
  action: "send" | "verify";
  email: string;
  code?: string;
}

const rateStore = new Map<string, { count: number; windowStart: number }>();

const OTP_TTL_SECONDS = 30 * 60; // 30 minutes

function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count += 1;
  return true;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function generateVerificationToken(
  email: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const message = `${email.toLowerCase().trim()}:${expiry}`;
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${expiry}:${sigHex}`;
}

function corsHeaders(origin: string, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] ?? "");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function sendEmail(to: string, code: string, env: Env): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Your verification code",
    html: `<p>Hello,</p><p>Your verification code for ${env.SITE_NAME} is:</p><p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p><p>This code expires in 30 minutes.</p><p>If you did not request this code, you can ignore this email.</p>`,
  });
  if (error) throw new Error(`Resend failed: ${error.message}`);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin, env) });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders(origin, env),
          "Content-Type": "application/json",
        },
      });
    }

    let body: VerifyRequest;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: {
          ...corsHeaders(origin, env),
          "Content-Type": "application/json",
        },
      });
    }

    const { action, email, code } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin, env),
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!action || !["send", "verify"].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Action must be "send" or "verify"' }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin, env),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      if (action === "send") {
        if (!checkRateLimit(`send:${normalizedEmail}`, 3, 3600000)) {
          return new Response(
            JSON.stringify({
              error: "Too many attempts. Please try again later.",
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders(origin, env),
                "Content-Type": "application/json",
              },
            },
          );
        }

        const otpCode = generateCode();
        await env.OTP_STORE.put(`otp:${normalizedEmail}`, otpCode, {
          expirationTtl: OTP_TTL_SECONDS,
        });

        await sendEmail(email, otpCode, env);

        return new Response(
          JSON.stringify({
            message: "Verification code sent. Please check your email.",
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders(origin, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      // action === "verify"
      if (!code || code.length !== 6) {
        return new Response(
          JSON.stringify({ error: "A 6-digit code is required" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (!checkRateLimit(`verify:${normalizedEmail}`, 5, 3600000)) {
        return new Response(
          JSON.stringify({
            error: "Too many attempts. Please request a new code.",
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders(origin, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const storedCode = await env.OTP_STORE.get(`otp:${normalizedEmail}`);
      if (!storedCode) {
        return new Response(
          JSON.stringify({
            error:
              "No verification code found. It may have expired. Please request a new code.",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (storedCode !== code) {
        return new Response(
          JSON.stringify({ error: "Incorrect code. Please try again." }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      // Code valid — generate verification token and clean up
      await env.OTP_STORE.delete(`otp:${normalizedEmail}`);
      const token = await generateVerificationToken(
        normalizedEmail,
        env.BASEROW_API_TOKEN,
      );

      return new Response(
        JSON.stringify({ message: "Email verified.", token }),
        {
          status: 200,
          headers: {
            ...corsHeaders(origin, env),
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: {
          ...corsHeaders(origin, env),
          "Content-Type": "application/json",
        },
      });
    }
  },
};

export default worker;
