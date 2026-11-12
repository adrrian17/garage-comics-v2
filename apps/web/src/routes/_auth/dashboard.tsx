import { createFileRoute } from "@tanstack/react-router";

import { getPrivateData } from "@/functions/session";

const RouteComponent = () => {
  const { session } = Route.useRouteContext();
  const privateData = Route.useLoaderData();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.user.name}</p>
      <p>API: {privateData.message}</p>
    </div>
  );
};

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
  loader: async () => await getPrivateData(),
});
