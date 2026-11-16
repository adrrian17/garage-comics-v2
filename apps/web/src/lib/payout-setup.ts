import type { payoutSetupStatuses } from "@garage-comics/db/schema/authors";

/** Where an Author is in setting up the Stripe account their Transfers go to. */
export type PayoutSetupStatus = (typeof payoutSetupStatuses)[number];

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

// shortcut: the catalog filters on the status saved the last time the Author opened their payouts page, so it goes stale until they reopen it; upgrade with a Connect `account.updated` webhook.
export const payoutSetupStatus = (
  account: PayoutAccount | null
): PayoutSetupStatus => {
  if (account === null) {
    return "needs_details";
  }

  const disabledReason = account.requirements?.disabled_reason ?? "";

  // Stripe's rejection is final, and a pause is Garage Cómics's own decision; no more details from the Author change either.
  if (disabledReason.startsWith("rejected.")) {
    return "rejected";
  }

  if (disabledReason === "platform_paused") {
    return "paused";
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
