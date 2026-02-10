interface Env {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  CONTACT_EMAIL: string;
}

interface ContactBody {
  topic: string;
  name: string;
  email: string;
  message: string;
  "cf-turnstile-response"?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const body: ContactBody = await request.json();
  const { topic, name, email, message } = body;

  if (!topic || !name || !email || !message) {
    return new Response(JSON.stringify({ error: "All fields are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate Turnstile token if configured
  const turnstileToken = body["cf-turnstile-response"];
  if (env.TURNSTILE_SECRET_KEY && turnstileToken) {
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      },
    );
    const verify = (await verifyRes.json()) as { success: boolean };
    if (!verify.success) {
      return new Response(
        JSON.stringify({ error: "Turnstile verification failed" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Send email via Resend
  if (env.RESEND_API_KEY) {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "hyOS Contact <noreply@hyos.io>",
        to: env.CONTACT_EMAIL || "contact@hyos.io",
        subject: `[hyOS ${topic}] from ${name}`,
        text: `Topic: ${topic}\nName: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!emailRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
