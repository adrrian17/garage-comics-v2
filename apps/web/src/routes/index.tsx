import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { ComicGrid } from "@/components/comic-grid";
import { SectionRule } from "@/components/page-intro";
import { getCatalog } from "@/functions/catalog";
import { getActiveEdition } from "@/functions/editions";
import { formatDate, formatDateTime } from "@/lib/format";
import type { SellableComic } from "@/server/catalog";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

type OpenEdition = NonNullable<ActiveEdition>;

type Catalog = Awaited<ReturnType<typeof getCatalog>>;

type EditionWindow = "proposals" | "sales";

const Status = ({ live, children }: { live: boolean; children: string }) => (
  <p className="flex items-center gap-2 text-sm font-medium">
    <span
      aria-hidden
      className={`size-2 rounded-full ${live ? "bg-print" : "bg-muted-foreground/50"}`}
    />
    {children}
  </p>
);

interface Fact {
  label: string;
  value: string;
  current?: boolean;
}

/** Two facts about the Edition as a print-red band under the hero, hanging a scalloped edge like the poster's awning. */
const FactBand = ({ facts }: { facts: [Fact, Fact] }) => (
  <div className="text-print">
    <div className="bg-print text-print-foreground">
      <dl className="mx-auto grid w-full max-w-6xl gap-x-16 gap-y-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-2">
            <dt className="text-print-foreground/80 flex items-center gap-2 text-sm">
              {fact.label}
              {fact.current === true ? (
                <span className="bg-print-foreground text-print rounded-full px-2 py-0.5 text-xs font-semibold">
                  Ahora
                </span>
              ) : null}
            </dt>
            <dd className="font-display max-w-sm text-2xl leading-tight font-semibold tracking-tight text-balance lg:text-3xl">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
    <div aria-hidden className="scallop-edge" />
  </div>
);

const dateRange = (from: Date, to: Date) =>
  `${formatDate(from)} al ${formatDate(to)}`;

const EditionDates = ({
  edition,
  current,
}: {
  edition: OpenEdition;
  current?: EditionWindow;
}) => (
  <FactBand
    facts={[
      {
        label: "Propuestas",
        value: dateRange(edition.proposalsOpenAt, edition.proposalsCloseAt),
        current: current === "proposals",
      },
      {
        label: "Venta",
        value: dateRange(edition.salesOpenAt, edition.salesCloseAt),
        current: current === "sales",
      },
    ]}
  />
);

const countLabel = (count: number, one: string, many: string) =>
  count === 1 ? `1 ${one}` : `${count} ${many}`;

/** The landing's opening spread: copy on the left and the whole poster, never cropped, on the right. */
const Hero = ({
  status,
  live = false,
  title,
  children,
  dates,
}: {
  status: string;
  live?: boolean;
  title: string;
  children: ReactNode;
  dates?: ReactNode;
}) => (
  <>
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-14 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-16 lg:pb-20">
      <div className="flex flex-col gap-10">
        <Status live={live}>{status}</Status>
        <h1 className="font-display text-hero font-semibold text-balance">
          {title}
        </h1>
        <div className="text-muted-foreground [&_strong]:text-foreground flex max-w-lg flex-col items-start gap-10 text-lg leading-relaxed text-pretty sm:text-xl [&_strong]:font-semibold">
          {children}
        </div>
      </div>
      <img
        src="/poster.webp"
        alt="Póster de Garage Cómics: un puesto de cómics en la calle, atendido por criaturas fantásticas y rodeado de lectores"
        width={791}
        height={1222}
        fetchPriority="high"
        className="shadow-foreground/15 lg:max-h-poster h-auto w-full rounded-4xl shadow-2xl lg:w-auto lg:justify-self-end"
      />
    </section>
    {dates}
  </>
);

// One row of the catalog grid on wide screens.
const PREVIEW_COUNT = 4;

/** A first look at the catalog; the whole of it lives on /catalogo. */
const CataloguePreview = ({ comics }: { comics: SellableComic[] }) => (
  <section
    aria-labelledby="catalogo-titulo"
    className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6 lg:pt-28"
  >
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <h2
        id="catalogo-titulo"
        className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"
      >
        Catálogo
      </h2>
      {comics.length > PREVIEW_COUNT ? (
        <Link to="/catalogo" className={buttonVariants({ variant: "outline" })}>
          Ver los {comics.length} cómics
          <ArrowRight data-icon="inline-end" />
        </Link>
      ) : null}
    </div>
    <SectionRule />
    {comics.length > 0 ? (
      <div className="mt-10">
        <ComicGrid comics={comics.slice(0, PREVIEW_COUNT)} />
      </div>
    ) : (
      <p className="text-muted-foreground mt-8 text-lg">
        Todavía no hay cómics a la venta. Vuelve en un rato.
      </p>
    )}
  </section>
);

const Landing = ({
  edition,
  catalog,
}: {
  edition: ActiveEdition;
  catalog: Catalog | null;
}) => {
  if (edition === null || edition.phase === "closed") {
    return (
      <Hero status="Entre ediciones" title="La próxima Edición viene en camino">
        <p>
          Cómics digitales de autores mexicanos, a la venta por tiempo limitado.
          Vuelve pronto para conocer las fechas.
        </p>
      </Hero>
    );
  }

  switch (edition.phase) {
    case "proposals": {
      return (
        <Hero
          status="Convocatoria abierta"
          live
          title={edition.name}
          dates={<EditionDates edition={edition} current="proposals" />}
        >
          <p>
            ¿Haces cómics? Manda tu propuesta para vender tu trabajo en esta
            Edición. Mandarla no cuesta nada y recibimos propuestas hasta el{" "}
            <strong>{formatDateTime(edition.proposalsCloseAt)}</strong>.
          </p>
          <Link to="/propuesta" className={buttonVariants({ size: "lg" })}>
            Manda tu propuesta
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Hero>
      );
    }

    case "upcoming": {
      return (
        <Hero
          status="Próxima Edición"
          title={edition.name}
          dates={<EditionDates edition={edition} />}
        >
          <p>
            Las propuestas abren el{" "}
            <strong>{formatDateTime(edition.proposalsOpenAt)}</strong>.
          </p>
        </Hero>
      );
    }

    case "preparation": {
      return (
        <Hero
          status="Ya casi"
          title={edition.name}
          dates={<EditionDates edition={edition} />}
        >
          <p>
            Las propuestas cerraron y los autores preparan sus cómics. La venta
            abre el <strong>{formatDateTime(edition.salesOpenAt)}</strong>.
          </p>
        </Hero>
      );
    }

    case "sales": {
      const comics = catalog?.status === "open" ? catalog.comics : [];

      const authorCount = new Set(comics.map((comic) => comic.author.slug))
        .size;

      return (
        <>
          <Hero
            status="A la venta"
            live
            title={edition.name}
            dates={
              <FactBand
                facts={[
                  {
                    label: "Venta",
                    value: dateRange(edition.salesOpenAt, edition.salesCloseAt),
                    current: true,
                  },
                  {
                    label: "En el catálogo",
                    value: `${countLabel(comics.length, "cómic", "cómics")} de ${countLabel(authorCount, "autor", "autores")}`,
                  },
                ]}
              />
            }
          >
            <p>
              Cómics digitales de autores mexicanos. Esta Edición está a la
              venta hasta el{" "}
              <strong>{formatDateTime(edition.salesCloseAt)}</strong>.
            </p>
            <Link to="/catalogo" className={buttonVariants({ size: "lg" })}>
              Ver el catálogo
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Hero>
          <CataloguePreview comics={comics} />
        </>
      );
    }

    default: {
      return edition.phase satisfies never;
    }
  }
};

const HomePage = () => {
  const { edition, catalog } = Route.useLoaderData();

  return (
    <main className="pb-20 lg:pb-28">
      <Landing edition={edition} catalog={catalog} />
    </main>
  );
};

export const Route = createFileRoute("/")({
  loader: async () => {
    const edition = await getActiveEdition();

    const catalog = edition?.phase === "sales" ? await getCatalog() : null;

    return { edition, catalog };
  },
  head: () => ({
    meta: [
      { title: "Garage Cómics · Cómics digitales de autores mexicanos" },
      {
        name: "description",
        content:
          "Garage Cómics vende cómics digitales de autores mexicanos por tiempo limitado, una Edición a la vez. Consulta las fechas de la próxima Edición o manda tu propuesta.",
      },
    ],
  }),
  component: HomePage,
});
