import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ComicCover, ComicGrid } from "@/components/comic-grid";
import { SectionRule } from "@/components/page-intro";
import { SalesClosed } from "@/components/sales-closed";
import { COMIC_ID_MAX_LENGTH, getComicPage } from "@/functions/catalog";
import { getActiveEdition } from "@/functions/editions";
import { collaboratorNames, linkLabel } from "@/lib/credits";
import { formatMxn } from "@/lib/format";
import type { SellableComic } from "@/server/catalog";

const DESCRIPTION_META_LENGTH = 160;

/** Who made the comic: the Author first, then each Collaborator with their role and links. */
const Credits = ({ comic }: { comic: SellableComic }) => (
  <section aria-labelledby="creditos" className="mt-12">
    <h2
      id="creditos"
      className="font-display text-xl font-semibold tracking-tight"
    >
      Créditos
    </h2>
    <ul className="mt-4 divide-y border-y">
      <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
        <Link
          to="/autores/$slug"
          params={{ slug: comic.author.slug }}
          className="decoration-print font-medium decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {comic.author.displayName}
        </Link>
        <span className="text-muted-foreground text-sm">Autor</span>
      </li>
      {comic.collaborators.map((collaborator) => (
        <li
          key={`${collaborator.name}-${collaborator.role}`}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4"
        >
          <div className="min-w-0">
            <p className="font-medium wrap-anywhere">{collaborator.name}</p>
            {collaborator.links.length === 0 ? null : (
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {collaborator.links.map((href) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground decoration-print inline-flex items-center gap-1 text-sm decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {linkLabel(href)}
                      <ArrowUpRight aria-hidden className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="text-muted-foreground text-sm wrap-anywhere">
            {collaborator.role}
          </span>
        </li>
      ))}
    </ul>
  </section>
);

const ComicPage = () => {
  const page = Route.useLoaderData();

  // The link was right while the comic was on sale; it is not a missing page.
  if (page.status === "closed") {
    return (
      <SalesClosed
        title="Este cómic ya no está a la venta"
        edition={page.edition}
      />
    );
  }

  const { comic, moreByAuthor } = page;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:pb-28">
      <Link
        to="/catalogo"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium transition-colors outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Catálogo
      </Link>
      <article className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ComicCover
            comic={comic}
            className="ring-foreground/15 shadow-foreground/15 mx-auto max-w-md rounded-2xl shadow-2xl ring-1 lg:max-w-none"
          />
        </div>
        <div className="flex flex-col">
          <p className="wrap-anywhere">
            <Link
              to="/autores/$slug"
              params={{ slug: comic.author.slug }}
              className="decoration-print font-medium decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {comic.author.displayName}
            </Link>
            {comic.collaborators.length === 0 ? null : (
              <span className="text-muted-foreground">
                {" "}
                con {collaboratorNames(comic.collaborators)}
              </span>
            )}
          </p>
          <h1 className="font-display mt-3 text-4xl leading-none font-semibold tracking-tight text-balance wrap-anywhere sm:text-6xl">
            {comic.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg wrap-anywhere">
            {comic.genre} · {comic.pageCount} páginas
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <p className="font-display text-4xl font-semibold tracking-tight tabular-nums">
              {formatMxn(comic.priceMxn)}
            </p>
            <AddToCartButton comicId={comic.id} title={comic.title} />
          </div>
          <SectionRule />
          {comic.description === "" ? null : (
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-pretty wrap-anywhere whitespace-pre-line">
              {comic.description}
            </p>
          )}
          {comic.collaborators.length === 0 ? null : <Credits comic={comic} />}
        </div>
      </article>
      {moreByAuthor.length === 0 ? null : (
        <section aria-labelledby="mas-del-autor" className="mt-20 lg:mt-28">
          <h2
            id="mas-del-autor"
            className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Más de {comic.author.displayName}
          </h2>
          <SectionRule />
          <div className="mt-10">
            <ComicGrid comics={moreByAuthor} showAuthor={false} />
          </div>
        </section>
      )}
    </main>
  );
};

export const Route = createFileRoute("/comics/$comicId")({
  loader: async ({ params }) => {
    const page =
      params.comicId.length > COMIC_ID_MAX_LENGTH
        ? null
        : await getComicPage({ data: { id: params.comicId } });

    if (page === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router signals a missing page by throwing notFound().
      throw notFound();
    }

    if (page.status === "closed") {
      return { ...page, edition: await getActiveEdition() };
    }

    return page;
  },
  head: ({ loaderData }) => {
    const comic = loaderData?.status === "open" ? loaderData.comic : null;

    return {
      meta: [
        { title: `${comic?.title ?? "Cómic"} · Garage Cómics` },
        {
          name: "description",
          content:
            comic === null || comic.description === ""
              ? `Cómic digital de ${comic?.author.displayName ?? "un autor mexicano"} en Garage Cómics.`
              : comic.description.slice(0, DESCRIPTION_META_LENGTH),
        },
      ],
    };
  },
  component: ComicPage,
});
