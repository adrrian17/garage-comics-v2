import { createFileRoute, redirect } from "@tanstack/react-router";
import { LayoutDashboard, UserRound } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import type { DashboardSection } from "@/components/dashboard-layout";

const sections = [
  { to: "/autor", label: "Inicio", icon: LayoutDashboard },
  { to: "/autor/perfil", label: "Perfil", icon: UserRound },
] as const satisfies readonly [DashboardSection, ...DashboardSection[]];

const AuthorLayout = () => (
  <DashboardLayout groupLabel="Mi cuenta" sections={sections} />
);

export const Route = createFileRoute("/autor")({
  beforeLoad: ({ context }) => {
    if (context.session === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({ to: "/entrar" });
    }

    if (context.session.user.role === "admin") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [
      { title: "Mi cuenta · Garage Cómics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthorLayout,
});
