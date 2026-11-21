import { createServerFn } from "@tanstack/react-start";

import { authorMiddleware } from "@/functions/author-middleware";
import { listAuthorSales } from "@/server/sales";
import { createDatabase } from "@/server/services";

export const getMySales = createServerFn({ method: "GET" })
  .middleware([authorMiddleware])
  .handler(
    async ({ context }) =>
      await listAuthorSales(createDatabase(), context.session.user.id)
  );
