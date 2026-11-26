import { formatOrderNumber } from "./order-number";

/** A Download Link works for 24 hours from when its email is sent, with no download limit (story 33). */
export const DOWNLOAD_LINK_HOURS = 24;

const DOWNLOAD_LINK_TTL_MS = DOWNLOAD_LINK_HOURS * 60 * 60 * 1000;

/** After this many hand-offs to the container a copy is given up on; an Admin resend starts a fresh set. */
export const MAX_COPY_ATTEMPTS = 4;

const FIRST_RETRY_MS = 30 * 1000;

const MAX_RETRY_MS = 10 * 60 * 1000;

/** When a Download Link whose email goes out at `sentAt` stops working. */
export const downloadLinkExpiry = (sentAt: Date) =>
  new Date(sentAt.getTime() + DOWNLOAD_LINK_TTL_MS);

/** The one boundary rule: a link works strictly before its expiry, never at it. */
export const isDownloadLinkOpen = (expiresAt: Date, now: Date) =>
  now.getTime() < expiresAt.getTime();

export type CopyState = "ready" | "preparing" | "failed";

/** A copy fails only once its last attempt has ended in an error: an attempt clears `lastError` when it starts, so one still running reads as preparing. */
export const copyState = (copy: {
  readyAt: Date | null;
  attempts: number;
  lastError: string | null;
}): CopyState => {
  if (copy.readyAt !== null) {
    return "ready";
  }

  return copy.attempts >= MAX_COPY_ATTEMPTS && copy.lastError !== null
    ? "failed"
    : "preparing";
};

/** What the Customer sees at the Download Link. The expiry wins over every copy: an expired link lists no comics, ready or not. */
export type DownloadLinkView =
  | { status: "expired"; orderNumber: string; expiresAt: Date }
  | {
      status: "open";
      orderNumber: string;
      expiresAt: Date;
      comics: { orderItemId: string; title: string; state: CopyState }[];
    };

export const viewDownloadLink = (
  link: { orderNumber: number; expiresAt: Date },
  copies: readonly {
    orderItemId: string;
    title: string;
    readyAt: Date | null;
    attempts: number;
    lastError: string | null;
  }[],
  now: Date
): DownloadLinkView => {
  const orderNumber = formatOrderNumber(link.orderNumber);

  if (!isDownloadLinkOpen(link.expiresAt, now)) {
    return { status: "expired", orderNumber, expiresAt: link.expiresAt };
  }

  return {
    status: "open",
    orderNumber,
    expiresAt: link.expiresAt,
    comics: copies.map((copy) => ({
      orderItemId: copy.orderItemId,
      title: copy.title,
      state: copyState(copy),
    })),
  };
};

/** How long the Watermarker waits before trying a copy again after `attempts` hand-offs: doubling from 30 seconds, capped at 10 minutes. */
export const retryDelayMs = (attempts: number) =>
  Math.min(FIRST_RETRY_MS * 2 ** attempts, MAX_RETRY_MS);

/** The footer stamped on every page (story 32). The container may break the line at " · " to keep it readable on a narrow page. */
export const stampText = (email: string, orderNumber: number) =>
  `Compra ${formatOrderNumber(orderNumber)} · ${email}`;

/** Where a copy lives in the `downloads` bucket. Derived, never stored: both ids already are. */
export const copyKey = (downloadLinkId: string, orderItemId: string) =>
  `${downloadLinkId}/${orderItemId}.pdf`;

/** Saves the copy as "<title> - GRG-1042.pdf": the exact UTF-8 name, with an ASCII fallback for old clients. */
export const contentDisposition = (title: string, orderNumber: number) => {
  const name = `${title} - ${formatOrderNumber(orderNumber)}.pdf`;

  const ascii = name
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^\u0020-\u007E]|["\\]/gu, "_");

  // RFC 5987 attr-char forbids these raw, and encodeURIComponent leaves them unencoded.
  const utf8 = encodeURIComponent(name)
    .replaceAll("'", "%27")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29")
    .replaceAll("*", "%2A");

  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
};
