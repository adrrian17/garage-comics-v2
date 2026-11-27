import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useSyncExternalStore } from "react";

import type { CountdownWindow, TimeLeft } from "@/lib/countdown";
import { countdownTarget, timeLeft } from "@/lib/countdown";
import type { EditionPhase, EditionWindows } from "@/lib/edition";
import { editionPhase } from "@/lib/edition";
import { formatDateTime } from "@/lib/format";

const TICK_MS = 1000;

const subscribeToClock = (onTick: () => void) => {
  const timer = setInterval(onTick, TICK_MS);

  return () => {
    clearInterval(timer);
  };
};

/** The current second, or null while server rendering and hydrating so the markup matches. */
const useNowSeconds = () =>
  useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / TICK_MS),
    () => null
  );

const copy = {
  proposals: {
    ends: "La convocatoria cierra",
    endsIn: "La convocatoria cierra en",
    action: { to: "/propuesta", label: "Manda tu propuesta" },
  },
  sales: {
    ends: "La venta termina",
    endsIn: "La venta termina en",
    action: { to: "/catalogo", label: "Ver el catálogo" },
  },
} as const satisfies Record<
  CountdownWindow,
  {
    ends: string;
    endsIn: string;
    action: { to: "/propuesta" | "/catalogo"; label: string };
  }
>;

const pad = (value: number) => String(value).padStart(2, "0");

const Unit = ({ value, unit }: { value: string; unit: string }) => (
  <span className="inline-flex items-baseline gap-0.5">
    <span className="font-display text-base font-semibold tabular-nums">
      {value}
    </span>
    <span className="text-background/60 text-xs">{unit}</span>
  </span>
);

const Clock = ({ left }: { left: TimeLeft }) => (
  <span aria-hidden className="inline-flex items-baseline gap-2.5">
    {left.days > 0 ? (
      <Unit value={String(left.days)} unit={left.days === 1 ? "día" : "días"} />
    ) : null}
    <Unit value={pad(left.hours)} unit="h" />
    <Unit value={pad(left.minutes)} unit="min" />
    <Unit value={pad(left.seconds)} unit="s" />
  </span>
);

type CountdownEdition = EditionWindows & { phase: EditionPhase };

const EditionCountdown = ({ edition }: { edition: CountdownEdition }) => {
  const nowSeconds = useNowSeconds();
  const now = nowSeconds === null ? null : new Date(nowSeconds * TICK_MS);

  // The server's phase until hydration, so the markup matches; then the phase follows the clock, so a window that opens or closes while the page is open shows up without a navigation.
  const target = countdownTarget({
    ...edition,
    phase: now === null ? edition.phase : editionPhase(edition, now),
  });

  if (target === null) {
    return null;
  }

  const left = now === null ? null : timeLeft(target.deadline, now);
  const text = copy[target.window];
  const deadline = formatDateTime(target.deadline);

  return (
    <aside
      aria-label="Cuenta regresiva"
      className="bg-foreground text-background"
    >
      <div className="mx-auto flex min-h-10 w-full max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-sm sm:justify-between sm:px-6">
        {left === null ? (
          <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-2">
              <span aria-hidden className="bg-print size-2 rounded-full" />
              {text.ends}
            </span>
            <span className="font-semibold">el {deadline}</span>
          </p>
        ) : (
          <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            {/* The ticking clock is for the eye; a screen reader gets the deadline once, as a sentence. */}
            <span aria-hidden className="flex items-center gap-2">
              <span className="bg-print size-2 rounded-full" />
              {text.endsIn}
            </span>
            <Clock left={left} />
            <span className="sr-only">
              {text.ends} el {deadline}
            </span>
          </p>
        )}
        <Link
          to={text.action.to}
          className="hover:text-print focus-visible:ring-print/60 inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-3 max-sm:hidden"
        >
          {text.action.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </aside>
  );
};

/** Counts down, on every public page, to the close of whichever window is open: Proposals or sales. */
export const CountdownBar = ({
  edition,
}: {
  edition: CountdownEdition | null;
}) => {
  // A closed Edition has no window left to open, so there is no clock to keep.
  if (edition === null || edition.phase === "closed") {
    return null;
  }

  return <EditionCountdown edition={edition} />;
};
