import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { ComicGrid } from "@/components/comic-grid";
import { getCatalog } from "@/functions/catalog";
import { getActiveEdition } from "@/functions/editions";
import { formatDate, formatDateTime } from "@/lib/format";

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

const DateRange = ({
  label,
  from,
  to,
  current,
}: {
  label: string;
  from: Date;
  to: Date;
  current: boolean;
}) => (
  <div className="lg:first:pl-column-edge flex flex-col gap-2 px-4 py-7 sm:px-6 lg:first:pr-14 lg:last:px-14">
    <dt className="text-muted-foreground flex items-center gap-2 text-sm">
      {label}
      {current ? (
        <span className="bg-print text-print-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
          Ahora
        </span>
      ) : null}
    </dt>
    <dd className="font-display max-w-xs text-2xl leading-tight font-semibold tracking-tight text-balance">
      {formatDate(from)} al {formatDate(to)}
    </dd>
  </div>
);

/** The Edition's two windows as a ruled strip under the hero, on the hero's own columns so the rules line up. */
const EditionDates = ({
  edition,
  current,
}: {
  edition: OpenEdition;
  current?: EditionWindow;
}) => (
  <dl className="grid max-lg:divide-y lg:grid-cols-2 lg:divide-x">
    <DateRange
      label="Propuestas"
      from={edition.proposalsOpenAt}
      to={edition.proposalsCloseAt}
      current={current === "proposals"}
    />
    <DateRange
      label="Venta"
      from={edition.salesOpenAt}
      to={edition.salesCloseAt}
      current={current === "sales"}
    />
  </dl>
);

/**
 * The landing's opening spread: copy on the left, the poster bleeding off the right edge like a splash page.
 * `poster-scene.webp` is the newsstand scene cut out of `poster.webp`, whose top and bottom boxes are placeholders.
 */
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
    <section className="border-b">
      <div className="lg:min-h-hero grid lg:grid-cols-2">
        <div className="lg:pl-column-edge flex flex-col justify-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:py-16 lg:pr-14">
          <Status live={live}>{status}</Status>
          <h1 className="font-display text-hero font-semibold text-balance">
            {title}
          </h1>
          <div className="text-muted-foreground [&_strong]:text-foreground flex max-w-lg flex-col items-start gap-10 text-lg leading-relaxed text-pretty sm:text-xl [&_strong]:font-semibold">
            {children}
          </div>
        </div>
        <div className="bg-poster relative overflow-hidden max-lg:aspect-5/4 max-lg:border-t lg:border-l">
          <img
            src="/poster-scene.webp"
            alt="Ilustración de un puesto de cómics en la calle, atendido por criaturas fantásticas y rodeado de lectores"
            width={791}
            height={740}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </div>
    </section>
    {dates === undefined ? null : <div className="border-b">{dates}</div>}
  </>
);

const Catalogue = ({
  edition,
  catalog,
}: {
  edition: OpenEdition;
  catalog: Catalog | null;
}) => {
  const comics = catalog?.status === "open" ? catalog.comics : [];
  const authorCount = new Set(comics.map((comic) => comic.author.slug)).size;

  return (
    <section
      id="catalogo"
      aria-labelledby="catalogo-titulo"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b pb-6">
        <h2
          id="catalogo-titulo"
          className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          Catálogo
        </h2>
        {comics.length === 0 ? null : (
          <p className="text-muted-foreground text-sm">
            {comics.length === 1 ? "1 cómic" : `${comics.length} cómics`} de{" "}
            {authorCount === 1 ? "1 autor" : `${authorCount} autores`} · a la
            venta hasta el {formatDate(edition.salesCloseAt)}
          </p>
        )}
      </div>
      {comics.length > 0 ? (
        <div className="mt-10">
          <ComicGrid comics={comics} />
        </div>
      ) : (
        <p className="text-muted-foreground mt-8 text-lg">
          Todavía no hay cómics a la venta. Vuelve en un rato.
        </p>
      )}
    </section>
  );
};

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
      return (
        <>
          <Hero status="A la venta" live title={edition.name}>
            <p>
              Cómics digitales de autores mexicanos. Esta Edición está a la
              venta hasta el{" "}
              <strong>{formatDateTime(edition.salesCloseAt)}</strong>.
            </p>
            <a href="#catalogo" className={buttonVariants({ size: "lg" })}>
              Ver el catálogo
              <ArrowDown data-icon="inline-end" />
            </a>
          </Hero>
          <Catalogue edition={edition} catalog={catalog} />
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
    <main>
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
