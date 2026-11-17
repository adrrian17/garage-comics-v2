import type { Database } from "@garage-comics/db";
import { editionComic } from "@garage-comics/db/schema/comics";
import { downloadCopy, downloadLink } from "@garage-comics/db/schema/downloads";
import { order, orderItem } from "@garage-comics/db/schema/orders";
import type { WatermarkerRpc } from "@garage-comics/infra/alchemy.run";
import { DurableObject, env } from "cloudflare:workers";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { log } from "evlog";

import {
  MAX_COPY_ATTEMPTS,
  copyKey,
  retryDelayMs,
  stampText,
} from "@/lib/download-link";
import { formatOrderNumber } from "@/lib/order-number";
import { createDatabase } from "@/server/services";

// The only writer of `download_copy`. One Watermarker per Download Link, named by its id: a resend is a new link, so it gets a new
// Watermarker, new rows, new R2 keys and its own container, and can never clobber a job still running for an older link.

const LINK_KEY = "downloadLinkId";

const PORT = 8080;

// oxlint-disable-next-line sonarjs/no-clear-text-protocols -- getTcpPort delivers it to the container's port inside Cloudflare; scheme and host are placeholders.
const CONTAINER_URL = "http://watermarker";

const STARTUP_POLLS = 40;

const STARTUP_POLL_MS = 250;

/** Creates the copy rows of a Download Link: one per comic of its Order. Safe to repeat. */
const createCopies = async (db: Database, downloadLinkId: string) => {
  await db
    .insert(downloadCopy)
    .select(
      db
        .select({ downloadLinkId: downloadLink.id, orderItemId: orderItem.id })
        .from(downloadLink)
        .innerJoin(orderItem, eq(orderItem.orderId, downloadLink.orderId))
        .where(eq(downloadLink.id, downloadLinkId))
    )
    .onConflictDoNothing();
};

/**
 * The link's copies that are not ready yet, while the link is open (an expired link's copies are no longer worth making).
 * Fewest attempts first, so one failing comic waits behind the others instead of holding them up.
 * Copies already given up on are listed too: a last attempt may have reached R2 before a crash, and is adopted rather than lost.
 */
const unreadyCopies = async (db: Database, downloadLinkId: string, now: Date) =>
  await db
    .select({
      downloadLinkId: downloadCopy.downloadLinkId,
      orderItemId: downloadCopy.orderItemId,
      attempts: downloadCopy.attempts,
      lastError: downloadCopy.lastError,
      pdfKey: editionComic.pdfKey,
      email: order.customerEmail,
      orderNumber: order.number,
    })
    .from(downloadCopy)
    .innerJoin(downloadLink, eq(downloadLink.id, downloadCopy.downloadLinkId))
    .innerJoin(orderItem, eq(orderItem.id, downloadCopy.orderItemId))
    .innerJoin(editionComic, eq(editionComic.id, orderItem.editionComicId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(
        eq(downloadCopy.downloadLinkId, downloadLinkId),
        isNull(downloadCopy.readyAt),
        gt(downloadLink.expiresAt, now)
      )
    )
    .orderBy(asc(downloadCopy.attempts), asc(orderItem.title));

type CopyJob = Awaited<ReturnType<typeof unreadyCopies>>[number];

const unready = (job: CopyJob) =>
  and(
    eq(downloadCopy.downloadLinkId, job.downloadLinkId),
    eq(downloadCopy.orderItemId, job.orderItemId),
    isNull(downloadCopy.readyAt)
  );

const markReady = async (db: Database, job: CopyJob) => {
  await db
    .update(downloadCopy)
    .set({ readyAt: new Date(), lastError: null })
    .where(unready(job));
};

/**
 * Saves why a copy failed and says how long to wait before the next wake-up: the backoff, counted from now because a long
 * attempt may outlast the alarm armed before it, or nothing once the copy is given up on, so the link's other copies go next.
 */
const recordFailure = async (db: Database, job: CopyJob, error: string) => {
  await db.update(downloadCopy).set({ lastError: error }).where(unready(job));

  if (job.attempts + 1 < MAX_COPY_ATTEMPTS) {
    return retryDelayMs(job.attempts + 1);
  }

  // Like a stuck Transfer: a person looks. The Customer's page shows this comic as failed; an Admin resend starts a fresh set.
  log.error({
    action: "make_download_copy",
    reason: "gave_up",
    downloadLinkId: job.downloadLinkId,
    orderItemId: job.orderItemId,
    orderNumber:
      job.orderNumber === null ? null : formatOrderNumber(job.orderNumber),
    error,
  });

  return 0;
};

/**
 * The next copy to hand to the container, or undefined when none is left. On the way, adopts every copy an earlier attempt
 * finished: R2 writes a key whole or not at all and the key is this link's alone, so a copy in the bucket is a finished copy,
 * even when the wake-up that wrote it crashed before saving `readyAt`.
 * A last attempt that left neither a copy nor an error crashed: the runtime runs one alarm at a time per Durable Object, so it is
 * not still running. It is given up on, or the Customer's page would show it preparing forever.
 */
const nextJob = async (db: Database, downloadLinkId: string, now: Date) => {
  const copies = await unreadyCopies(db, downloadLinkId, now);

  // A copy never handed to the container cannot be in the bucket, so only attempted ones are looked up.
  const finished = await Promise.all(
    copies.map(
      async (job) =>
        job.attempts > 0 &&
        (await env.DOWNLOADS.head(
          copyKey(job.downloadLinkId, job.orderItemId)
        )) !== null
    )
  );

  await Promise.all(
    copies.map(async (job, index) => {
      if (finished[index]) {
        await markReady(db, job);
      } else if (job.attempts >= MAX_COPY_ATTEMPTS && job.lastError === null) {
        await recordFailure(db, job, "interrupted");
      }
    })
  );

  return copies.find(
    (job, index) => !finished[index] && job.attempts < MAX_COPY_ATTEMPTS
  );
};

/** Starts the container if needed and waits until its server answers. Capacity and start errors throw before any attempt is counted. */
const startContainer = async (container: Container) => {
  if (!container.running) {
    // The PDF comes in and goes out through this Durable Object, so the container needs no internet and holds no credentials.
    container.start({ enableInternet: false });
  }

  let lastError = "no answer";

  for (let poll = 0; poll < STARTUP_POLLS; poll += 1) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- each poll waits for the previous one to fail.
      const response = await container
        .getTcpPort(PORT)
        .fetch(`${CONTAINER_URL}/health`);

      if (response.ok) {
        return;
      }

      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    // oxlint-disable-next-line no-await-in-loop -- the wait between polls is the point.
    await scheduler.wait(STARTUP_POLL_MS);
  }

  throw new Error(`The watermarker did not start: ${lastError}.`);
};

/**
 * Streams the original PDF from the `comics` bucket into the container and the stamped copy back into the `downloads` bucket.
 * The bytes never sit in the Worker: both sides are piped, so a 500 MB PDF costs no Worker memory.
 * A retry overwrites the same key with the same bytes: the copy depends only on the PDF, the email and the Order Number.
 */
const makeCopy = async (container: Container, job: CopyJob) => {
  if (job.pdfKey === null || job.orderNumber === null) {
    throw new Error(`Copy ${job.orderItemId} has no PDF or no Order Number.`);
  }

  const source = await env.COMICS.get(job.pdfKey);

  if (source === null) {
    throw new Error(`The PDF ${job.pdfKey} is missing from the comics bucket.`);
  }

  // Fixed lengths both ways: the container reads exactly the PDF's size, and R2 refuses a body of unknown length.
  const upload = new FixedLengthStream(source.size);

  const query = new URLSearchParams({
    text: stampText(job.email, job.orderNumber),
  });

  const [, response] = await Promise.all([
    source.body.pipeTo(upload.writable),
    container
      .getTcpPort(PORT)
      .fetch(`${CONTAINER_URL}/stamp?${query.toString()}`, {
        method: "POST",
        body: upload.readable,
      }),
  ]);

  const length = response.headers.get("content-length");

  if (!response.ok || response.body === null || length === null) {
    throw new Error(
      `The watermarker answered ${response.status}: ${await response.text()}`
    );
  }

  const copy = new FixedLengthStream(Number(length));

  await Promise.all([
    response.body.pipeTo(copy.writable),
    env.DOWNLOADS.put(
      copyKey(job.downloadLinkId, job.orderItemId),
      copy.readable,
      { httpMetadata: { contentType: "application/pdf" } }
    ),
  ]);
};

/** Makes the watermarked copies of one Download Link, one copy per alarm, in its own container (story 32). */
export class Watermarker extends DurableObject implements WatermarkerRpc {
  /**
   * Starts making this link's copies, or keeps going. Called after the link's email is sent (payment and resend) and by the Download Link page
   * while a copy is preparing. Idempotent: it only sets an alarm when none is pending, so a burst of calls is one wake-up.
   */
  async prepare(downloadLinkId: string): Promise<void> {
    await this.ctx.storage.put(LINK_KEY, downloadLinkId);

    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now());
    }
  }

  /**
   * One copy per wake-up, so no wake-up comes near the alarm's 15-minute limit whatever the Order's size.
   * Every wake-up first arms the next one, before any D1 or R2 call, so a throw, an eviction or a deploy anywhere below
   * still wakes this link again: this code owns retrying, the way `transfer.firstAttemptAt` is saved before Stripe is called.
   */
  override async alarm(): Promise<void> {
    await this.ctx.storage.setAlarm(Date.now() + retryDelayMs(0));

    const downloadLinkId = await this.ctx.storage.get<string>(LINK_KEY);
    const { container } = this.ctx;

    if (downloadLinkId === undefined || container === undefined) {
      if (container === undefined) {
        // The class is bound without its container: a deploy mistake no retry fixes.
        log.error({
          action: "make_download_copy",
          reason: "no_container",
          downloadLinkId,
        });
      }

      await this.ctx.storage.deleteAlarm();

      return;
    }

    const db = createDatabase();

    await createCopies(db, downloadLinkId);

    const job = await nextJob(db, downloadLinkId, new Date());

    if (job === undefined) {
      // Every copy is ready, given up on, or its link expired: nothing left to wake for.
      await this.ctx.storage.deleteAlarm();

      if (container.running) {
        await container.destroy();
      }

      return;
    }

    await this.ctx.storage.setAlarm(Date.now() + retryDelayMs(job.attempts));

    try {
      await startContainer(container);
    } catch (error) {
      // No capacity (maxInstances) or a slow start: not the copy's fault, so not counted. The alarm armed above tries again.
      log.warn({
        action: "make_download_copy",
        reason: "container_not_started",
        downloadLinkId,
        error: error instanceof Error ? error.message : String(error),
      });

      return;
    }

    // Cleared so the Customer's page reads a last attempt as preparing until it ends.
    await db
      .update(downloadCopy)
      .set({ attempts: sql`${downloadCopy.attempts} + 1`, lastError: null })
      .where(unready(job));

    try {
      await makeCopy(container, job);
      await markReady(db, job);

      // The next copy, right away, in the container that is already warm.
      await this.ctx.storage.setAlarm(Date.now());
    } catch (error) {
      const delay = await recordFailure(
        db,
        job,
        error instanceof Error ? error.message : String(error)
      );

      await this.ctx.storage.setAlarm(Date.now() + delay);
    }
  }
}
