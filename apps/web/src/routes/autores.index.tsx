import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ComicCover } from "@/components/comic-grid";
import { SectionRule, pageHeadingClass } from "@/components/page-intro";
import { SalesClosed } from "@/components/sales-closed";
import { getAuthorsPage } from "@/functions/authors";
import { getActiveEdition } from "@/functions/editions";
import { initials } from "@/lib/author";

type ListedAuthor = Extract<
  Awaited<ReturnType<typeof getAuthorsPage>>,
  { status: "open" }
>["authors"][number];

const AUTHORS_STALE_MS = 30_000;

// A row shows this many covers and counts the rest, so a prolific Author does not stretch it.
const ROW_COVERS = 3;

const comicCount = (count: number) =>
  count === 1 ? "1 cómic" : `${count} cómics`;

const AuthorRow = ({ author }: { author: ListedAuthor }) => {
  const hiddenCovers = author.comics.length - ROW_COVERS;

  return (
    <li className="border-b">
      <Link
        to="/autores/$slug"
        params={{ slug: author.slug }}
        className="group/author focus-visible:ring-ring/50 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-5 rounded-sm py-6 outline-none focus-visible:ring-3 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-x-8 sm:py-8"
      >
        <span
          aria-hidden
          className="seal bg-print text-print-foreground font-display grid size-16 place-items-center text-xl font-semibold tracking-tight transition-transform duration-300 group-hover/author:rotate-12 motion-reduce:transition-none sm:size-20 sm:text-2xl"
        >
          {initials(author.displayName)}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-display decoration-print text-2xl leading-tight font-semibold tracking-tight text-balance wrap-anywhere decoration-2 underline-offset-4 group-hover/author:underline sm:text-3xl">
            {author.displayName}
          </span>
          <span className="text-muted-foreground wrap-anywhere">
            {author.role === ""
              ? comicCount(author.comics.length)
              : `${author.role} · ${comicCount(author.comics.length)}`}
          </span>
        </span>
        <div
          aria-hidden
          className="col-start-2 flex items-center gap-2 sm:col-start-auto"
        >
          {author.comics.slice(0, ROW_COVERS).map((comic) => (
            <ComicCover
              key={comic.id}
              comic={comic}
              className="ring-foreground/10 w-12 rounded-md ring-1 sm:w-14"
            />
          ))}
          {hiddenCovers > 0 ? (
            <span className="text-muted-foreground pl-1 text-sm font-medium tabular-nums">
              +{hiddenCovers}
            </span>
          ) : null}
        </div>
        <ArrowRight
          aria-hidden
          className="text-muted-foreground group-hover/author:text-foreground size-5 transition-transform duration-300 group-hover/author:translate-x-1 motion-reduce:transition-none max-sm:hidden"
        />
      </Link>
    </li>
  );
};

const AuthorsPage = () => {
  const { edition, page } = Route.useLoaderData();

  if (page.status === "closed" || page.authors.length === 0) {
    return (
      <SalesClosed title="Los autores llegan con la venta" edition={edition} />
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:pb-28">
      <p className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
        <span aria-hidden className="bg-print size-2 rounded-full" />
        {page.edition.name}
      </p>
      <h1 className={pageHeadingClass}>Autores</h1>
      <SectionRule />
      <ul className="mt-10 border-t">
        {page.authors.map((author) => (
          <AuthorRow key={author.slug} author={author} />
        ))}
      </ul>
    </main>
  );
};

export const Route = createFileRoute("/autores/")({
  loader: async () => {
    const [edition, page] = await Promise.all([
      getActiveEdition(),
      getAuthorsPage(),
    ]);

    return { edition, page };
  },
  staleTime: AUTHORS_STALE_MS,
  head: () => ({
    meta: [
      { title: "Autores · Garage Cómics" },
      {
        name: "description",
        content:
          "Los autores mexicanos con cómics a la venta en la Edición abierta de Garage Cómics.",
      },
    ],
  }),
  component: AuthorsPage,
});
