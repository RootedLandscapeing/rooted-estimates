"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function DashboardShell() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthError("Supabase is not configured yet. Add the environment variables and restart the app.");
      setIsCheckingSession(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(error.message);
        setIsCheckingSession(false);
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setSignedInEmail(data.session.user.email ?? "");
      setIsCheckingSession(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      setSignedInEmail(session.user.email ?? "");
      setIsCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (isCheckingSession) {
    return <section className="panel">Checking admin access...</section>;
  }

  if (authError) {
    return <section className="panel">{authError}</section>;
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <Image
            src="/rooted-logo.png"
            alt="Rooted Moapa Valley Landscaping logo"
            width={220}
            height={124}
            className="page-logo"
            priority
          />
          <p className="eyebrow">Business Dashboard</p>
          <h1>Manage leads, quotes, jobs, invoices, and payment records.</h1>
          {signedInEmail ? <p className="hero-card-copy">Signed in as {signedInEmail}</p> : null}
        </div>
        <div className="inline-actions">
          <Link href="/" className="text-link">
            Back to Home
          </Link>
          <button type="button" className="button-secondary" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <Dashboard />
    </main>
  );
}
