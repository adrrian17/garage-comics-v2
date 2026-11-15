import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { formatMxn } from "@/lib/format";
import type { SellableComic } from "@/server/catalog";

const ComicCard = ({
  comic,
  showAuthor,
  action,
}: {
  comic: SellableComic;
  showAuthor: boolean;
  action?: ReactNode;
}) => (
  <Card size="sm" className="w-full">
    {comic.hasCover ? (
      <img
        src={`/portadas/${comic.id}`}
        alt={`Portada de ${comic.title}`}
        width={400}
        height={600}
        loading="lazy"
        className="aspect-[2/3] w-full object-cover"
      />
    ) : (
      <div
        aria-hidden
        className="bg-muted text-muted-foreground flex aspect-[2/3] w-full items-center justify-center text-sm"
      >
        Sin portada
      </div>
    )}
    <CardHeader>
      <CardTitle className="wrap-anywhere">{comic.title}</CardTitle>
      <CardDescription>
        {showAuthor && (
          <>
            <Link
              to="/autores/$slug"
              params={{ slug: comic.author.slug }}
              className="underline"
            >
              {comic.author.displayName}
            </Link>
            {" · "}
          </>
        )}
        {comic.genre} · {comic.pageCount} páginas
      </CardDescription>
    </CardHeader>
    <CardContent className="mt-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-semibold">{formatMxn(comic.priceMxn)}</p>
        {action}
      </div>
    </CardContent>
  </Card>
);

/** The comics on sale as cards: cover, title, Author, price. */
export const ComicGrid = ({
  comics,
  showAuthor = true,
}: {
  comics: SellableComic[];
  showAuthor?: boolean;
}) => (
  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {comics.map((comic) => (
      <li key={comic.id} className="flex">
        <ComicCard
          comic={comic}
          showAuthor={showAuthor}
          action={<AddToCartButton comicId={comic.id} title={comic.title} />}
        />
      </li>
    ))}
  </ul>
);
