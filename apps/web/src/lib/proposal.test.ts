import { describe, expect, it } from "vite-plus/test";

import { acceptanceDeadline, canApply, proposalTransitions } from "./proposal";

describe("proposal transitions", () => {
  it.each([
    ["pending", "accept", true],
    ["pending", "reject", true],
    ["pending", "expire", false],
    ["accepted", "accept", false],
    ["accepted", "reject", false],
    ["accepted", "expire", true],
    ["rejected", "accept", false],
    ["rejected", "reject", false],
    ["rejected", "expire", false],
    ["expired", "accept", false],
    ["expired", "reject", false],
    ["expired", "expire", false],
  ] as const)("a %s Proposal allows %s: %s", (status, action, allowed) => {
    expect(canApply(status, action)).toBe(allowed);
  });

  it("leads accept, reject and expire to accepted, rejected and expired", () => {
    expect(proposalTransitions.accept.to).toBe("accepted");
    expect(proposalTransitions.reject.to).toBe("rejected");
    expect(proposalTransitions.expire.to).toBe("expired");
  });
});

describe(acceptanceDeadline, () => {
  it("is 7 days after the acceptance", () => {
    expect(acceptanceDeadline(new Date("2027-01-01T18:30:00Z"))).toStrictEqual(
      new Date("2027-01-08T18:30:00Z")
    );
  });
});
