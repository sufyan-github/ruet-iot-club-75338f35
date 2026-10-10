export type EventStatus =
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "POSTPONED";
export type EventStatusOverride = "CANCELLED" | "POSTPONED" | null;
export type RegistrationStatus = "UPCOMING" | "OPEN" | "CLOSED" | "FULL";
export type RegistrationStatusOverride = RegistrationStatus | null;

export interface EventMediaReference {
  mediaId?: string;
  key: string;
  url: string;
  originalName: string;
  contentType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  altText?: string;
  createdAt?: string;
}

export interface EventLifecycleInput {
  startsAt: string;
  endsAt: string;
  eventStatus?: EventStatus;
  eventStatusOverride?: EventStatusOverride;
}

export interface RegistrationLifecycleInput extends EventLifecycleInput {
  registrationRequired: boolean;
  registrationMode: "INTERNAL" | "EXTERNAL" | "CLOSED";
  registrationOpensAt?: string | null;
  registrationDeadline?: string | null;
  registrationStatusOverride?: RegistrationStatusOverride;
  maxParticipants: number;
  reservedCount?: number;
  registrationCapacityOverride?: boolean;
}

const validTime = (value?: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

export function deriveEventStatus(
  input: EventLifecycleInput,
  now = Date.now(),
): EventStatus {
  const override =
    input.eventStatusOverride ??
    (input.eventStatus === "CANCELLED" || input.eventStatus === "POSTPONED"
      ? input.eventStatus
      : null);
  if (override) return override;
  const starts = validTime(input.startsAt);
  const ends = validTime(input.endsAt);
  if (starts === null || ends === null) return "SCHEDULED";
  if (now >= ends) return "COMPLETED";
  if (now >= starts) return "ONGOING";
  return "SCHEDULED";
}

export function deriveRegistrationStatus(
  input: RegistrationLifecycleInput,
  now = Date.now(),
): RegistrationStatus {
  const eventStatus = deriveEventStatus(input, now);
  if (!input.registrationRequired || input.registrationMode === "CLOSED")
    return "CLOSED";
  if (["COMPLETED", "CANCELLED", "POSTPONED"].includes(eventStatus))
    return "CLOSED";

  const deadline = validTime(input.registrationDeadline);
  if (deadline !== null && now >= deadline) return "CLOSED";

  const capacity = Math.max(0, Number(input.maxParticipants || 0));
  const reserved = Math.max(0, Number(input.reservedCount || 0));
  if (
    capacity > 0 &&
    reserved >= capacity &&
    !input.registrationCapacityOverride
  )
    return "FULL";

  if (input.registrationStatusOverride) return input.registrationStatusOverride;
  const opens = validTime(input.registrationOpensAt);
  return opens !== null && now < opens ? "UPCOMING" : "OPEN";
}

export function slugifyEventTitle(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 200);
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

const zonedParts = (instant: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
};

export function toEventDateTimeLocal(
  value: string | null | undefined,
  timeZone: string,
): string {
  const time = validTime(value);
  if (time === null || !isValidTimeZone(timeZone)) return "";
  const parts = zonedParts(new Date(time), timeZone);
  const pad = (item: number) => String(item).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function fromEventDateTimeLocal(
  value: string,
  timeZone: string,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(value);
  if (!match || !isValidTimeZone(timeZone))
    throw new Error("Enter a valid date, time, and IANA timezone.");
  const desired = match.slice(1).map(Number);
  const year = desired[0]!;
  const month = desired[1]!;
  const day = desired[2]!;
  const hour = desired[3]!;
  const minute = desired[4]!;
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = zonedParts(new Date(guess), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      0,
    );
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    guess += desiredAsUtc - observedAsUtc;
  }
  const resolved = zonedParts(new Date(guess), timeZone);
  if (
    [
      resolved.year,
      resolved.month,
      resolved.day,
      resolved.hour,
      resolved.minute,
    ].some((part, index) => part !== desired[index])
  ) {
    throw new Error("This local time does not exist in the selected timezone.");
  }
  return new Date(guess).toISOString();
}

export function formatEventDate(
  value: string,
  timeZone: string,
  dateStyle: "medium" | "full" = "medium",
): string {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle,
    timeStyle: "short",
    timeZone: isValidTimeZone(timeZone) ? timeZone : "Asia/Dhaka",
  }).format(new Date(value));
}

export function mediaReferenceFromUrl(
  url?: string | null,
  altText = "",
): EventMediaReference | null {
  if (!url) return null;
  const prefix = "/api/v1/media/files/";
  const key = url.startsWith(prefix) ? url.slice(prefix.length) : "";
  const originalName = decodeURIComponent(
    url.split("/").pop() || "Selected media",
  );
  return { key, url, originalName, altText };
}

export function effectiveOgImageUrl(event: {
  ogImage?: EventMediaReference | null;
  ogImageUrl?: string | null;
  heroImage?: EventMediaReference | null;
  coverImageUrl?: string | null;
}): string | undefined {
  return (
    event.ogImage?.url ||
    event.ogImageUrl ||
    event.heroImage?.url ||
    event.coverImageUrl ||
    undefined
  );
}
