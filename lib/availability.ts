import { AvailabilitySlot } from "@/lib/types";

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
] as const;

export const DEFAULT_WEEKLY_AVAILABILITY: AvailabilitySlot[] = [
  { id: "availability-monday", weekday: "Monday", isAvailable: true, start: "09:00", end: "12:00" },
  { id: "availability-tuesday", weekday: "Tuesday", isAvailable: true, start: "13:00", end: "16:00" },
  { id: "availability-wednesday", weekday: "Wednesday", isAvailable: false, start: "09:00", end: "12:00" },
  { id: "availability-thursday", weekday: "Thursday", isAvailable: true, start: "10:00", end: "13:00" },
  { id: "availability-friday", weekday: "Friday", isAvailable: true, start: "09:00", end: "12:00" },
  { id: "availability-saturday", weekday: "Saturday", isAvailable: false, start: "09:00", end: "12:00" },
  { id: "availability-sunday", weekday: "Sunday", isAvailable: false, start: "09:00", end: "12:00" }
];

export const TIME_FIELD_OPTIONS = Array.from({ length: 15 }, (_, index) => {
  const hour = index + 6;
  const value = `${String(hour).padStart(2, "0")}:00`;
  return {
    value,
    label: formatTimeLabel(value)
  };
});

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map((value) => Number(value));
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTimeLabel(time: string) {
  const [rawHours, rawMinutes] = time.split(":").map((value) => Number(value));
  const suffix = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  return `${hours}:${String(rawMinutes).padStart(2, "0")} ${suffix}`;
}

export function buildEstimateSlotLabel(weekday: string, time: string) {
  return `${weekday} at ${formatTimeLabel(time)}`;
}

export function buildHourlyTimeOptions(slot: AvailabilitySlot) {
  if (!slot.isAvailable) {
    return [];
  }

  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);

  if (endMinutes <= startMinutes) {
    return [];
  }

  const options: Array<{ value: string; label: string }> = [];
  for (let current = startMinutes; current <= endMinutes; current += 60) {
    const value = minutesToTime(current);
    options.push({
      value,
      label: formatTimeLabel(value)
    });
  }

  return options;
}

export function normalizeAvailability(
  rawAvailability: AvailabilitySlot[] | undefined
): AvailabilitySlot[] {
  if (!rawAvailability?.length) {
    return DEFAULT_WEEKLY_AVAILABILITY;
  }

  return WEEKDAYS.map((weekday, index) => {
    const matchingSlots = rawAvailability.filter((slot) => slot.weekday === weekday);
    const matchingDefault = DEFAULT_WEEKLY_AVAILABILITY[index];

    if (!matchingSlots.length) {
      return matchingDefault;
    }

    const earliestStart = matchingSlots
      .map((slot) => slot.start ?? matchingDefault.start)
      .sort()[0];
    const latestEnd = matchingSlots
      .map((slot) => slot.end ?? matchingDefault.end)
      .sort()
      .at(-1) ?? matchingDefault.end;

    const hasAvailabilityFlag = matchingSlots.some((slot) => typeof slot.isAvailable === "boolean");
    const isAvailable = hasAvailabilityFlag
      ? matchingSlots.some((slot) => slot.isAvailable)
      : true;

    return {
      id: matchingSlots[0]?.id ?? matchingDefault.id,
      weekday,
      isAvailable,
      start: earliestStart,
      end: latestEnd
    };
  });
}

export function getFirstAvailableDay(availability: AvailabilitySlot[]) {
  return availability.find((slot) => slot.isAvailable && buildHourlyTimeOptions(slot).length > 0);
}

export function formatAvailabilityRange(start: string, end: string) {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}
