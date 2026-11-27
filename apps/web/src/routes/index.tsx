import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { getActiveEdition } from "@/functions/editions";
import { formatDateTime } from "@/lib/format";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

const Status = ({ live, children }: { live: boolean; children: string }) => (
  <p className="flex items-center gap-2 text-sm font-medium">
    <span
      aria-hidden
      className={`size-2 rounded-full ${live ? "bg-print" : "bg-muted-foreground/50"}`}
    />
    {children}
  </p>
);

/** The landing's opening spread: copy on the left and the whole poster, never cropped, on the right. */
const Hero = ({
  status,
  live = false,
  title,
  children,
}: {
  status: string;
  live?: boolean;
  title: string;
  children: ReactNode;
}) => (
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
);

const Landing = ({ edition }: { edition: ActiveEdition }) => {
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
        <Hero status="Convocatoria abierta" live title={edition.name}>
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
        <Hero status="Próxima Edición" title={edition.name}>
          <p>
            Las propuestas abren el{" "}
            <strong>{formatDateTime(edition.proposalsOpenAt)}</strong>.
          </p>
        </Hero>
      );
    }

    case "preparation": {
      return (
        <Hero status="Ya casi" title={edition.name}>
          <p>
            Las propuestas cerraron y los autores preparan sus cómics. La venta
            abre el <strong>{formatDateTime(edition.salesOpenAt)}</strong>.
          </p>
        </Hero>
      );
    }

    case "sales": {
      return (
        <Hero status="A la venta" live title={edition.name}>
          <p>
            Cómics digitales de autores mexicanos. Esta Edición está a la venta
            hasta el <strong>{formatDateTime(edition.salesCloseAt)}</strong>.
          </p>
          <Link to="/catalogo" className={buttonVariants({ size: "lg" })}>
            Ver el catálogo
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Hero>
      );
    }

    default: {
      return edition.phase satisfies never;
    }
  }
};

const HomePage = () => {
  const edition = Route.useLoaderData();

  return (
    <main>
      <Landing edition={edition} />
    </main>
  );
};

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
