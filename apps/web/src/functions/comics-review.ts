import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminMiddleware } from "@/functions/admin-middleware";
import { decisionInput } from "@/lib/comic";
import {
  countComicsInReview,
  decideComic,
  listComicsToReview,
} from "@/server/comics";
import { createDatabase } from "@/server/services";

export const getComicsToReview = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(
    z.object({ status: z.enum(["in_review", "approved", "rejected"]) })
  )
  .handler(
    async ({ data }) =>
      await listComicsToReview(createDatabase(), data.status, new Date())
  );

export const getComicsInReviewCount = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => await countComicsInReview(createDatabase()));

export const reviewComic = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: z.input<typeof decisionInput>) =>
    decisionInput.safeParse(data)
  )
  .handler(async ({ data, context }) =>
    data.success
      ? await decideComic(
          createDatabase(),
          context.session.user,
          data.data,
          new Date()
        )
      : {
          status: "invalid" as const,
          message: data.error.issues[0]?.message,
        }
  );
