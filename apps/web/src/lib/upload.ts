import { finishComicUpload, startComicUpload } from "@/functions/comics";

import { planParts } from "./comic";
import type { UploadKind } from "./comic";

const MAX_ATTEMPTS = 3;

const attempt = async <T>(
  task: () => Promise<T>,
  left = MAX_ATTEMPTS
): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    if (left <= 1) {
      throw error;
    }

    return await attempt(task, left - 1);
  }
};

// XMLHttpRequest, not fetch: fetch cannot report upload progress.
const putPart = async (
  url: string,
  body: Blob,
  onProgress: (loadedBytes: number) => void
) =>
  // oxlint-disable-next-line promise/avoid-new -- XMLHttpRequest reports upload progress and has no promise API.
  await new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", url);
    request.upload.addEventListener("progress", (event) => {
      onProgress(event.loaded);
    });
    request.addEventListener("load", () => {
      const etag = request.getResponseHeader("ETag");
      const stored = request.status >= 200 && request.status < 300;

      if (stored && etag !== null) {
        resolve(etag.replaceAll('"', ""));
      } else {
        reject(new Error(`R2 answered ${request.status} to a part`));
      }
    });
    request.addEventListener("error", () => {
      reject(new Error("The connection dropped during a part"));
    });
    request.send(body);
  });

const putParts = async (
  file: File,
  urls: string[],
  partBytes: number,
  onProgress: (fraction: number) => void
) => {
  const parts: { partNumber: number; etag: string }[] = [];

  for (const [index, url] of urls.entries()) {
    const start = index * partBytes;
    const body = file.slice(start, start + partBytes);

    // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- parts go one at a time so progress only moves forward and one slow link is not split across many requests.
    const etag = await attempt(
      async () =>
        await putPart(url, body, (loaded) => {
          onProgress((start + loaded) / file.size);
        })
    );

    parts.push({ partNumber: index + 1, etag });
  }

  return parts;
};

const GENERIC_FAILURE =
  "No pudimos subir el archivo. Actualiza la página e intenta de nuevo.";

/** Uploads one file straight to R2 in parts, then attaches it to the comic. Refuses by size and type before any request. */
export const uploadComicFile = async (
  comicId: string,
  kind: UploadKind,
  file: File,
  onProgress: (fraction: number) => void
) => {
  const plan = planParts(kind, file.type, file.size);

  if (plan.status === "invalid") {
    return { status: "failed" as const, message: plan.message };
  }

  const started = await startComicUpload({
    data: {
      id: comicId,
      kind,
      contentType: file.type,
      sizeBytes: file.size,
    },
  }).catch(() => null);

  if (started?.status === "invalid") {
    return { status: "failed" as const, message: started.message };
  }

  if (started?.status !== "ready") {
    return { status: "failed" as const, message: GENERIC_FAILURE };
  }

  const parts = await putParts(
    file,
    started.urls,
    started.partBytes,
    onProgress
  ).catch(() => null);

  if (parts === null) {
    return {
      status: "failed" as const,
      message: "Se cortó la subida. Intenta de nuevo.",
    };
  }

  const finished = await finishComicUpload({
    data: {
      id: comicId,
      kind,
      key: started.key,
      uploadId: started.uploadId,
      parts,
    },
  }).catch(() => null);

  if (finished?.status === "invalid") {
    return { status: "failed" as const, message: finished.message };
  }

  if (finished?.status !== "attached") {
    return { status: "failed" as const, message: GENERIC_FAILURE };
  }

  return {
    status: "done" as const,
    sentBackToReview: finished.sentBackToReview,
  };
};
