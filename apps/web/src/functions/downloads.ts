import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminMiddleware } from "@/functions/admin-middleware";
import { ORDER_SEARCH_MAX_LENGTH, parseOrderSearch } from "@/lib/order-number";
import { readDownloadLink, resendDownloadLink } from "@/server/downloads";
import { listPaidOrders } from "@/server/orders";
import { createDatabase } from "@/server/services";

const DOWNLOAD_LINK_ID_LENGTH = 36;

export const getDownloadLink = createServerFn({ method: "GET" })
  .validator(
    z.object({ downloadLinkId: z.string().max(DOWNLOAD_LINK_ID_LENGTH) })
  )
  .handler(
    async ({ data }) =>
      await readDownloadLink(createDatabase(), data.downloadLinkId, new Date())
  );

export const getPaidOrders = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(
    z.object({ search: z.string().max(ORDER_SEARCH_MAX_LENGTH).optional() })
  )
  .handler(
    async ({ data }) =>
      await listPaidOrders(
        createDatabase(),
        parseOrderSearch(data.search ?? ""),
        new Date()
      )
  );

export const resendLink = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(
    async ({ data, context }) =>
      await resendDownloadLink(
        createDatabase(),
        context.session.user,
        data.orderId,
        new Date()
      )
  );
