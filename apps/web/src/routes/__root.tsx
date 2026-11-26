import { Toaster } from "@garage-comics/ui/components/sonner";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";

import { CountdownBar } from "@/components/countdown-bar";
import Footer from "@/components/footer";
import SiteHeader from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getActiveEdition } from "@/functions/editions";
import { getSession } from "@/functions/session";
import { useDashboardHome } from "@/lib/use-dashboard-home";

import appCss from "../index.css?url";

const EDITION_STALE_MS = 60_000;

const RootDocument = ({ children }: { children: ReactNode }) => (
  <html lang="es-MX" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
);

const RootComponent = () => {
  // The Admin and Author areas bring their own sidebar layout instead of the public chrome.
  const isDashboard = useDashboardHome() !== undefined;
  const edition = Route.useLoaderData();

  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        {isDashboard ? (
          <Outlet />
        ) : (
          <div className="storefront grid min-h-svh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_1fr_auto]">
            <div>
              <CountdownBar edition={edition} />
            </div>
            <SiteHeader />
            <Outlet />
            <Footer />
          </div>
        )}
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
};

export const Route = createRootRoute({
  shellComponent: RootDocument,
  component: RootComponent,
  beforeLoad: async () => ({ session: await getSession() }),
  // The countdown on every public page needs the active Edition; a minute-old phase is close enough between navigations.
  loader: async () => await getActiveEdition(),
  staleTime: EDITION_STALE_MS,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Garage Cómics" },
      {
        name: "description",
        content:
          "Tienda de cómics digitales de autores mexicanos, abierta por tiempo limitado.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
});
