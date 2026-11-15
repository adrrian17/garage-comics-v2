import { editionComic } from "@garage-comics/db/schema/comics";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { createDatabase } from "@/server/services";

const COVER_MAX_AGE_SECONDS = 24 * 60 * 60;

const notFound = () => new Response("No encontrada.", { status: 404 });

// The URL names an approved edition comic, never a key, so it can only ever read a cover: a PDF key is not reachable from here.
const handleCover = async ({
  request,
  params,
}: {
  request: Request;
  params: { comicId: string };
}) => {
  const row = await createDatabase()
    .select({ coverKey: editionComic.coverKey })
    .from(editionComic)
    .where(
      and(
        eq(editionComic.id, params.comicId),
        eq(editionComic.status, "approved")
      )
    )
    .get();

  if (row?.coverKey === null || row === undefined) {
    return notFound();
  }

  // R2 answers If-None-Match itself: a matching ETag returns the object without a body.
  const object = await env.COMICS.get(row.coverKey, {
    onlyIf: request.headers,
  });

  if (object === null) {
    return notFound();
  }

  const headers = new Headers({
    "cache-control": `public, max-age=${COVER_MAX_AGE_SECONDS}`,
    "x-content-type-options": "nosniff",
    etag: object.httpEtag,
  });

  object.writeHttpMetadata(headers);

  return "body" in object
    ? new Response(object.body, { headers })
    : new Response(null, { status: 304, headers });
};

export const Route = createFileRoute("/portadas/$comicId")({
  server: { handlers: { GET: handleCover } },
});
