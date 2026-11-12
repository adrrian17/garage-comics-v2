import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { getSession } from "@/functions/session";

const AuthLayout = () => <Outlet />;

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await getSession();

    if (!session) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({
        to: "/login",
      });
    }

    return { session };
  },
});
