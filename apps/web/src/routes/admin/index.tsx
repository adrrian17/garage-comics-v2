import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
    throw redirect({ to: "/admin/propuestas" });
  },
});
