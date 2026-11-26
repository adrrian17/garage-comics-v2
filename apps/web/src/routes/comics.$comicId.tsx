import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ComicCover, ComicGrid } from "@/components/comic-grid";
import { SectionRule } from "@/components/page-intro";
import { getComicPage } from "@/functions/catalog";
import { formatMxn } from "@/lib/format";

const DESCRIPTION_META_LENGTH = 160;

const ComicPage = () => {
  const { comic, moreByAuthor } = Route.useLoaderData();

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
          <Link
            to="/autores/$slug"
            params={{ slug: comic.author.slug }}
            className="decoration-print self-start font-medium decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {comic.author.displayName}
          </Link>
          <h1 className="font-display mt-3 text-4xl leading-none font-semibold tracking-tight text-balance wrap-anywhere sm:text-6xl">
            {comic.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
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
    const page = await getComicPage({ data: { id: params.comicId } });

    if (page === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router signals a missing page by throwing notFound().
      throw notFound();
    }

    return page;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.comic.title ?? "Cómic"} · Garage Cómics`,
      },
      {
        name: "description",
        content:
          loaderData === undefined || loaderData.comic.description === ""
            ? `Cómic digital de ${loaderData?.comic.author.displayName ?? "un autor mexicano"} a la venta en Garage Cómics.`
            : loaderData.comic.description.slice(0, DESCRIPTION_META_LENGTH),
      },
    ],
  }),
  component: ComicPage,
});
