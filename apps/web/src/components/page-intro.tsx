import type { ReactNode } from "react";

/** Single-purpose public pages (sign-in, Proposal, messages): a readable column on the store's left edge. */
export const narrowPageClass =
  "mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 *:max-w-xl";

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
