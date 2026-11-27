import { Button } from "@garage-comics/ui/components/button";
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
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { ComicGrid } from "@/components/comic-grid";
import { SectionRule, pageHeadingClass } from "@/components/page-intro";
import { SalesClosed } from "@/components/sales-closed";
import { getCatalog } from "@/functions/catalog";
import { getActiveEdition } from "@/functions/editions";
import { catalogGenres, filterCatalog } from "@/lib/catalog-filter";
import type { SellableComic } from "@/server/catalog";

const CATALOG_STALE_MS = 30_000;

const SEARCH_URL_DELAY_MS = 300;

// The menu's value for "no genre filter"; no genre is named with an empty string.
const ALL_GENRES = "";

const ALL_GENRES_LABEL = "Todos";

// A malformed value in a shared link drops that filter instead of failing the page.
const catalogSearch = z.object({
  buscar: z.string().optional().catch(undefined),
  genero: z.string().optional().catch(undefined),
});

type CatalogSearch = z.infer<typeof catalogSearch>;

// With a single genre on sale the menu would filter nothing.
const MIN_GENRES_TO_FILTER = 2;

const CatalogPage = () => {
  const { edition, catalog } = Route.useLoaderData();

  if (catalog.status === "closed" || catalog.comics.length === 0) {
    return (
      <SalesClosed title="El catálogo no está abierto" edition={edition} />
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
  const router = useRouter();
  const genres = catalogGenres(comics);

  // A genre from an old link may no longer be on sale; then the filter is off.
  const genre =
    genero !== undefined && genres.includes(genero) ? genero : undefined;

  // The box filters as you type; the URL follows once typing pauses, since every navigation re-checks the session.
  const [search, setSearch] = useState(buscar);
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // The search this box last put in the URL. Any other value came from outside (a link, Back): the box takes it and drops its pending write.
  const writtenBuscar = useRef(buscar);

  useEffect(() => {
    if (buscar === writtenBuscar.current) {
      return;
    }

    writtenBuscar.current = buscar;

    if (urlTimer.current !== null) {
      clearTimeout(urlTimer.current);
    }

    setSearch(buscar);
  }, [buscar]);

  useEffect(
    () => () => {
      if (urlTimer.current !== null) {
        clearTimeout(urlTimer.current);
      }
    },
    []
  );

  // Back and Forward land on an entry that already has its search; a pending write would replace that entry with this one.
  useEffect(
    () =>
      router.history.subscribe(({ action }) => {
        if (
          action.type !== "PUSH" &&
          action.type !== "REPLACE" &&
          urlTimer.current !== null
        ) {
          clearTimeout(urlTimer.current);
        }
      }),
    [router]
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
                // A link to another page clicked while typing may still be loading; writing now would pull the Customer back here.
                if (
                  router.latestLocation.pathname !==
                  router.state.resolvedLocation?.pathname
                ) {
                  return;
                }

                writtenBuscar.current = value;
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
              render={
                <Button variant="outline" size="lg" className="max-w-full" />
              }
              aria-label={`Filtrar por género: ${genre ?? ALL_GENRES_LABEL}`}
            >
              <span className="text-muted-foreground">Género:</span>
              {/* Every label shares one grid cell, so the button keeps the width of the longest and never jumps. */}
              <span className="grid min-w-0 justify-items-start">
                {[ALL_GENRES_LABEL, ...genres].map((label) => (
                  <span
                    key={label}
                    aria-hidden={label !== (genre ?? ALL_GENRES_LABEL)}
                    className={`col-start-1 row-start-1 max-w-full truncate ${label === (genre ?? ALL_GENRES_LABEL) ? "" : "invisible"}`}
                  >
                    {label}
                  </span>
                ))}
              </span>
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={genre ?? ALL_GENRES}
                onValueChange={(value: string) => {
                  update({ genero: value === ALL_GENRES ? null : value });
                }}
              >
                <DropdownMenuRadioItem value={ALL_GENRES} closeOnClick>
                  {ALL_GENRES_LABEL}
                </DropdownMenuRadioItem>
                {genres.map((item) => (
                  <DropdownMenuRadioItem key={item} value={item} closeOnClick>
                    <span className="min-w-0 wrap-anywhere">{item}</span>
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

                writtenBuscar.current = "";
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
