import { describe, expect, it } from "vite-plus/test";

import { payoutSetupStatus } from "./payout-setup";

const account = {
  details_submitted: true,
  requirements: { currently_due: [], past_due: [] },
  capabilities: { transfers: "active" },
};

describe(payoutSetupStatus, () => {
  it("needs details when there is no account yet", () => {
    expect(payoutSetupStatus(null)).toBe("needs_details");
  });

  it("needs details until the Author submits them", () => {
    expect(payoutSetupStatus({ ...account, details_submitted: false })).toBe(
      "needs_details"
    );
  });

  it.each(["currently_due", "past_due"])(
    "needs details while something is %s, even once transfers are active",
    (key) => {
      expect(
        payoutSetupStatus({
          ...account,
          requirements: {
            ...account.requirements,
            [key]: ["external_account"],
          },
        })
      ).toBe("needs_details");
    }
  );

  it("is in review when details are in but transfers are not active", () => {
    expect(
      payoutSetupStatus({ ...account, capabilities: { transfers: "pending" } })
    ).toBe("in_review");
    expect(payoutSetupStatus({ ...account, capabilities: null })).toBe(
      "in_review"
    );
  });

  it("is ready when transfers are active", () => {
    expect(payoutSetupStatus(account)).toBe("ready");
  });
});
