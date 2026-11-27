import type { EditionPhase } from "@/lib/edition";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Whole time left until `deadline`, or null once it has passed. */
export const timeLeft = (deadline: Date, now: Date): TimeLeft | null => {
  const total = Math.floor(
    (deadline.getTime() - now.getTime()) / MS_PER_SECOND
  );

  if (total <= 0) {
    return null;
  }

  return {
    days: Math.floor(total / SECONDS_PER_DAY),
    hours: Math.floor((total % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
    minutes: Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: total % SECONDS_PER_MINUTE,
  };
};

export type CountdownWindow = "proposals" | "sales";

/** The window that is closing right now and when it closes: Proposals while they are open, sales while the Edition is on sale. */
export const countdownTarget = (
  edition: {
    phase: EditionPhase;
    proposalsCloseAt: Date;
    salesCloseAt: Date;
  } | null
): { window: CountdownWindow; deadline: Date } | null => {
  if (edition?.phase === "proposals") {
    return { window: "proposals", deadline: edition.proposalsCloseAt };
  }

  if (edition?.phase === "sales") {
    return { window: "sales", deadline: edition.salesCloseAt };
  }

  return null;
};
