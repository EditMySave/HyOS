"use client";

import { useState } from "react";

export function Contact() {
  const [topic, setTopic] = useState("question");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, name, email, message }),
      });

      if (res.ok) {
        setStatus("sent");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-cablefied text-4xl tracking-tight text-foreground">
          Get in touch
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Have a question or found a bug? Reach out or open a GitHub issue.
        </p>

        <div className="mt-10 max-w-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-sm font-medium text-foreground">
              We use GitHub for support
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label
                htmlFor="topic"
                className="mb-1.5 block text-sm text-muted-foreground"
              >
                Topic
              </label>
              <select
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="question">Question</option>
                <option value="bug">Bug report</option>
                <option value="feature">Feature request</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm text-muted-foreground"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm text-muted-foreground"
              >
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="border border-status-online px-5 py-2 text-sm font-medium text-status-online transition hover:bg-status-online/10 disabled:opacity-50"
              >
                {status === "sending" ? "Sending..." : "Send message"}
              </button>
              <a
                href="https://github.com/editmysave/hyOS/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                Open issues
              </a>
            </div>

            {status === "sent" && (
              <p className="text-sm text-status-online">
                Message sent. We&apos;ll get back to you soon.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-destructive">
                Failed to send. Please try GitHub Issues instead.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
