import { describe, expect, it } from "vite-plus/test";

import { authorRoster } from "./author-roster";

const comic = (id: string, slug: string, displayName: string) => ({
  id,
  author: { slug, displayName },
});

describe(authorRoster, () => {
  it("is empty without comics", () => {
    expect(authorRoster([])).toStrictEqual([]);
  });

  it("lists each Author once with their comics, in catalog order", () => {
    expect(
      authorRoster([
        comic("a1", "ana", "Ana Ruiz"),
        comic("b1", "beto", "Beto Cruz"),
        comic("a2", "ana", "Ana Ruiz"),
      ])
    ).toStrictEqual([
      {
        slug: "ana",
        displayName: "Ana Ruiz",
        comics: [
          comic("a1", "ana", "Ana Ruiz"),
          comic("a2", "ana", "Ana Ruiz"),
        ],
      },
      {
        slug: "beto",
        displayName: "Beto Cruz",
        comics: [comic("b1", "beto", "Beto Cruz")],
      },
    ]);
  });

  it("sorts Authors by name, ignoring accents and case", () => {
    expect(
      authorRoster([
        comic("1", "zoe", "zoe Paz"),
        comic("2", "angel", "Ángel Mora"),
        comic("3", "beto", "Beto Cruz"),
      ]).map((author) => author.displayName)
    ).toStrictEqual(["Ángel Mora", "Beto Cruz", "zoe Paz"]);
  });
});
