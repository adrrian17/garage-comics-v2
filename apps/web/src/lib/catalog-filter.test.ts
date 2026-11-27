import { describe, expect, it } from "vite-plus/test";

import { catalogGenres, filterCatalog } from "./catalog-filter";

const comic = (title: string, author: string, genre: string) => ({
  title,
  genre,
  author: { displayName: author },
});

const comics = [
  comic("Marea roja", "Mar Ibarra", "Horror"),
  comic("Diario de un dragón burócrata", "Ana Lucía Ramos", "Humor"),
  comic("Kiosko", "Beto Cruz", "Slice of life"),
  comic("Las últimas horas del Mercado Sonora", "Ana Lucía Ramos", "Fantasía"),
];

const titles = (list: typeof comics) => list.map((item) => item.title);

describe(filterCatalog, () => {
  it("keeps every comic without a search or a genre", () => {
    expect(filterCatalog(comics, {})).toStrictEqual(comics);
  });

  it("finds a comic by a word of its title, ignoring case and accents", () => {
    expect(titles(filterCatalog(comics, { search: "DRAGON" }))).toStrictEqual([
      "Diario de un dragón burócrata",
    ]);
  });

  it("finds every comic by its Author", () => {
    expect(titles(filterCatalog(comics, { search: "lucia" }))).toStrictEqual([
      "Diario de un dragón burócrata",
      "Las últimas horas del Mercado Sonora",
    ]);
  });

  it("finds a comic by its genre", () => {
    expect(titles(filterCatalog(comics, { search: "fantasia" }))).toStrictEqual(
      ["Las últimas horas del Mercado Sonora"]
    );
  });

  it("needs every word of the search to match", () => {
    expect(
      titles(filterCatalog(comics, { search: "  ana   mercado " }))
    ).toStrictEqual(["Las últimas horas del Mercado Sonora"]);
  });

  it("keeps only the chosen genre", () => {
    expect(titles(filterCatalog(comics, { genre: "Horror" }))).toStrictEqual([
      "Marea roja",
    ]);
  });

  it("combines the search and the genre", () => {
    expect(
      filterCatalog(comics, { search: "ana", genre: "Horror" })
    ).toStrictEqual([]);
  });
});

describe(catalogGenres, () => {
  it("lists each genre once, in alphabetical order", () => {
    expect(
      catalogGenres([...comics, comic("Neblina", "Beto Cruz", "Humor")])
    ).toStrictEqual(["Fantasía", "Horror", "Humor", "Slice of life"]);
  });
});
