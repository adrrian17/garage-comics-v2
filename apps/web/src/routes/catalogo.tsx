import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import { ComicGrid } from "@/components/comic-grid";
import {
  PageIcon,
  SectionRule,
  SinglePage,
  pageHeadingClass,
  pageLeadClass,
} from "@/components/page-intro";
import { getCatalog } from "@/functions/catalog";
import { getActiveEdition } from "@/functions/editions";
import { formatDate, formatDateTime } from "@/lib/format";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

const countLabel = (count: number, one: string, many: string) =>
  count === 1 ? `1 ${one}` : `${count} ${many}`;

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

const CatalogPage = () => {
  const { edition, catalog } = Route.useLoaderData();

  if (catalog.status === "closed" || catalog.comics.length === 0) {
    return (
      <SinglePage>
        <PageIcon>
          <CalendarClock />
        </PageIcon>
        <h1 className={pageHeadingClass}>El catálogo no está abierto</h1>
        <p className={pageLeadClass}>{closedMessage(edition)}</p>
        <div className="mt-10">
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Volver al inicio
          </Link>
        </div>
      </SinglePage>
    );
  }

  const { comics } = catalog;
  const authorCount = new Set(comics.map((comic) => comic.author.slug)).size;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:pb-28">
      <p className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
        <span aria-hidden className="bg-print size-2 rounded-full" />
        {catalog.edition.name}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h1 className={pageHeadingClass}>Catálogo</h1>
        <p className="text-muted-foreground">
          {countLabel(comics.length, "cómic", "cómics")} de{" "}
          {countLabel(authorCount, "autor", "autores")}
          {edition === null
            ? null
            : ` · a la venta hasta el ${formatDate(edition.salesCloseAt)}`}
        </p>
      </div>
      <SectionRule />
      <div className="mt-10">
        <ComicGrid comics={comics} />
      </div>
    </main>
  );
};

export const Route = createFileRoute("/catalogo")({
  loader: async () => {
    const [edition, catalog] = await Promise.all([
      getActiveEdition(),
      getCatalog(),
    ]);

    return { edition, catalog };
  },
  head: () => ({
    meta: [
      { title: "Catálogo · Garage Cómics" },
      {
        name: "description",
        content:
          "Todos los cómics digitales de autores mexicanos a la venta en la Edición abierta de Garage Cómics.",
      },
    ],
  }),
  component: CatalogPage,
});
