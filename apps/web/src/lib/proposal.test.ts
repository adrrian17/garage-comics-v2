import { describe, expect, it } from "vite-plus/test";

import {
  acceptanceDeadline,
  canApply,
  checkoutExpiresAt,
  proposalTransitions,
  registrableStatuses,
} from "./proposal";

describe("proposal transitions", () => {
  it.each([
    ["pending", "accept", true],
    ["pending", "reject", true],
    ["pending", "expire", false],
    ["pending", "register", false],
    ["accepted", "accept", false],
    ["accepted", "reject", false],
    ["accepted", "expire", true],
    ["accepted", "register", true],
    ["rejected", "accept", false],
    ["rejected", "reject", false],
    ["rejected", "expire", false],
    ["rejected", "register", false],
    ["expired", "accept", false],
    ["expired", "reject", false],
    ["expired", "expire", false],
    ["expired", "register", false],
    ["registered", "accept", false],
    ["registered", "reject", false],
    ["registered", "expire", false],
    ["registered", "register", false],
  ] as const)("a %s Proposal allows %s: %s", (status, action, allowed) => {
    expect(canApply(status, action)).toBe(allowed);
  });

  it("leads accept, reject, expire and register to accepted, rejected, expired and registered", () => {
    expect(proposalTransitions.accept.to).toBe("accepted");
    expect(proposalTransitions.reject.to).toBe("rejected");
    expect(proposalTransitions.expire.to).toBe("expired");
    expect(proposalTransitions.register.to).toBe("registered");
  });

  it("still registers a payment that arrives after the acceptance expired", () => {
    expect(registrableStatuses).toStrictEqual(["accepted", "expired"]);
  });
});

describe(checkoutExpiresAt, () => {
  const now = new Date("2027-01-01T12:00:00Z");

  const minutesFromNow = (minutes: number) =>
    new Date(now.getTime() + minutes * 60_000);

  it("expires at the acceptance deadline when Stripe allows it", () => {
    expect(checkoutExpiresAt(minutesFromNow(600), now)).toStrictEqual(
      minutesFromNow(600)
    );
  });

  it("never lives more than 24 hours", () => {
    const expiresAt = checkoutExpiresAt(minutesFromNow(5 * 24 * 60), now);

    expect(expiresAt.getTime() - now.getTime()).toBeLessThan(24 * 60 * 60_000);
    expect(expiresAt.getTime() - now.getTime()).toBeGreaterThan(
      23 * 60 * 60_000
    );
  });

  it.each([-60, 0, 10])(
    "never lives under Stripe's 30 minutes, even with the deadline %i minutes away",
    (minutes) => {
      const expiresAt = checkoutExpiresAt(minutesFromNow(minutes), now);

      expect(expiresAt.getTime() - now.getTime()).toBeGreaterThan(30 * 60_000);
    }
  );
});

describe(acceptanceDeadline, () => {
  it("is 7 days after the acceptance", () => {
    expect(acceptanceDeadline(new Date("2027-01-01T18:30:00Z"))).toStrictEqual(
      new Date("2027-01-08T18:30:00Z")
    );
  });
});
