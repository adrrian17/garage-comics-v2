import { createFileRoute, redirect } from "@tanstack/react-router";
import { LayoutDashboard, ShieldCheck, UserRound } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import type { DashboardSection } from "@/components/dashboard-layout";

const sections = [
  { to: "/autor", label: "Inicio", icon: LayoutDashboard },
  { to: "/autor/perfil", label: "Perfil", icon: UserRound },
] as const satisfies readonly [DashboardSection, ...DashboardSection[]];

const AuthorLayout = () => {
  const isAdmin = Route.useRouteContext({
    select: (context) => context.session?.user.role === "admin",
  });

  return (
    <DashboardLayout
      groupLabel="Mi cuenta"
      sections={sections}
      switchTo={
        isAdmin
          ? { to: "/admin", label: "Administración", icon: ShieldCheck }
          : undefined
      }
    />
  );
};

export const Route = createFileRoute("/autor")({
  beforeLoad: ({ context }) => {
    if (context.session === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({ to: "/entrar" });
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
