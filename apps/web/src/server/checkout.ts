import type { Database } from "@garage-comics/db";
import { edition } from "@garage-comics/db/schema/editions";
import { order, orderItem } from "@garage-comics/db/schema/orders";
import { env } from "cloudflare:workers";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import type { Stripe } from "stripe";

import { droppedIds } from "@/lib/cart";
import { checkoutSessionParams } from "@/lib/checkout";
import { commissionCentavos } from "@/lib/commission";
import { pesosToCentavos } from "@/lib/money";
import { sellableComics } from "@/server/catalog";
import { priceFor } from "@/server/stripe-lines";

type CheckoutStripe = Pick<Stripe, "checkout" | "products" | "prices">;

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "closed" }
  | { status: "changed"; dropped: string[] };

// The sales window is checked again inside the insert, on the database clock: Stripe calls can outlast the cutoff that `sellableComics` saw.
const databaseNowMs = sql`cast(unixepoch('subsecond') * 1000 as integer)`;

/**
 * Opens a Stripe Checkout Session for the comics the Customer chose and records the pending Order that goes with it.
 * Prices, titles and Commissions come from the database; the Customer only chooses ids.
 */
export const createOrderCheckout = async (
  db: Database,
  stripe: CheckoutStripe,
  input: { ids: string[]; email: string },
  now: Date
): Promise<CheckoutResult> => {
  const sellable = await sellableComics(db, now, { ids: input.ids });

  if (sellable.status === "closed") {
    return sellable;
  }

  const dropped = droppedIds(input.ids, sellable.comics);

  if (dropped.length > 0) {
    return { status: "changed", dropped };
  }

  const orderId = crypto.randomUUID();

  const priceIds = await Promise.all(
    sellable.comics.map(
      async (comic) =>
        await priceFor(stripe, comic.title, pesosToCentavos(comic.priceMxn))
    )
  );

  const session = await stripe.checkout.sessions.create(
    checkoutSessionParams({
      orderId,
      email: input.email,
      priceIds,
      origin: env.BETTER_AUTH_URL,
      // Read after the Price requests, so their time does not eat into Stripe's 30-minute minimum.
      now: new Date(),
    })
  );

  if (session.url === null) {
    throw new Error("Stripe no devolvió la dirección del pago.");
  }

  // One transaction. Items go in only if the Order did, so a closed window leaves nothing behind.
  const [inserted] = await db.batch([
    db
      .insert(order)
      .select(
        db
          .select({
            id: sql<string>`${orderId}`.as("id"),
            editionId: sql<string>`${sellable.edition.id}`.as("edition_id"),
            customerEmail: sql<string>`${input.email}`.as("customer_email"),
            stripeCheckoutSessionId: sql<string>`${session.id}`.as(
              "stripe_checkout_session_id"
            ),
          })
          .from(edition)
          .where(
            and(
              eq(edition.id, sellable.edition.id),
              eq(edition.isActive, true),
              lte(edition.salesOpenAt, databaseNowMs),
              gt(edition.salesCloseAt, databaseNowMs)
            )
          )
      )
      .returning({ id: order.id }),
    ...sellable.comics.map((comic) => {
      const priceCentavos = pesosToCentavos(comic.priceMxn);

      return db.insert(orderItem).select(
        db
          .select({
            id: sql<string>`${crypto.randomUUID()}`.as("id"),
            orderId: sql<string>`${orderId}`.as("order_id"),
            editionComicId: sql<string>`${comic.id}`.as("edition_comic_id"),
            title: sql<string>`${comic.title}`.as("title"),
            priceCentavos: sql<number>`${priceCentavos}`.as("price_centavos"),
            commissionCentavos:
              sql<number>`${commissionCentavos(priceCentavos)}`.as(
                "commission_centavos"
              ),
          })
          .from(order)
          .where(eq(order.id, orderId))
      );
    }),
  ]);

  // The session URL is never returned in this case, so it cannot be paid; its `expired` event finds no Order.
  if (inserted.length === 0) {
    return { status: "closed" };
  }

  return { status: "redirect", url: session.url };
};
