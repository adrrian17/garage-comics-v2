import { Button } from "@garage-comics/ui/components/button";
import { Separator } from "@garage-comics/ui/components/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@garage-comics/ui/components/sidebar";
import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { useSignOut } from "@/lib/use-sign-out";

const sections = [
  { to: "/admin", label: "Inicio", icon: LayoutDashboard },
  { to: "/admin/propuestas", label: "Propuestas", icon: FileText },
  { to: "/admin/ediciones", label: "Ediciones", icon: CalendarDays },
  { to: "/admin/administradores", label: "Administradores", icon: ShieldCheck },
] as const;

const isCurrent = (pathname: string, to: string) =>
  to === "/admin" ? pathname === to : pathname.startsWith(to);

const AdminNav = () => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Administración</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sections.map((section) => (
            <SidebarMenuItem key={section.to}>
              <SidebarMenuButton
                isActive={isCurrent(pathname, section.to)}
                render={
                  <Link
                    to={section.to}
                    aria-current={
                      isCurrent(pathname, section.to) ? "page" : undefined
                    }
                    onClick={() => {
                      setOpenMobile(false);
                    }}
                  />
                }
              >
                <section.icon />
                <span>{section.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const AdminFooter = () => {
  const user = Route.useRouteContext().session?.user;
  const signOut = useSignOut();

  return (
    <SidebarFooter>
      <div className="flex flex-col gap-1 p-2">
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {user?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut data-icon="inline-start" />
          Cerrar sesión
        </Button>
      </div>
    </SidebarFooter>
  );
};

const AdminTitle = () => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const current = sections.find((section) => isCurrent(pathname, section.to));

  return <h1 className="text-base font-semibold">{current?.label}</h1>;
};

const AdminLayout = () => (
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader>
        <Link
          to="/"
          className="focus-visible:ring-ring/50 m-2 w-fit rounded-md text-lg font-bold tracking-tight outline-none focus-visible:ring-3"
        >
          Garage Cómics
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <AdminNav />
      </SidebarContent>
      <AdminFooter />
    </Sidebar>
    <SidebarInset className="min-w-0">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="data-vertical:h-4 data-vertical:self-center"
        />
        <AdminTitle />
      </header>
      <div className="flex flex-col gap-6 p-4">
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
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
