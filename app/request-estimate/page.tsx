"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatAvailabilityRange } from "@/lib/availability";
import { RequestForm } from "@/components/request-form";
import { loadSupabasePublicContent } from "@/lib/supabase/app-data";
import { loadAppData } from "@/lib/storage";
import { AvailabilitySlot } from "@/lib/types";

export default function RequestEstimatePage() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    setAvailability(loadAppData().availability);

    loadSupabasePublicContent()
      .then((publicContent) => {
        setAvailability(publicContent.availability);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const availableSlots = availability.filter((slot) => slot.isAvailable);

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
          <p className="eyebrow">Estimate Request</p>
          <h1>Choose the day and time that usually work best, then send the job details in one step.</h1>
        </div>
        <Link href="/" className="text-link">
          Back to Home
        </Link>
      </header>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Availability</p>
          <h2>Preferred estimate days and time windows</h2>
        </div>
        <div className="availability-grid">
          {availableSlots.map((slot) => (
            <div key={slot.id} className="availability-card request-availability-card">
              <strong>{slot.weekday}</strong>
              <small>{formatAvailabilityRange(slot.start, slot.end)}</small>
            </div>
          ))}
        </div>
      </section>

      <RequestForm />
    </main>
  );
}
