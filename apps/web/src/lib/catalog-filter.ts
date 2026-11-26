interface FilterableComic {
  title: string;
  genre: string;
  author: { displayName: string };
}

/** Lowercase, without accents, so "dragón" matches "DRAGON". */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/\p{Mn}/gu, "")
    .toLowerCase();

const words = (text: string) =>
  fold(text)
    .split(/\s+/u)
    .filter((word) => word !== "");

/** The comics that match every word of `search` (in the title, Author or genre) and, when given, the genre. */
export const filterCatalog = <Comic extends FilterableComic>(
  comics: Comic[],
  { search = "", genre }: { search?: string; genre?: string }
) => {
  const wanted = words(search);

  return comics.filter((comic) => {
    if (genre !== undefined && comic.genre !== genre) {
      return false;
    }

    const haystack = fold(
      `${comic.title} ${comic.author.displayName} ${comic.genre}`
    );

    return wanted.every((word) => haystack.includes(word));
  });
};

/** The genres on sale, each once, in alphabetical order. */
export const catalogGenres = (comics: FilterableComic[]) =>
  [...new Set(comics.map((comic) => comic.genre))].toSorted((a, b) =>
    a.localeCompare(b, "es")
  );
