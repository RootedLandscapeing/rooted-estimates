"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      setError("Supabase environment variables are missing.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const supabase = getSupabaseBrowserClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-panel">
        <div className="auth-header">
          <Image
            src="/rooted-logo.png"
            alt="Rooted Moapa Valley Landscaping logo"
            width={200}
            height={112}
            className="page-logo"
            priority
          />
          <p className="eyebrow">Admin Access</p>
          <h1>Sign in to the dashboard.</h1>
          <p className="hero-card-copy">
            Use your brother&apos;s business email here so the admin login stays tied to the business.
          </p>
        </div>

        <form className="form-grid top-gap" onSubmit={handleSubmit}>
          <label className="full-width">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="full-width">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          {error ? <div className="notice full-width">{error}</div> : null}
          <div className="full-width form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : "Sign In"}
            </button>
          </div>
        </form>

        <Link href="/" className="text-link">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
