import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { log } from "evlog";

import { contentDisposition, copyKey } from "@/lib/download-link";
import { findReadyCopy } from "@/server/downloads";
import { createDatabase } from "@/server/services";

// `_` un-nests it from the page, so it is a plain streaming handler like /portadas/$comicId. Start answers HEAD with this same handler.
const handleDownload = async ({
  request,
  params,
}: {
  request: Request;
  params: { downloadLinkId: string; orderItemId: string };
}) => {
  const copy = await findReadyCopy(
    createDatabase(),
    params.downloadLinkId,
    params.orderItemId,
    new Date()
  );

  if (copy?.orderNumber === null || copy === undefined) {
    return Response.redirect(
      new URL(`/descargas/${params.downloadLinkId}`, request.url),
      303
    );
  }

  const object = await env.DOWNLOADS.get(
    copyKey(params.downloadLinkId, params.orderItemId)
  );

  if (object === null) {
    log.error({
      action: "download_copy",
      reason: "ready_copy_missing",
      downloadLinkId: params.downloadLinkId,
      orderItemId: params.orderItemId,
    });

    return new Response("No encontrado.", { status: 404 });
  }

  const headers = new Headers({
    "cache-control": "private, no-store",
    "content-disposition": contentDisposition(copy.title, copy.orderNumber),
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex",
  });

  object.writeHttpMetadata(headers);
  headers.set("content-length", String(object.size));

  return new Response(object.body, { headers });
};

export const Route = createFileRoute(
  "/descargas/$downloadLinkId_/$orderItemId"
)({
  server: { handlers: { GET: handleDownload } },
});
