import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import type { DashboardSection } from "@/components/dashboard-layout";

const sections = [
  { to: "/admin", label: "Inicio", icon: LayoutDashboard },
  { to: "/admin/propuestas", label: "Propuestas", icon: FileText },
  { to: "/admin/ediciones", label: "Ediciones", icon: CalendarDays },
  { to: "/admin/administradores", label: "Administradores", icon: ShieldCheck },
] as const satisfies readonly [DashboardSection, ...DashboardSection[]];

const AdminLayout = () => (
  <DashboardLayout groupLabel="Administración" sections={sections} />
);

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (context.session === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({ to: "/entrar" });
    }

    if (context.session.user.role !== "admin") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({ to: "/autor" });
    }
  },
  head: () => ({
    meta: [
      { title: "Administración · Garage Cómics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});
