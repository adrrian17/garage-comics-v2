/** Where an Author is in setting up the Stripe account their Transfers go to. */
export type PayoutSetupStatus =
  | "needs_details"
  | "in_review"
  | "rejected"
  | "ready";

/** The part of a Stripe Account that decides the status. */
interface PayoutAccount {
  details_submitted: boolean;
  payouts_enabled: boolean;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
    disabled_reason?: string | null;
  } | null;
  capabilities?: { transfers?: string } | null;
}

// shortcut: the status is read live from Stripe on every page load; store it from an `account.updated` webhook when the catalog needs to filter Authors by it.
export const payoutSetupStatus = (
  account: PayoutAccount | null
): PayoutSetupStatus => {
  if (account === null) {
    return "needs_details";
  }

  // Stripe's rejection is final; no more details from the Author change it.
  if ((account.requirements?.disabled_reason ?? "").startsWith("rejected.")) {
    return "rejected";
  }

  const due = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];

  if (!account.details_submitted || due.length > 0) {
    return "needs_details";
  }

  // Transfers reach the Stripe balance and Payouts reach the bank; the Author needs both.
  return account.capabilities?.transfers === "active" && account.payouts_enabled
    ? "ready"
    : "in_review";
};
