import type { Database } from "@garage-comics/db";
import { comic, editionComic } from "@garage-comics/db/schema/comics";
import type { ComicSlot } from "@garage-comics/db/schema/comics";
import { registration } from "@garage-comics/db/schema/editions";
import { and, asc, eq, sql } from "drizzle-orm";

import {
  canApply,
  canPrepareComics,
  comicTransitions,
  contentChanged,
  pageCountError,
  statusAfterEdit,
} from "@/lib/comic";
import type { ComicInput } from "@/lib/comic";
import { editionPhase } from "@/lib/edition";
import { findActiveEdition } from "@/server/editions";

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

  return { ...seller, canEdit: canPrepareComics(seller.phase), comics };
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
