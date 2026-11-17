import { describe, expect, it } from "vite-plus/test";

import {
  MAX_COPY_ATTEMPTS,
  contentDisposition,
  copyKey,
  copyState,
  downloadLinkExpiry,
  isDownloadLinkOpen,
  retryDelayMs,
  stampText,
  viewDownloadLink,
} from "./download-link";

const HOUR_MS = 60 * 60 * 1000;

const sentAt = new Date("2027-02-03T18:00:00.000Z");

const at = (hours: number) => new Date(sentAt.getTime() + hours * HOUR_MS);

describe(isDownloadLinkOpen, () => {
  const expiresAt = downloadLinkExpiry(sentAt);

  it("works until 24 hours after the email was sent", () => {
    expect(isDownloadLinkOpen(expiresAt, at(23.99))).toBeTruthy();
  });

  it("stops at exactly 24 hours", () => {
    expect(isDownloadLinkOpen(expiresAt, at(24))).toBeFalsy();
  });
});

describe(viewDownloadLink, () => {
  const link = { orderNumber: 1042, expiresAt: downloadLinkExpiry(sentAt) };

  const copies = [
    { orderItemId: "a", title: "Uno", readyAt: at(0.1), attempts: 1 },
    { orderItemId: "b", title: "Dos", readyAt: null, attempts: 1 },
    {
      orderItemId: "c",
      title: "Tres",
      readyAt: null,
      attempts: MAX_COPY_ATTEMPTS,
    },
  ];

  it("gives each comic its own state while the link works", () => {
    expect(viewDownloadLink(link, copies, at(1))).toStrictEqual({
      status: "open",
      orderNumber: "GRG-1042",
      expiresAt: at(24),
      comics: [
        { orderItemId: "a", title: "Uno", state: "ready" },
        { orderItemId: "b", title: "Dos", state: "preparing" },
        { orderItemId: "c", title: "Tres", state: "failed" },
      ],
    });
  });

  it("lists no comics once expired, even with every copy ready", () => {
    const ready = copies.map((copy) => ({ ...copy, readyAt: at(0.1) }));

    expect(viewDownloadLink(link, ready, at(24))).toStrictEqual({
      status: "expired",
      orderNumber: "GRG-1042",
      expiresAt: at(24),
    });
  });
});

describe(copyState, () => {
  it("counts a comic with no copy row yet as preparing", () => {
    expect(copyState({ readyAt: null, attempts: 0 })).toBe("preparing");
  });

  it("keeps a copy preparing until its last attempt is used", () => {
    expect(copyState({ readyAt: null, attempts: MAX_COPY_ATTEMPTS - 1 })).toBe(
      "preparing"
    );
  });

  it("calls a copy ready whatever its attempts", () => {
    expect(copyState({ readyAt: sentAt, attempts: MAX_COPY_ATTEMPTS })).toBe(
      "ready"
    );
  });
});

describe(retryDelayMs, () => {
  it("doubles from 30 seconds and stops growing at 10 minutes", () => {
    expect([0, 1, 2, 5, 10].map(retryDelayMs)).toStrictEqual([
      30_000, 60_000, 120_000, 600_000, 600_000,
    ]);
  });
});

describe(stampText, () => {
  it("names the Order Number and the email", () => {
    expect(stampText("ana@example.com", 1042)).toBe(
      "Compra GRG-1042 · ana@example.com"
    );
  });
});

describe(copyKey, () => {
  it("keeps every copy of a Download Link under its own id", () => {
    expect(copyKey("link-1", "item-1")).toBe("link-1/item-1.pdf");
  });
});

describe(contentDisposition, () => {
  it("keeps the exact title for modern clients and an ASCII fallback for the rest", () => {
    expect(contentDisposition('El "Cómic" (1)', 1042)).toBe(
      "attachment; filename=\"El _Comic_ (1) - GRG-1042.pdf\"; filename*=UTF-8''El%20%22C%C3%B3mic%22%20%281%29%20-%20GRG-1042.pdf"
    );
  });
});
