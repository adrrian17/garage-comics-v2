import type { ReactNode } from "react";

/**
 * Single-purpose public pages (sign-in, messages, Download Link): a readable column on the store's left edge,
 * with the poster pinned beside it on wide screens.
 */
export const SinglePage = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto grid w-full max-w-6xl items-start gap-16 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,36rem)_1fr]">
    <div>{children}</div>
    <img
      src="/poster.webp"
      alt=""
      width={791}
      height={1222}
      loading="lazy"
      className="shadow-foreground/15 hidden w-72 rotate-2 justify-self-end rounded-3xl shadow-2xl lg:block xl:w-80"
    />
  </main>
);

export const pageHeadingClass =
  "font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl";

export const pageLeadClass =
  "text-muted-foreground mt-4 text-lg leading-relaxed text-pretty";

/** A soft tile that carries a page's icon in the print red. */
export const PageIcon = ({ children }: { children: ReactNode }) => (
  <div
    aria-hidden
    className="bg-paper-deep text-print mb-8 grid size-14 place-items-center rounded-2xl [&_svg]:size-6"
  >
    {children}
  </div>
);

/** The wavy ink rule that closes a section title. */
export const SectionRule = () => (
  <div aria-hidden className="rule-wave text-foreground mt-4 w-full" />
);
