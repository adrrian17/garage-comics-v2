import { createFileRoute } from "@tanstack/react-router";

import { PayoutSetup } from "@/components/payout-setup";
import { getPayoutSetup } from "@/functions/payouts";

const AdminPayoutsPage = () => <PayoutSetup {...Route.useLoaderData()} />;

export const Route = createFileRoute("/admin/pagos")({
  loader: async () => await getPayoutSetup(),
  head: () => ({ meta: [{ title: "Mis pagos · Garage Cómics" }] }),
  component: AdminPayoutsPage,
});
