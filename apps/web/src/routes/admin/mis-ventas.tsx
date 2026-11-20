import { createFileRoute } from "@tanstack/react-router";

import { SalesTable } from "@/components/sales-table";
import { getMySales } from "@/functions/sales";

const AdminSalesPage = () => <SalesTable sales={Route.useLoaderData()} />;

export const Route = createFileRoute("/admin/mis-ventas")({
  loader: async () => await getMySales(),
  head: () => ({ meta: [{ title: "Mis ventas · Garage Cómics" }] }),
  component: AdminSalesPage,
});
