import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import {
  PageIcon,
  SinglePage,
  pageHeadingClass,
  pageLeadClass,
} from "@/components/page-intro";
import type { getActiveEdition } from "@/functions/editions";
import { formatDateTime } from "@/lib/format";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

/** Why there is nothing to buy right now, and when there will be. */
const closedMessage = (edition: ActiveEdition) => {
  if (edition === null || edition.phase === "closed") {
    return "La venta de esta Edición ya cerró. Vuelve pronto para conocer las fechas de la próxima.";
  }

  if (edition.phase === "sales") {
    return "Todavía no hay cómics a la venta. Vuelve en un rato.";
  }

  return `La venta de ${edition.name} abre el ${formatDateTime(edition.salesOpenAt)}.`;
};

/** The page a sales-only listing shows outside sales, or while nothing is on sale yet. */
export const SalesClosed = ({
  title,
  edition,
}: {
  title: string;
  edition: ActiveEdition;
}) => (
  <SinglePage>
    <PageIcon>
      <CalendarClock />
    </PageIcon>
    <h1 className={pageHeadingClass}>{title}</h1>
    <p className={pageLeadClass}>{closedMessage(edition)}</p>
    <div className="mt-10">
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Volver al inicio
      </Link>
    </div>
  </SinglePage>
);
