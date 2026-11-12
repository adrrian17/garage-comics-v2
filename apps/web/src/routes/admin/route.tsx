import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";

const sections = [
  { to: "/admin/propuestas", label: "Propuestas" },
  { to: "/admin/ediciones", label: "Ediciones" },
  { to: "/admin/administradores", label: "Administradores" },
] as const;

const AdminLayout = () => (
  <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
    <nav
      aria-label="Administración"
      className="border-foreground flex gap-1 overflow-x-auto border-b-2"
    >
      {sections.map((section) => (
        <Link
          key={section.to}
          to={section.to}
          className="text-muted-foreground hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground -mb-0.5 border-b-4 border-transparent px-3 py-2 text-sm font-semibold whitespace-nowrap"
        >
          {section.label}
        </Link>
      ))}
    </nav>
    <Outlet />
  </main>
);

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (context.session === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({ to: "/entrar" });
    }

    if (context.session.user.role !== "admin") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({ to: "/" });
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
