import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@garage-comics/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@garage-comics/ui/components/input-group";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarClock, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

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
import { catalogGenres, filterCatalog } from "@/lib/catalog-filter";
import { formatDateTime } from "@/lib/format";
import type { SellableComic } from "@/server/catalog";

type ActiveEdition = Awaited<ReturnType<typeof getActiveEdition>>;

const CATALOG_STALE_MS = 30_000;

const SEARCH_URL_DELAY_MS = 300;

// The menu's value for "no genre filter"; no genre is named with an empty string.
const ALL_GENRES = "";

// A malformed value in a shared link drops that filter instead of failing the page.
const catalogSearch = z.object({
  buscar: z.string().optional().catch(undefined),
  genero: z.string().optional().catch(undefined),
});

type CatalogSearch = z.infer<typeof catalogSearch>;

// With a single genre on sale the menu would filter nothing.
const MIN_GENRES_TO_FILTER = 2;

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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:pb-28">
      <p className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
        <span aria-hidden className="bg-print size-2 rounded-full" />
        {catalog.edition.name}
      </p>
      <h1 className={pageHeadingClass}>Catálogo</h1>
      <SectionRule />
      <FilteredCatalog comics={catalog.comics} />
    </main>
  );
};

const FilteredCatalog = ({ comics }: { comics: SellableComic[] }) => {
  const { buscar = "", genero } = Route.useSearch();
  const navigate = Route.useNavigate();
  const genres = catalogGenres(comics);

  // A genre from an old link may no longer be on sale; then the filter is off.
  const genre =
    genero !== undefined && genres.includes(genero) ? genero : undefined;

  // The box filters as you type; the URL follows once typing pauses, since every navigation re-checks the session.
  const [search, setSearch] = useState(buscar);
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(
    () => () => {
      if (urlTimer.current !== null) {
        clearTimeout(urlTimer.current);
      }
    },
    []
  );

  const results = filterCatalog(comics, { search, genre });

  // Clearing a filter passes null; empty filters stay out of the URL.
  const update = (next: { buscar?: string | null; genero?: string | null }) => {
    void navigate({
      search: (previous) => {
        const merged = { ...previous, ...next };
        const params: CatalogSearch = {};

        if (
          merged.buscar !== undefined &&
          merged.buscar !== null &&
          merged.buscar !== ""
        ) {
          params.buscar = merged.buscar;
        }

        if (
          merged.genero !== undefined &&
          merged.genero !== null &&
          merged.genero !== ""
        ) {
          params.genero = merged.genero;
        }

        return params;
      },
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <InputGroup className="min-w-60 flex-1 sm:max-w-md">
          <InputGroupInput
            type="search"
            aria-label="Buscar en el catálogo"
            placeholder="Busca por título, autor o género"
            value={search}
            onChange={(event) => {
              const { value } = event.target;

              setSearch(value);

              if (urlTimer.current !== null) {
                clearTimeout(urlTimer.current);
              }

              urlTimer.current = setTimeout(() => {
                update({ buscar: value });
              }, SEARCH_URL_DELAY_MS);
            }}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        {genres.length < MIN_GENRES_TO_FILTER ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="lg" />}
              aria-label={`Filtrar por género: ${genre ?? "todos"}`}
            >
              <span className="text-muted-foreground">Género:</span>
              {genre ?? "Todos"}
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={genre ?? ALL_GENRES}
                onValueChange={(value: string) => {
                  update({ genero: value === ALL_GENRES ? null : value });
                }}
              >
                <DropdownMenuRadioItem value={ALL_GENRES}>
                  Todos
                </DropdownMenuRadioItem>
                {genres.map((item) => (
                  <DropdownMenuRadioItem key={item} value={item}>
                    {item}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {results.length === 1 ? "1 cómic" : `${results.length} cómics`}
      </p>
      {results.length > 0 ? (
        <div className="mt-10">
          <ComicGrid comics={results} />
        </div>
      ) : (
        <div className="border-foreground/20 mt-10 rounded-2xl border border-dashed">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Ningún cómic coincide</EmptyTitle>
              <EmptyDescription>
                Prueba con otras palabras o quita los filtros.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              variant="outline"
              onClick={() => {
                if (urlTimer.current !== null) {
                  clearTimeout(urlTimer.current);
                }

                setSearch("");
                update({ buscar: null, genero: null });
              }}
            >
              Quitar filtros
            </Button>
          </Empty>
        </div>
      )}
    </>
  );
};

export const Route = createFileRoute("/catalogo")({
  validateSearch: catalogSearch,
  loader: async () => {
    const [edition, catalog] = await Promise.all([
      getActiveEdition(),
      getCatalog(),
    ]);

    return { edition, catalog };
  },
  // Typing in the search box rewrites the URL on every key; the comics on sale do not change that fast.
  staleTime: CATALOG_STALE_MS,
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
