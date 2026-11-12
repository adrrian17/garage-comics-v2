import { createRouter } from "@tanstack/react-router";

import Loader from "./components/loader";
import { NotFound, PageError } from "./components/page-message";
import { routeTree } from "./routeTree.gen";

export const getRouter = () =>
  createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: PageError,
  });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
