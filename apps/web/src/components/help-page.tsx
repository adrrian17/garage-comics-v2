import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import type { ReactNode } from "react";

import {
  SectionRule,
  pageHeadingClass,
  pageLeadClass,
} from "@/components/page-intro";

const CONTACT_EMAIL = "hola@garagecomics.mx";

export const inlineLinkClass =
  "text-foreground decoration-print font-semibold underline decoration-2 underline-offset-4";

export const ContactEmail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className={inlineLinkClass}>
    {CONTACT_EMAIL}
  </a>
);

export const HelpSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section>
    <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
      {title}
    </h2>
    <SectionRule />
    <div className="mt-4">{children}</div>
  </section>
);

/**
 * The FAQ and the rules: a long reading column with a sticky aside that points to contact and the sibling page.
 */
export const HelpPage = ({
  eyebrow,
  title,
  lead,
  sibling,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  sibling: { to: "/faqs" | "/reglas"; label: string };
  action?: ReactNode;
  children: ReactNode;
}) => (
  <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:pb-28">
    <header className="max-w-3xl">
      <p className="text-muted-foreground mb-4 font-medium">{eyebrow}</p>
      <h1 className={pageHeadingClass}>{title}</h1>
      <p className={pageLeadClass}>{lead}</p>
    </header>
    <div className="mt-14 grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
      <div className="flex max-w-3xl flex-col gap-16">{children}</div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
        <div className="panel p-6">
          <div
            aria-hidden
            className="bg-paper-deep text-print mb-5 grid size-11 place-items-center rounded-xl [&_svg]:size-5"
          >
            <Mail />
          </div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            ¿Te quedó alguna duda?
          </h2>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Escríbenos a <ContactEmail /> y te ayudamos.
          </p>
        </div>
        <Link
          to={sibling.to}
          className="panel hover:border-foreground/30 focus-visible:ring-ring/50 group flex items-center justify-between gap-4 p-6 font-medium transition-colors outline-none focus-visible:ring-3"
        >
          {sibling.label}
          <ArrowRight
            aria-hidden
            className="text-print size-5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
        {action}
      </aside>
    </div>
  </main>
);

/** The call to send a Proposal, shown only while the call for Proposals is open. */
export const ProposalAction = () => (
  <Link to="/propuesta" className={buttonVariants({ size: "lg" })}>
    Manda tu propuesta
    <ArrowRight data-icon="inline-end" />
  </Link>
);
