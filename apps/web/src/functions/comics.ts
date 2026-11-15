import { comicSlots } from "@garage-comics/db/schema/comics";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authorMiddleware } from "@/functions/author-middleware";
import { comicInput } from "@/lib/comic";
import { addComic, listComics, saveComic, sendToReview } from "@/server/comics";
import { createDatabase } from "@/server/services";

const createInput = comicInput.extend({ slot: z.enum(comicSlots) });

const updateInput = comicInput.extend({
  id: z.string(),
  revision: z.number().int(),
});

const submitInput = z.object({ id: z.string(), revision: z.number().int() });

const invalid = (error: z.ZodError) => ({
  status: "invalid" as const,
  message: error.issues[0]?.message,
});

export const getMyComics = createServerFn({ method: "GET" })
  .middleware([authorMiddleware])
  .handler(
    async ({ context }) =>
      await listComics(createDatabase(), context.session.user, new Date())
  );

export const createComic = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator((data: z.input<typeof createInput>) => createInput.safeParse(data))
  .handler(async ({ data, context }) =>
    data.success
      ? await addComic(
          createDatabase(),
          context.session.user,
          data.data,
          new Date()
        )
      : invalid(data.error)
  );

export const updateComic = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator((data: z.input<typeof updateInput>) => updateInput.safeParse(data))
  .handler(async ({ data, context }) =>
    data.success
      ? await saveComic(
          createDatabase(),
          context.session.user,
          data.data,
          new Date()
        )
      : invalid(data.error)
  );

export const submitComic = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator(submitInput)
  .handler(
    async ({ data, context }) =>
      await sendToReview(
        createDatabase(),
        context.session.user,
        data,
        new Date()
      )
  );
