import { AwsClient } from "aws4fetch";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { PART_BYTES, planParts, sniffMatches } from "@/lib/comic";
import type { UploadKind } from "@/lib/comic";

// Part URLs must outlive a slow upload of the largest file.
const PART_URL_TTL_SECONDS = 6 * 60 * 60;

// The longest signature (WebP) ends at byte 12.
const SNIFF_BYTES = 16;

const s3Credentials = z.object({
  endpoint: z.string(),
  bucketName: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
});

const notRecognized = {
  cover: "La portada debe ser una imagen PNG, JPG o WebP.",
  pdf: "El archivo no es un PDF.",
} as const satisfies Record<UploadKind, string>;

// The native binding cannot presign, so URLs for the browser are signed with the S3 credentials.
const presign = async (
  method: "GET" | "PUT",
  key: string,
  query: Record<string, string>,
  ttlSeconds: number
) => {
  const s3 = s3Credentials.parse(JSON.parse(env.COMICS_S3));

  const client = new AwsClient({
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const url = new URL(`${s3.endpoint}/${s3.bucketName}/${key}`);

  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }

  url.searchParams.set("X-Amz-Expires", String(ttlSeconds));

  const signed = await client.sign(url, {
    method,
    aws: { signQuery: true },
  });

  return signed.url;
};

/** Refuses a file by size and type before anything exists, then opens a multipart upload with one signed URL per part. */
export const startUpload = async ({
  comicId,
  kind,
  contentType,
  sizeBytes,
}: {
  comicId: string;
  kind: UploadKind;
  contentType: string;
  sizeBytes: number;
}) => {
  const plan = planParts(kind, contentType, sizeBytes);

  if (plan.status === "invalid") {
    return plan;
  }

  // Keys are never reused or deleted once attached: an older Edition may still point at them.
  const key = `comics/${comicId}/${kind}-${crypto.randomUUID()}`;

  const upload = await env.COMICS.createMultipartUpload(key, {
    httpMetadata: { contentType },
  });

  const urls = await Promise.all(
    Array.from(
      { length: plan.parts },
      async (_part, index) =>
        await presign(
          "PUT",
          key,
          { partNumber: String(index + 1), uploadId: upload.uploadId },
          PART_URL_TTL_SECONDS
        )
    )
  );

  return {
    status: "ready" as const,
    key,
    uploadId: upload.uploadId,
    partBytes: PART_BYTES,
    urls,
  };
};

/** Assembles the parts, then checks what actually arrived: the declared size and type came from the browser. */
export const finishUpload = async ({
  comicId,
  kind,
  key,
  uploadId,
  parts,
}: {
  comicId: string;
  kind: UploadKind;
  key: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
}) => {
  if (!key.startsWith(`comics/${comicId}/${kind}-`)) {
    return {
      status: "invalid" as const,
      message: "Ese archivo no es de este cómic.",
    };
  }

  // A retry after a lost reply finds the object already assembled.
  const stored =
    (await env.COMICS.head(key)) ??
    (await env.COMICS.resumeMultipartUpload(key, uploadId).complete(parts));

  const size = planParts(
    kind,
    stored.httpMetadata?.contentType ?? "",
    stored.size
  );

  const head = await env.COMICS.get(key, {
    range: { offset: 0, length: SNIFF_BYTES },
  });

  const bytes = new Uint8Array((await head?.arrayBuffer()) ?? []);

  if (size.status === "invalid" || !sniffMatches(kind, bytes)) {
    await env.COMICS.delete(key);

    return {
      status: "invalid" as const,
      message: size.status === "invalid" ? size.message : notRecognized[kind],
    };
  }

  return { status: "stored" as const, bytes: stored.size };
};

export const fileUrl = async (key: string, ttlSeconds: number) =>
  await presign("GET", key, {}, ttlSeconds);
