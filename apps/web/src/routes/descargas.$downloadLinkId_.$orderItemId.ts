import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { log } from "evlog";

import { contentDisposition, copyKey } from "@/lib/download-link";
import { findReadyCopy } from "@/server/downloads";
import { createDatabase } from "@/server/services";

// Streams one watermarked copy from R2, as often as the Customer likes while the link works (story 33).
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

  // Expired, preparing, failed or unknown: the page explains each one, so send the Customer there instead of a bare error.
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
    // Every copy is written after its link's 24 hours started, and the bucket keeps it at least a day, so this is a bug.
    log.error({
      action: "download_copy",
      reason: "ready_copy_missing",
      downloadLinkId: params.downloadLinkId,
      orderItemId: params.orderItemId,
    });

    return new Response("No encontrado.", { status: 404 });
  }

  // The URL is a credential and the file is one Customer's: never cached, indexed or leaked as a Referer.
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
