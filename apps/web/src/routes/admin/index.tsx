import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarDays,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { listAdmins } from "@/functions/admins";
import { getActiveEdition } from "@/functions/editions";
import { countPendingProposals } from "@/functions/proposals";
import { editionPhaseLabels } from "@/lib/edition";
import { formatDate } from "@/lib/format";

const StatCard = ({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon: LucideIcon;
  value: string | number;
}) => (
  <Card className="[--card-spacing:--spacing(4)]">
    <CardHeader>
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
        <CardTitle>
          <span className="font-normal">{label}</span>
        </CardTitle>
        <Icon aria-hidden className="size-4 shrink-0" />
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-medium break-words">{value}</p>
    </CardContent>
  </Card>
);

const AdminHome = () => {
  const { edition, pendingProposals, admins } = Route.useLoaderData();
  const { session } = Route.useRouteContext();

  return (
    <>
      <p className="text-muted-foreground text-sm">Hola {session?.user.name}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Edición activa"
          icon={CalendarDays}
          value={edition?.name ?? "Ninguna"}
        />
        <StatCard
          label="Fase"
          icon={CalendarClock}
          value={
            edition === null ? "Sin Edición" : editionPhaseLabels[edition.phase]
          }
        />
        <StatCard
          label="Propuestas pendientes"
          icon={FileText}
          value={pendingProposals}
        />
        <StatCard label="Administradores" icon={ShieldCheck} value={admins} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-semibold">Fechas de la Edición</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {edition === null ? (
            <p className="text-muted-foreground">
              Aún no hay una Edición activa.{" "}
              <Link to="/admin/ediciones" className="text-foreground underline">
                Ir a Ediciones
              </Link>
            </p>
          ) : (
            <dl className="text-muted-foreground grid gap-1">
              <div className="flex flex-wrap gap-x-2">
                <dt>Propuestas:</dt>
                <dd className="text-foreground">
                  {formatDate(edition.proposalsOpenAt)} al{" "}
                  {formatDate(edition.proposalsCloseAt)}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt>Venta:</dt>
                <dd className="text-foreground">
                  {formatDate(edition.salesOpenAt)} al{" "}
                  {formatDate(edition.salesCloseAt)}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    const [edition, pendingProposals, admins] = await Promise.all([
      getActiveEdition(),
      countPendingProposals(),
      listAdmins(),
    ]);

    return { edition, pendingProposals, admins: admins.length };
  },
  head: () => ({ meta: [{ title: "Inicio · Garage Cómics" }] }),
  component: AdminHome,
});
