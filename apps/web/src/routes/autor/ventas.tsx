import { createFileRoute } from "@tanstack/react-router";

import { SalesTable } from "@/components/sales-table";
import { getMySales } from "@/functions/sales";

const SalesPage = () => <SalesTable sales={Route.useLoaderData()} />;

export const Route = createFileRoute("/autor/ventas")({
  loader: async () => await getMySales(),
  head: () => ({ meta: [{ title: "Ventas · Garage Cómics" }] }),
  component: SalesPage,
});
