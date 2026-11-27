import { cn } from "@garage-comics/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { collaboratorNames } from "@/lib/credits";
import { formatMxn } from "@/lib/format";
import type { SellableComic } from "@/server/catalog";

/**
 * A cover, or the title set as type when the Author has not uploaded one. The title beside it names the comic, so the stand-in is hidden.
 * `decorative` hides the image too, where the title already sits right next to it.
 */
export const ComicCover = ({
  comic,
  className,
  decorative = false,
}: {
  comic: Pick<SellableComic, "id" | "title" | "hasCover">;
  className?: string;
  decorative?: boolean;
}) => {
  if (!comic.hasCover) {
    return (
      <div
        aria-hidden
        className={cn(
          "bg-paper-deep @container flex aspect-2/3 w-full flex-col justify-between",
          className
        )}
      >
        <span className="font-display cover-title line-clamp-5 w-full leading-tight font-semibold tracking-tight wrap-anywhere">
          {comic.title}
        </span>
        <span className="bg-print cover-rule" />
      </div>
    );
  }

  return (
    <img
      src={`/portadas/${comic.id}`}
      alt={decorative ? "" : `Portada de ${comic.title}`}
      width={400}
      height={600}
      loading="lazy"
      className={cn("bg-muted aspect-2/3 w-full object-cover", className)}
    />
  );
};

// A card names this many Collaborators and counts the rest, so long credits never push the price down.
const CARD_COLLABORATORS = 2;

const ComicCard = ({
  comic,
  showAuthor,
  action,
}: {
  comic: SellableComic;
  showAuthor: boolean;
  action?: ReactNode;
}) => (
  <article className="group/comic flex w-full min-w-0 flex-col">
    {/* The title link below is the one keyboards and screen readers use; the cover is a larger target for the pointer. */}
    <Link
      to="/comics/$comicId"
      params={{ comicId: comic.id }}
      tabIndex={-1}
      aria-hidden
      className="ring-foreground/15 group-hover/comic:print-offset overflow-hidden rounded-lg ring-1 transition duration-200 ease-out group-hover/comic:-translate-x-1 group-hover/comic:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover/comic:translate-0"
    >
      <ComicCover comic={comic} />
    </Link>
    <h3 className="font-display mt-4 text-lg leading-snug font-semibold tracking-tight text-pretty wrap-anywhere">
      <Link
        to="/comics/$comicId"
        params={{ comicId: comic.id }}
        className="decoration-print decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {comic.title}
      </Link>
    </h3>
    {showAuthor ? (
      <p className="mt-1 text-sm wrap-anywhere">
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
            con {collaboratorNames(comic.collaborators, CARD_COLLABORATORS)}
          </span>
        )}
      </p>
    ) : null}
    <p className="text-muted-foreground mt-1 text-sm wrap-anywhere">
      {comic.genre} · {comic.pageCount} páginas
    </p>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-3 pt-4">
      <p className="font-display text-lg font-semibold tabular-nums">
        {formatMxn(comic.priceMxn)}
      </p>
      {action}
    </div>
  </article>
);

/** The comics on sale: cover, title, Author, price. */
export const ComicGrid = ({
  comics,
  showAuthor = true,
}: {
  comics: SellableComic[];
  showAuthor?: boolean;
}) => (
  <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
    {comics.map((comic) => (
      <li key={comic.id} className="flex min-w-0">
        <ComicCard
          comic={comic}
          showAuthor={showAuthor}
          action={<AddToCartButton comicId={comic.id} title={comic.title} />}
        />
      </li>
    ))}
  </ul>
);
