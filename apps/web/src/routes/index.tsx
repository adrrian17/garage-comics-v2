import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { getActiveEdition } from "@/functions/editions";
import { formatDate, formatDateTime } from "@/lib/format";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

const Hero = ({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) => (
  <section className="panel bg-card relative overflow-hidden px-5 py-10 sm:px-10 sm:py-16">
    {/* Decorative only, faded away from the text so it never sits behind copy. */}
    <div
      aria-hidden
      className="halftone pointer-events-none absolute inset-y-0 right-0 hidden w-1/4 [mask-image:linear-gradient(to_left,black,transparent)] md:block"
    />
    <div className="relative">
      <p className="text-primary text-sm font-bold tracking-widest uppercase">
        {kicker}
      </p>
      <h1 className="mt-3 text-4xl leading-none font-extrabold tracking-tight text-balance sm:text-6xl">
        {title}
      </h1>
      <div className="mt-6 flex max-w-prose flex-col gap-4 text-lg">
        {children}
      </div>
    </div>
  </section>
);

const EditionDates = ({ edition }: { edition: NonNullable<ActiveEdition> }) => (
  <dl className="grid gap-4 sm:grid-cols-2">
    <div className="panel bg-background p-4">
      <dt className="text-muted-foreground text-sm">Propuestas</dt>
      <dd className="font-heading text-xl font-bold">
        {formatDate(edition.proposalsOpenAt)} al{" "}
        {formatDate(edition.proposalsCloseAt)}
      </dd>
    </div>
    <div className="panel bg-background p-4">
      <dt className="text-muted-foreground text-sm">Venta</dt>
      <dd className="font-heading text-xl font-bold">
        {formatDate(edition.salesOpenAt)} al {formatDate(edition.salesCloseAt)}
      </dd>
    </div>
  </dl>
);

const Landing = ({ edition }: { edition: ActiveEdition }) => {
  if (edition === null || edition.phase === "closed") {
    return (
      <Hero kicker="Garage Cómics" title="La próxima Edición viene en camino">
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
        <Hero kicker="Convocatoria abierta" title={edition.name}>
          <p>
            ¿Haces cómics? Manda tu propuesta para vender tu trabajo en esta
            Edición. Mandarla no cuesta nada y recibimos propuestas hasta el{" "}
            <strong>{formatDateTime(edition.proposalsCloseAt)}</strong>.
          </p>
          <Link
            to="/propuesta"
            className={buttonVariants({ size: "lg", className: "w-fit" })}
          >
            Manda tu propuesta
            <ArrowRight data-icon="inline-end" />
          </Link>
          <EditionDates edition={edition} />
        </Hero>
      );
    }

    case "upcoming": {
      return (
        <Hero kicker="Próxima Edición" title={edition.name}>
          <p>
            Las propuestas abren el{" "}
            <strong>{formatDateTime(edition.proposalsOpenAt)}</strong>.
          </p>
          <EditionDates edition={edition} />
        </Hero>
      );
    }

    case "preparation": {
      return (
        <Hero kicker="Ya casi" title={edition.name}>
          <p>
            Las propuestas cerraron y los autores preparan sus cómics. La venta
            abre el <strong>{formatDateTime(edition.salesOpenAt)}</strong>.
          </p>
          <EditionDates edition={edition} />
        </Hero>
      );
    }

    case "sales": {
      return (
        <Hero kicker="A la venta" title={edition.name}>
          <p>
            Aquí vas a encontrar el catálogo de esta Edición, a la venta hasta
            el <strong>{formatDateTime(edition.salesCloseAt)}</strong>.
          </p>
        </Hero>
      );
    }

    default: {
      return edition.phase satisfies never;
    }
  }
};

const HomePage = () => (
  <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-14">
    <Landing edition={Route.useLoaderData()} />
  </main>
);

export const Route = createFileRoute("/")({
  loader: async () => await getActiveEdition(),
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
