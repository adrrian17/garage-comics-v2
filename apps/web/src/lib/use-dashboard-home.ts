import { useLocation } from "@tanstack/react-router";

const dashboardHomes = ["/admin", "/autor"] as const;

/** The home of the dashboard (Admin or Author) the current page lives in, or undefined on public pages. */
export const useDashboardHome = () =>
  useLocation({
    select: ({ pathname }) =>
      dashboardHomes.find(
        (home) => pathname === home || pathname.startsWith(`${home}/`)
      ),
  });
