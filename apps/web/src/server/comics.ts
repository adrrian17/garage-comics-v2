import type { Database } from "@garage-comics/db";
import { user as userTable } from "@garage-comics/db/schema/auth";
import { comic, editionComic } from "@garage-comics/db/schema/comics";
import type { ComicSlot, ComicStatus } from "@garage-comics/db/schema/comics";
import { registration } from "@garage-comics/db/schema/editions";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import {
  canApply,
  canPrepareComics,
  comicTransitions,
  contentChanged,
  pageCountError,
  statusAfterEdit,
} from "@/lib/comic";
import type { ComicInput, Decision, UploadKind } from "@/lib/comic";
import { editionPhase } from "@/lib/edition";
import { findActiveEdition } from "@/server/editions";
import {
  comicApprovedEmail,
  comicRejectedEmail,
  sendNotification,
} from "@/server/email";
import { fileUrl, finishUpload, startUpload } from "@/server/storage";

// Long enough to read a page and open its PDF; the next load signs fresh ones.
const FILE_URL_TTL_SECONDS = 60 * 60;

interface Seller {
  id: string;
  role?: string | null;
}

/** The active Edition a person can prepare comics for. Admins are Authors without a Registration. */
const resolveSeller = async (db: Database, user: Seller, now: Date) => {
  const edition = await findActiveEdition(db);

  if (edition === undefined) {
    return { status: "no_edition" as const };
  }

  if (user.role !== "admin") {
    const registered = await db
      .select({ id: registration.id })
      .from(registration)
      .where(
        and(
          eq(registration.editionId, edition.id),
          eq(registration.userId, user.id)
        )
      )
      .get();

    if (registered === undefined) {
      return { status: "not_registered" as const };
    }
  }

  return {
    status: "ok" as const,
    edition,
    phase: editionPhase(edition, now),
  };
};

const resolveWriter = async (db: Database, user: Seller, now: Date) => {
  const seller = await resolveSeller(db, user, now);

  return seller.status === "ok" && !canPrepareComics(seller.phase)
    ? { status: "closed" as const }
    : seller;
};

export const listComics = async (db: Database, user: Seller, now: Date) => {
  const seller = await resolveSeller(db, user, now);

  if (seller.status !== "ok") {
    return seller;
  }

  const comics = await db
    .select()
    .from(editionComic)
    .where(
      and(
        eq(editionComic.editionId, seller.edition.id),
        eq(editionComic.authorId, user.id)
      )
    )
    .orderBy(asc(editionComic.slot));

  const withCovers = await Promise.all(
    comics.map(async (item) => ({
      ...item,
      coverUrl:
        item.coverKey === null
          ? null
          : await fileUrl(item.coverKey, FILE_URL_TTL_SECONDS),
    }))
  );

  return {
    ...seller,
    canEdit: canPrepareComics(seller.phase),
    comics: withCovers,
  };
};

export const addComic = async (
  db: Database,
  user: Seller,
  input: ComicInput & { slot: ComicSlot },
  now: Date
) => {
  const seller = await resolveWriter(db, user, now);

  if (seller.status !== "ok") {
    return seller;
  }

  const { slot, ...content } = input;
  const pageError = pageCountError(slot, content.pageCount);

  if (pageError !== null) {
    return { status: "invalid" as const, message: pageError };
  }

  const comicId = crypto.randomUUID();

  // The unique slot index refuses a second comic in the same slot, so the count rule holds under concurrent requests.
  const [, created] = await db.batch([
    db.insert(comic).values({ id: comicId, authorId: user.id }),
    db
      .insert(editionComic)
      .values({
        ...content,
        editionId: seller.edition.id,
        comicId,
        authorId: user.id,
        slot,
      })
      .onConflictDoNothing()
      .returning({ id: editionComic.id }),
  ]);

  if (created[0] === undefined) {
    await db.delete(comic).where(eq(comic.id, comicId));

    return { status: "slot_taken" as const };
  }

  return { status: "created" as const };
};

/** The comic as it stands in the active Edition, only when it belongs to the person asking. */
const findOwnComic = async (
  db: Database,
  userId: string,
  editionId: string,
  id: string
) =>
  await db
    .select()
    .from(editionComic)
    .where(
      and(
        eq(editionComic.id, id),
        eq(editionComic.authorId, userId),
        eq(editionComic.editionId, editionId)
      )
    )
    .get();

export const saveComic = async (
  db: Database,
  user: Seller,
  input: ComicInput & { id: string; revision: number },
  now: Date
) => {
  const seller = await resolveWriter(db, user, now);

  if (seller.status !== "ok") {
    return seller;
  }

  const { id, revision, ...content } = input;
  const current = await findOwnComic(db, user.id, seller.edition.id, id);

  if (current?.revision !== revision) {
    return { status: "stale" as const };
  }

  const pageError = pageCountError(current.slot, content.pageCount);

  if (pageError !== null) {
    return { status: "invalid" as const, message: pageError };
  }

  if (!contentChanged(current, { ...current, ...content })) {
    return { status: "saved" as const, sentBackToReview: false };
  }

  const status = statusAfterEdit(current.status, true);

  // Matching on the revision makes a save from a stale screen, or one that races a decision, change nothing.
  const [saved] = await db
    .update(editionComic)
    .set({ ...content, status, revision: sql`${editionComic.revision} + 1` })
    .where(
      and(eq(editionComic.id, id), eq(editionComic.revision, current.revision))
    )
    .returning({ id: editionComic.id });

  if (saved === undefined) {
    return { status: "stale" as const };
  }

  return {
    status: "saved" as const,
    sentBackToReview: status !== current.status,
  };
};

export const sendToReview = async (
  db: Database,
  user: Seller,
  input: { id: string; revision: number },
  now: Date
) => {
  const seller = await resolveWriter(db, user, now);

  if (seller.status !== "ok") {
    return seller;
  }

  const current = await findOwnComic(db, user.id, seller.edition.id, input.id);

  if (
    current?.revision !== input.revision ||
    !canApply(current.status, "submit")
  ) {
    return { status: "stale" as const };
  }

  if (current.coverKey === null || current.pdfKey === null) {
    return { status: "incomplete" as const };
  }

  const [submitted] = await db
    .update(editionComic)
    .set({
      status: comicTransitions.submit.to,
      revision: sql`${editionComic.revision} + 1`,
    })
    .where(
      and(
        eq(editionComic.id, input.id),
        eq(editionComic.status, current.status),
        eq(editionComic.revision, current.revision)
      )
    )
    .returning({ id: editionComic.id });

  return submitted === undefined
    ? { status: "stale" as const }
    : { status: "submitted" as const };
};

export const beginUpload = async (
  db: Database,
  user: Seller,
  input: {
    id: string;
    kind: UploadKind;
    contentType: string;
    sizeBytes: number;
  },
  now: Date
) => {
  const seller = await resolveWriter(db, user, now);

  if (seller.status !== "ok") {
    return seller;
  }

  const current = await findOwnComic(db, user.id, seller.edition.id, input.id);

  if (current === undefined) {
    return { status: "stale" as const };
  }

  return await startUpload({ comicId: current.comicId, ...input });
};

export const completeUpload = async (
  db: Database,
  user: Seller,
  input: {
    id: string;
    kind: UploadKind;
    key: string;
    uploadId: string;
    parts: { partNumber: number; etag: string }[];
  },
  now: Date
) => {
  const seller = await resolveWriter(db, user, now);

  if (seller.status !== "ok") {
    return seller;
  }

  const current = await findOwnComic(db, user.id, seller.edition.id, input.id);

  if (current === undefined) {
    return { status: "stale" as const };
  }

  const attachedKey =
    input.kind === "cover" ? current.coverKey : current.pdfKey;

  // A retry after a lost reply finds the file already attached.
  if (attachedKey === input.key) {
    return { status: "attached" as const, sentBackToReview: false };
  }

  const stored = await finishUpload({ comicId: current.comicId, ...input });

  if (stored.status === "invalid") {
    return stored;
  }

  const files =
    input.kind === "cover"
      ? { coverKey: input.key }
      : { pdfKey: input.key, pdfBytes: stored.bytes };

  // A new file is always a content change, so an approved comic goes back to review.
  const status = statusAfterEdit(current.status, true);

  const [attached] = await db
    .update(editionComic)
    .set({ ...files, status, revision: sql`${editionComic.revision} + 1` })
    .where(
      and(
        eq(editionComic.id, input.id),
        eq(editionComic.revision, current.revision)
      )
    )
    .returning({ id: editionComic.id });

  return attached === undefined
    ? { status: "stale" as const }
    : {
        status: "attached" as const,
        sentBackToReview: status !== current.status,
      };
};

export const listComicsToReview = async (
  db: Database,
  status: Exclude<ComicStatus, "draft">,
  now: Date
) => {
  const edition = await findActiveEdition(db);

  if (edition === undefined) {
    return null;
  }

  const rows = await db
    .select({
      comic: editionComic,
      authorName: userTable.name,
      authorEmail: userTable.email,
    })
    .from(editionComic)
    .innerJoin(userTable, eq(userTable.id, editionComic.authorId))
    .where(
      and(
        eq(editionComic.editionId, edition.id),
        eq(editionComic.status, status)
      )
    )
    .orderBy(asc(editionComic.updatedAt));

  const comics = await Promise.all(
    rows.map(async ({ comic: item, authorName, authorEmail }) => ({
      ...item,
      authorName,
      authorEmail,
      coverUrl:
        item.coverKey === null
          ? null
          : await fileUrl(item.coverKey, FILE_URL_TTL_SECONDS),
      pdfUrl:
        item.pdfKey === null
          ? null
          : await fileUrl(item.pdfKey, FILE_URL_TTL_SECONDS),
    }))
  );

  const phase = editionPhase(edition, now);

  return {
    edition: { ...edition, phase },
    canDecide: canPrepareComics(phase),
    comics,
  };
};

export const countComicsInReview = async (db: Database) => {
  const edition = await findActiveEdition(db);

  if (edition === undefined) {
    return 0;
  }

  const [row] = await db
    .select({ total: count() })
    .from(editionComic)
    .where(
      and(
        eq(editionComic.editionId, edition.id),
        eq(editionComic.status, "in_review")
      )
    );

  return row?.total ?? 0;
};

export const decideComic = async (
  db: Database,
  admin: { id: string },
  input: { id: string; revision: number; decision: Decision; reason?: string },
  now: Date
) => {
  const edition = await findActiveEdition(db);

  if (edition === undefined) {
    return { status: "stale" as const };
  }

  // The sales window opening ends Reviews: what is on sale must be what an Admin approved.
  if (!canPrepareComics(editionPhase(edition, now))) {
    return { status: "closed" as const };
  }

  const { from, to } = comicTransitions[input.decision];
  const reason = input.reason ?? "";

  // Matching on the status and revision makes a decision on a comic that changed, or was decided elsewhere, change nothing.
  const [decided] = await db
    .update(editionComic)
    .set({
      status: to,
      rejectionReason: input.decision === "reject" ? reason : null,
      reviewedBy: admin.id,
      reviewedAt: now,
      revision: sql`${editionComic.revision} + 1`,
    })
    .where(
      and(
        eq(editionComic.id, input.id),
        eq(editionComic.editionId, edition.id),
        inArray(editionComic.status, [...from]),
        eq(editionComic.revision, input.revision)
      )
    )
    .returning();

  if (decided === undefined) {
    return { status: "stale" as const };
  }

  const author = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, decided.authorId))
    .get();

  const email = author?.email ?? "";

  const notified = await sendNotification({
    to: email,
    ...(input.decision === "approve"
      ? comicApprovedEmail(decided.title)
      : comicRejectedEmail({ comicTitle: decided.title, reason })),
  });

  return { status: "decided" as const, notified, email };
};
