import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { SquarePen } from "lucide-react";
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
  <section className="grid items-center gap-12 lg:grid-cols-2">
    <div className="flex flex-col gap-6">
      <img
        src="/logo.png"
        alt="Garage Cómics"
        width={129}
        height={78}
        className="h-[78px] w-auto self-start"
      />
      <p className="text-muted-foreground text-sm font-medium">{kicker}</p>
      <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      <div className="text-muted-foreground flex max-w-prose flex-col gap-6 text-base">
        {children}
      </div>
    </div>
    <img
      src="/poster.webp"
      alt="Ilustración de un puesto de cómics en la calle, atendido por criaturas fantásticas y rodeado de lectores"
      width={791}
      height={1222}
      fetchPriority="high"
      className="mx-auto h-auto w-full max-w-md rounded-3xl shadow-xl lg:mr-0 lg:ml-auto"
    />
  </section>
);

const EditionDates = ({ edition }: { edition: NonNullable<ActiveEdition> }) => (
  <dl className="grid gap-4 sm:grid-cols-2">
    <div className="rounded-xl border p-4">
      <dt className="text-muted-foreground text-sm">Propuestas</dt>
      <dd className="text-foreground text-base font-semibold">
        {formatDate(edition.proposalsOpenAt)} al{" "}
        {formatDate(edition.proposalsCloseAt)}
      </dd>
    </div>
    <div className="rounded-xl border p-4">
      <dt className="text-muted-foreground text-sm">Venta</dt>
      <dd className="text-foreground text-base font-semibold">
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
            <strong className="text-foreground">
              {formatDateTime(edition.proposalsCloseAt)}
            </strong>
            .
          </p>
          <Link
            to="/propuesta"
            className={buttonVariants({ className: "w-fit" })}
          >
            <SquarePen data-icon="inline-start" />
            Manda tu propuesta
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
            <strong className="text-foreground">
              {formatDateTime(edition.proposalsOpenAt)}
            </strong>
            .
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
            abre el{" "}
            <strong className="text-foreground">
              {formatDateTime(edition.salesOpenAt)}
            </strong>
            .
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
            el{" "}
            <strong className="text-foreground">
              {formatDateTime(edition.salesCloseAt)}
            </strong>
            .
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
  <main className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-20">
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
