import { describe, expect, it } from "vitest";
import { deriveEventStatus, deriveRegistrationStatus, fromEventDateTimeLocal, slugifyEventTitle, toEventDateTimeLocal } from "./eventModel";

const startsAt = "2026-08-24T10:00:00.000Z";
const endsAt = "2026-08-24T12:00:00.000Z";
const baseRegistration = { startsAt, endsAt, registrationRequired: true, registrationMode: "INTERNAL" as const, maxParticipants: 100 };

describe("event lifecycle", () => {
  it.each([
    ["SCHEDULED", Date.parse("2026-08-24T09:59:59Z")],
    ["ONGOING", Date.parse("2026-08-24T10:30:00Z")],
    ["COMPLETED", Date.parse("2026-08-24T12:00:00Z")],
  ])("derives %s from the configured interval", (expected, now) => {
    expect(deriveEventStatus({ startsAt, endsAt }, now)).toBe(expected);
  });

  it.each(["CANCELLED", "POSTPONED"] as const)("preserves the %s manual state", (status) => {
    expect(deriveEventStatus({ startsAt, endsAt, eventStatusOverride: status }, Date.parse("2026-08-24T10:30:00Z"))).toBe(status);
  });
});

describe("registration lifecycle", () => {
  it("supports upcoming, open, full, closed, and terminal event closure", () => {
    expect(deriveRegistrationStatus({ ...baseRegistration, registrationOpensAt: "2026-08-24T09:00:00Z" }, Date.parse("2026-08-24T08:00:00Z"))).toBe("UPCOMING");
    expect(deriveRegistrationStatus(baseRegistration, Date.parse("2026-08-24T09:00:00Z"))).toBe("OPEN");
    expect(deriveRegistrationStatus({ ...baseRegistration, maxParticipants: 2, reservedCount: 2 }, Date.parse("2026-08-24T09:00:00Z"))).toBe("FULL");
    expect(deriveRegistrationStatus({ ...baseRegistration, registrationDeadline: "2026-08-24T08:30:00Z" }, Date.parse("2026-08-24T09:00:00Z"))).toBe("CLOSED");
    expect(deriveRegistrationStatus(baseRegistration, Date.parse("2026-08-24T12:00:00Z"))).toBe("CLOSED");
  });
});

describe("event utilities", () => {
  it("creates stable URL-safe slugs", () => expect(slugifyEventTitle(" IELTS Guideline Session 2026 ")).toBe("ielts-guideline-session-2026"));
  it("round-trips a Dhaka wall-clock time without browser-local drift", () => {
    const iso = fromEventDateTimeLocal("2026-08-24T18:30", "Asia/Dhaka");
    expect(iso).toBe("2026-08-24T12:30:00.000Z");
    expect(toEventDateTimeLocal(iso, "Asia/Dhaka")).toBe("2026-08-24T18:30");
  });
});
