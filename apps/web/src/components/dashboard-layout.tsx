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
  useLocation,
  useRouteContext,
} from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useSignOut } from "@/lib/use-sign-out";

export interface DashboardSection {
  to: Extract<LinkProps["to"], string>;
  label: string;
  icon: LucideIcon;
}

interface DashboardProps {
  /** Heading of the navigation group. */
  groupLabel: string;
  /** The first section is the dashboard's home and is current only on its exact path. */
  sections: readonly [DashboardSection, ...DashboardSection[]];
}

const isCurrent = (
  pathname: string,
  section: DashboardSection,
  home: DashboardSection
) =>
  section === home ? pathname === section.to : pathname.startsWith(section.to);

const DashboardNav = ({ groupLabel, sections }: DashboardProps) => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { setOpenMobile } = useSidebar();
  const [home] = sections;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sections.map((section) => (
            <SidebarMenuItem key={section.to}>
              <SidebarMenuButton
                isActive={isCurrent(pathname, section, home)}
                render={
                  <Link
                    to={section.to}
                    aria-current={
                      isCurrent(pathname, section, home) ? "page" : undefined
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

const DashboardFooter = () => {
  const user = useRouteContext({
    from: "__root__",
    select: (context) => context.session?.user,
  });

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

const DashboardTitle = ({ sections }: Pick<DashboardProps, "sections">) => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [home] = sections;

  const current = sections.find((section) =>
    isCurrent(pathname, section, home)
  );

  // A not-found or error page inside a dashboard brings its own h1.
  const hidden = current === undefined;

  return (
    <>
      <Separator
        hidden={hidden}
        orientation="vertical"
        className="data-vertical:h-4 data-vertical:self-center"
      />
      <h1 hidden={hidden} className="text-base font-semibold">
        {current?.label}
      </h1>
    </>
  );
};

/** The sidebar shell shared by the Admin and Author areas. */
export const DashboardLayout = ({ groupLabel, sections }: DashboardProps) => (
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
        <DashboardNav groupLabel={groupLabel} sections={sections} />
      </SidebarContent>
      <DashboardFooter />
    </Sidebar>
    <SidebarInset className="min-w-0">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <SidebarTrigger />
        <DashboardTitle sections={sections} />
      </header>
      <div className="flex flex-col gap-6 p-4">
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
);
