import { comicSlots } from "@garage-comics/db/schema/comics";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authorMiddleware } from "@/functions/author-middleware";
import { MAX_PARTS, comicInput, uploadKinds } from "@/lib/comic";
import {
  addComic,
  beginUpload,
  completeUpload,
  listComics,
  offerPreviousWork,
  saveComic,
  sendToReview,
  withdrawComic,
} from "@/server/comics";
import { createDatabase } from "@/server/services";

const createInput = comicInput.extend({ slot: z.enum(comicSlots) });

const updateInput = comicInput.extend({
  id: z.string(),
  revision: z.number().int(),
});

const submitInput = z.object({ id: z.string(), revision: z.number().int() });

const startInput = z.object({
  id: z.string(),
  kind: z.enum(uploadKinds),
  contentType: z.string(),
  sizeBytes: z.number(),
});

const finishInput = z.object({
  id: z.string(),
  kind: z.enum(uploadKinds),
  key: z.string(),
  uploadId: z.string(),
  parts: z
    .array(z.object({ partNumber: z.number().int(), etag: z.string() }))
    .max(MAX_PARTS),
});

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

export const startComicUpload = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator(startInput)
  .handler(
    async ({ data, context }) =>
      await beginUpload(
        createDatabase(),
        context.session.user,
        data,
        new Date()
      )
  );

export const finishComicUpload = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator(finishInput)
  .handler(
    async ({ data, context }) =>
      await completeUpload(
        createDatabase(),
        context.session.user,
        data,
        new Date()
      )
  );

export const offerPast = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(
    async ({ data, context }) =>
      await offerPreviousWork(
        createDatabase(),
        context.session.user,
        data,
        new Date()
      )
  );

export const removeComic = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator(submitInput)
  .handler(
    async ({ data, context }) =>
      await withdrawComic(
        createDatabase(),
        context.session.user,
        data,
        new Date()
      )
  );
