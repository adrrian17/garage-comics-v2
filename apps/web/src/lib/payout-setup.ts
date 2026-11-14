/** Where an Author is in setting up the Stripe account their Transfers go to. */
export type PayoutSetupStatus = "needs_details" | "in_review" | "ready";

/** The part of a Stripe Account that decides the status. */
interface PayoutAccount {
  details_submitted: boolean;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
  } | null;
  capabilities?: { transfers?: string } | null;
}

// shortcut: the status is read live from Stripe on every page load; store it from an `account.updated` webhook when the catalog needs to filter Authors by it.
export const payoutSetupStatus = (
  account: PayoutAccount | null
): PayoutSetupStatus => {
  const due = [
    ...(account?.requirements?.currently_due ?? []),
    ...(account?.requirements?.past_due ?? []),
  ];

  if (account === null || !account.details_submitted || due.length > 0) {
    return "needs_details";
  }

  return account.capabilities?.transfers === "active" ? "ready" : "in_review";
};
