"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login, useAuthStatus } from "@/lib/services/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: authStatus, isLoading } = useAuthStatus();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect to setup if first run
  useEffect(() => {
    if (authStatus?.needsSetup) {
      router.replace("/setup");
    }
  }, [authStatus, router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (authStatus?.authenticated) {
      router.replace(searchParams.get("from") ?? "/");
    }
  }, [authStatus, router, searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await login(username, password);
    if (result.success) {
      router.replace(searchParams.get("from") ?? "/");
    } else {
      setError(result.error ?? "Login failed");
      setSubmitting(false);
    }
  }

  if (isLoading || authStatus?.needsSetup || authStatus?.authenticated) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-cablefied tracking-tight">
          HyOS
        </CardTitle>
        <CardDescription>Sign in to access the server manager.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-sm font-medium leading-none"
            >
              Username
            </label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
