import type { Stripe } from "stripe";
import { describe, expect, it } from "vite-plus/test";

import {
  canReuseIdempotencyKey,
  reconcileTransfer,
  transferIdempotencyKey,
  transferParams,
} from "./transfers";

const HOUR_MS = 60 * 60 * 1000;

const now = new Date("2027-02-03T18:00:00.000Z");

const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR_MS);

describe(transferParams, () => {
  const params = transferParams(
    {
      orderId: "order-1",
      orderItemId: "item-1",
      priceCentavos: 9000,
      commissionCentavos: 900,
    },
    { destination: "acct_author", chargeId: "ch_1" }
  );

  it("sends the Author the price minus the Commission", () => {
    expect(params.amount).toBe(8100);
    expect(params.currency).toBe("mxn");
  });

  it("goes to the Author's account and draws on the Order's charge", () => {
    expect(params.destination).toBe("acct_author");
    expect(params.source_transaction).toBe("ch_1");
  });

  it("is grouped with the Order and tagged with the comic it pays for", () => {
    expect(params.transfer_group).toBe("order-1");
    expect(params.metadata).toStrictEqual({
      orderId: "order-1",
      orderItemId: "item-1",
    });
  });

  it("uses the snapshotted Commission, whatever the rate is today", () => {
    const other = transferParams(
      {
        orderId: "order-1",
        orderItemId: "item-2",
        priceCentavos: 10_000,
        commissionCentavos: 2500,
      },
      { destination: "acct_author", chargeId: "ch_1" }
    );

    expect(other.amount).toBe(7500);
  });
});

describe(transferIdempotencyKey, () => {
  it("is the same for every retry of one comic sold and differs between comics", () => {
    expect(transferIdempotencyKey("item-1", 0)).toBe("transfer-item-1-0");
    expect(transferIdempotencyKey("item-1", 0)).not.toBe(
      transferIdempotencyKey("item-2", 0)
    );
  });

  it("moves on after Stripe rejects the Transfer outright", () => {
    expect(transferIdempotencyKey("item-1", 1)).not.toBe(
      transferIdempotencyKey("item-1", 0)
    );
  });
});

describe(canReuseIdempotencyKey, () => {
  it("reuses the key before any attempt was made", () => {
    expect(canReuseIdempotencyKey(null, now)).toBeTruthy();
  });

  it("reuses the key within 23 hours of the first attempt", () => {
    expect(canReuseIdempotencyKey(hoursAgo(1), now)).toBeTruthy();
    expect(canReuseIdempotencyKey(hoursAgo(22.99), now)).toBeTruthy();
  });

  it("stops trusting the key from 23 hours on, before Stripe forgets it at 24", () => {
    expect(canReuseIdempotencyKey(hoursAgo(23), now)).toBeFalsy();
    expect(canReuseIdempotencyKey(hoursAgo(24), now)).toBeFalsy();
    expect(canReuseIdempotencyKey(hoursAgo(72), now)).toBeFalsy();
  });
});

describe(reconcileTransfer, () => {
  const transfers: Pick<Stripe.Transfer, "id" | "metadata">[] = [
    { id: "tr_other", metadata: { orderItemId: "item-2" } },
    { id: "tr_none", metadata: {} },
    { id: "tr_mine", metadata: { orderItemId: "item-1" } },
  ];

  it("finds the Transfer tagged with the comic sold", () => {
    expect(reconcileTransfer(transfers, "item-1")?.id).toBe("tr_mine");
  });

  it("finds nothing when no Transfer is tagged with it", () => {
    expect(reconcileTransfer(transfers, "item-3")).toBeUndefined();
    expect(reconcileTransfer([], "item-1")).toBeUndefined();
  });

  it("does not match a different id that merely starts the same", () => {
    expect(
      reconcileTransfer(
        [{ id: "tr_x", metadata: { orderItemId: "item-10" } }],
        "item-1"
      )
    ).toBeUndefined();
  });
});
