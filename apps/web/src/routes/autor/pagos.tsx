import { createFileRoute } from "@tanstack/react-router";

import { PayoutSetup } from "@/components/payout-setup";
import { getPayoutSetup } from "@/functions/payouts";

const PayoutsPage = () => <PayoutSetup {...Route.useLoaderData()} />;

export const Route = createFileRoute("/autor/pagos")({
  loader: async () => await getPayoutSetup(),
  head: () => ({ meta: [{ title: "Pagos · Garage Cómics" }] }),
  component: PayoutsPage,
});
