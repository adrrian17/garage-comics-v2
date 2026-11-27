interface RosterComic {
  id: string;
  author: { slug: string; displayName: string };
}

const byName = new Intl.Collator("es-MX", { sensitivity: "base" });

/** The Authors behind a list of comics, each once with their comics in the order given, sorted by name. */
export const authorRoster = <Comic extends RosterComic>(comics: Comic[]) => {
  const authors = new Map<string, Comic["author"] & { comics: Comic[] }>();

  for (const comic of comics) {
    const entry = authors.get(comic.author.slug);

    if (entry === undefined) {
      authors.set(comic.author.slug, { ...comic.author, comics: [comic] });
    } else {
      entry.comics.push(comic);
    }
  }

  return [...authors.values()].toSorted((a, b) =>
    byName.compare(a.displayName, b.displayName)
  );
};
