"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildEstimateSlotLabel,
  buildHourlyTimeOptions,
  getFirstAvailableDay
} from "@/lib/availability";
import { createEstimateLead, loadAppData, saveAppData } from "@/lib/storage";
import { AvailabilitySlot } from "@/lib/types";

const initialState = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  preferredContact: "phone" as const,
  notes: "",
  preferredSlot: "",
  jobType: "",
  description: ""
};

export function RequestForm() {
  const [form, setForm] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    const currentAvailability = loadAppData().availability;
    setAvailability(currentAvailability);

    const firstAvailableDay = getFirstAvailableDay(currentAvailability);
    if (firstAvailableDay) {
      const firstTime = buildHourlyTimeOptions(firstAvailableDay)[0]?.value ?? "";
      setSelectedDay(firstAvailableDay.weekday);
      setSelectedTime(firstTime);
      setForm((current) => ({
        ...current,
        preferredSlot: firstTime
          ? buildEstimateSlotLabel(firstAvailableDay.weekday, firstTime)
          : ""
      }));
    }
  }, []);

  const availableDays = useMemo(
    () => availability.filter((slot) => slot.isAvailable && buildHourlyTimeOptions(slot).length > 0),
    [availability]
  );

  const selectedAvailability = useMemo(
    () => availableDays.find((slot) => slot.weekday === selectedDay) ?? availableDays[0],
    [availableDays, selectedDay]
  );

  const timeOptions = useMemo(
    () => (selectedAvailability ? buildHourlyTimeOptions(selectedAvailability) : []),
    [selectedAvailability]
  );

  useEffect(() => {
    if (!selectedAvailability) {
      setSelectedDay("");
      setSelectedTime("");
      setForm((current) => ({ ...current, preferredSlot: "" }));
      return;
    }

    if (selectedAvailability.weekday !== selectedDay) {
      setSelectedDay(selectedAvailability.weekday);
    }

    if (!timeOptions.length) {
      setSelectedTime("");
      setForm((current) => ({ ...current, preferredSlot: "" }));
      return;
    }

    const nextTime = timeOptions.some((option) => option.value === selectedTime)
      ? selectedTime
      : timeOptions[0].value;

    if (nextTime !== selectedTime) {
      setSelectedTime(nextTime);
    }

    const nextSlot = buildEstimateSlotLabel(selectedAvailability.weekday, nextTime);
    setForm((current) =>
      current.preferredSlot === nextSlot ? current : { ...current, preferredSlot: nextSlot }
    );
  }, [selectedAvailability, selectedDay, selectedTime, timeOptions]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleDayChange(day: string) {
    setSelectedDay(day);
  }

  function handleTimeChange(time: string) {
    setSelectedTime(time);
    if (selectedAvailability) {
      updateField("preferredSlot", buildEstimateSlotLabel(selectedAvailability.weekday, time));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.preferredSlot) {
      return;
    }

    const currentData = loadAppData();
    const nextData = createEstimateLead(currentData, form);
    saveAppData(nextData);
    setSubmitted(true);
    setForm((current) => ({
      ...initialState,
      preferredSlot: current.preferredSlot
    }));
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">Request an Estimate</p>
        <h2>Share the project details and your preferred estimate time so Rooted can confirm the exact date with you.</h2>
      </div>

      {submitted ? (
        <div className="notice success">
          Your estimate request was sent. Rooted can now review your preferred day and time, then
          follow up to confirm the exact estimate date.
        </div>
      ) : null}

      {!availableDays.length ? (
        <div className="notice">
          Estimate scheduling is temporarily unavailable. Please check back soon or contact Rooted
          directly.
        </div>
      ) : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Full name
          <input
            required
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            required
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </label>
        <label>
          Property address
          <input
            required
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
          />
        </label>
        <label>
          Preferred contact
          <select
            value={form.preferredContact}
            onChange={(event) =>
              updateField("preferredContact", event.target.value as typeof form.preferredContact)
            }
          >
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="text">Text</option>
          </select>
        </label>
        <label>
          Preferred estimate day
          <select
            required
            disabled={!availableDays.length}
            value={selectedDay}
            onChange={(event) => handleDayChange(event.target.value)}
          >
            {availableDays.map((slot) => (
              <option key={slot.id} value={slot.weekday}>
                {slot.weekday}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preferred estimate time
          <select
            required
            disabled={!timeOptions.length}
            value={selectedTime}
            onChange={(event) => handleTimeChange(event.target.value)}
          >
            {timeOptions.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preferred estimate window
          <input value={form.preferredSlot} readOnly />
        </label>
        <label className="full-width">
          Job type
          <input
            required
            value={form.jobType}
            onChange={(event) => updateField("jobType", event.target.value)}
            placeholder="Lawn install, cleanup, irrigation, grading..."
          />
        </label>
        <label className="full-width">
          Project details
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe the job, where it is located on the property, and anything else we should know."
          />
        </label>
        <label className="full-width">
          Notes for scheduling
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Gate code, pets on property, best time to call..."
          />
        </label>

        <div className="full-width form-actions">
          <button type="submit" disabled={!availableDays.length}>
            Send Estimate Request
          </button>
        </div>
      </form>
    </section>
  );
}
