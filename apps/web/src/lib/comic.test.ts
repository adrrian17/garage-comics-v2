import { describe, expect, it } from "vite-plus/test";

import {
  PART_BYTES,
  canApply,
  canPrepareComics,
  comicInput,
  contentChanged,
  decisionInput,
  freePreviousSlot,
  offeredStatus,
  pageCountError,
  planParts,
  sniffMatches,
  statusAfterEdit,
} from "./comic";
import type { ComicContent } from "./comic";

const bytes = (...values: number[]) => new Uint8Array(values);

const ascii = (text: string) => new TextEncoder().encode(text);

describe("comic transitions", () => {
  it.each([
    ["draft", "submit", true],
    ["draft", "approve", false],
    ["draft", "reject", false],
    ["in_review", "submit", false],
    ["in_review", "approve", true],
    ["in_review", "reject", true],
    ["approved", "submit", false],
    ["approved", "approve", false],
    ["approved", "reject", false],
    ["rejected", "submit", true],
    ["rejected", "approve", false],
    ["rejected", "reject", false],
  ] as const)("a %s comic allows %s: %s", (status, action, allowed) => {
    expect(canApply(status, action)).toBe(allowed);
  });
});

describe(statusAfterEdit, () => {
  it.each([
    ["draft", true, "draft"],
    ["draft", false, "draft"],
    ["in_review", true, "in_review"],
    ["in_review", false, "in_review"],
    ["approved", true, "in_review"],
    ["approved", false, "approved"],
    ["rejected", true, "rejected"],
    ["rejected", false, "rejected"],
  ] as const)(
    "a %s comic saved with changed=%s ends up %s",
    (status, changed, expected) => {
      expect(statusAfterEdit(status, changed)).toBe(expected);
    }
  );
});

describe(contentChanged, () => {
  const content: ComicContent = {
    title: "Noche en la azotea",
    description: "Una historia de terror.",
    genre: "Terror",
    priceMxn: 90,
    pageCount: 18,
    collaborators: [
      { name: "Ana", role: "Color", links: ["https://ana.example"] },
    ],
    coverKey: "comics/a/cover-1",
    pdfKey: "comics/a/pdf-1",
  };

  it("ignores a save that changes nothing", () => {
    expect(
      contentChanged(content, {
        ...content,
        collaborators: content.collaborators.map((collaborator) => ({
          ...collaborator,
          links: [...collaborator.links],
        })),
      })
    ).toBeFalsy();
  });

  const changes: [string, Partial<ComicContent>][] = [
    ["title", { title: "Otra" }],
    ["description", { description: "Otra." }],
    ["genre", { genre: "Drama" }],
    ["price", { priceMxn: 120 }],
    ["page count", { pageCount: 20 }],
    ["cover", { coverKey: "comics/a/cover-2" }],
    ["PDF", { pdfKey: "comics/a/pdf-2" }],
    ["a new cover", { coverKey: null }],
    [
      "a Collaborator's name",
      { collaborators: [{ name: "Ana B.", role: "Color", links: [] }] },
    ],
    [
      "a Collaborator's link",
      { collaborators: [{ name: "Ana", role: "Color", links: [] }] },
    ],
    ["the Collaborators", { collaborators: [] }],
  ];

  it.each(changes)("notices a change in %s", (_field, change) => {
    expect(contentChanged(content, { ...content, ...change })).toBeTruthy();
  });
});

describe(pageCountError, () => {
  it.each([
    ["exclusive", 11, true],
    ["exclusive", 12, false],
    ["exclusive", 18, false],
    ["exclusive", 24, false],
    ["exclusive", 25, true],
    ["previous_1", 1, false],
    ["previous_2", 300, false],
  ] as const)("%s with %i pages is refused: %s", (slot, pages, refused) => {
    expect(pageCountError(slot, pages) !== null).toBe(refused);
  });
});

describe(canPrepareComics, () => {
  it.each([
    ["upcoming", true],
    ["proposals", true],
    ["preparation", true],
    ["sales", false],
    ["closed", false],
  ] as const)(
    "in the %s phase comics can be prepared: %s",
    (phase, allowed) => {
      expect(canPrepareComics(phase)).toBe(allowed);
    }
  );
});

describe(planParts, () => {
  it.each([
    ["pdf", "application/pdf", 1, 1],
    ["pdf", "application/pdf", PART_BYTES, 1],
    ["pdf", "application/pdf", PART_BYTES + 1, 2],
    ["pdf", "application/pdf", 100 * 1024 * 1024, 10],
    ["pdf", "application/pdf", 500_000_000, 48],
    ["cover", "image/png", 10_000_000, 1],
    ["cover", "image/webp", 1, 1],
  ] as const)(
    "a %s of type %s and %i bytes goes in %i parts",
    (kind, type, size, parts) => {
      expect(planParts(kind, type, size)).toStrictEqual({
        status: "ok",
        parts,
      });
    }
  );

  it.each([
    ["pdf", "application/pdf", 500_000_001],
    ["pdf", "application/pdf", 0],
    ["pdf", "application/pdf", 1.5],
    ["pdf", "image/png", 1000],
    ["pdf", "text/plain", 1000],
    ["cover", "application/pdf", 1000],
    ["cover", "image/gif", 1000],
    ["cover", "image/png", 10_000_001],
  ] as const)("refuses a %s of type %s and %d bytes", (kind, type, size) => {
    expect(planParts(kind, type, size).status).toBe("invalid");
  });
});

describe(sniffMatches, () => {
  it.each([
    ["pdf", ascii("%PDF-1.7\n"), true],
    ["pdf", ascii("hola, esto es texto"), false],
    ["pdf", bytes(), false],
    ["pdf", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), false],
    ["cover", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), true],
    ["cover", bytes(0xff, 0xd8, 0xff, 0xe0), true],
    [
      "cover",
      new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]),
      true,
    ],
    [
      "cover",
      new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")]),
      false,
    ],
    ["cover", ascii("%PDF-1.7\n"), false],
    ["cover", bytes(), false],
  ] as const)("a %s that starts with %j matches: %s", (kind, head, matches) => {
    expect(sniffMatches(kind, head)).toBe(matches);
  });
});

describe("the content of a comic", () => {
  const valid = {
    title: " Noche en la azotea ",
    description: "Una historia de terror.",
    genre: "Terror",
    priceMxn: "90",
    pageCount: "18",
    collaborators: [
      { name: "Ana", role: "Color", links: ["https://ana.example", " "] },
    ],
  };

  it("trims text, reads numbers and drops blank links", () => {
    expect(comicInput.parse(valid)).toStrictEqual({
      ...valid,
      title: "Noche en la azotea",
      priceMxn: 90,
      pageCount: 18,
      collaborators: [
        { name: "Ana", role: "Color", links: ["https://ana.example"] },
      ],
    });
  });

  it.each([
    ["a blank title", { title: "  " }],
    ["a blank description", { description: "" }],
    ["a blank genre", { genre: "" }],
    ["a price under $70", { priceMxn: "69" }],
    ["a price with cents", { priceMxn: "70.5" }],
    ["a price that is not a number", { priceMxn: "gratis" }],
    ["no pages", { pageCount: "0" }],
    ["half a page", { pageCount: "1.5" }],
    [
      "a Collaborator without a name",
      { collaborators: [{ name: "", role: "Color", links: [] }] },
    ],
    [
      "a Collaborator without a role",
      { collaborators: [{ name: "Ana", role: "", links: [] }] },
    ],
    [
      "a link that is not http",
      { collaborators: [{ name: "Ana", role: "Color", links: ["ana.com"] }] },
    ],
    [
      "more than ten Collaborators",
      {
        collaborators: Array.from({ length: 11 }, () => ({
          name: "Ana",
          role: "Color",
          links: [],
        })),
      },
    ],
  ] as const)("refuses %s", (_case, change) => {
    expect(comicInput.safeParse({ ...valid, ...change }).success).toBeFalsy();
  });
});

describe("an Admin's decision", () => {
  const base = { id: "c1", revision: 3 };

  it.each([
    ["approves with no reason", { decision: "approve" }, true],
    ["approves with a reason", { decision: "approve", reason: "Bien" }, true],
    [
      "rejects with a reason",
      { decision: "reject", reason: "Falta el PDF" },
      true,
    ],
    ["rejects with no reason", { decision: "reject" }, false],
    [
      "rejects with a blank reason",
      { decision: "reject", reason: "   " },
      false,
    ],
    [
      "rejects with a reason that is too long",
      { decision: "reject", reason: "a".repeat(1001) },
      false,
    ],
    ["makes up a decision", { decision: "reopen", reason: "x" }, false],
  ] as const)("%s: valid=%s", (_case, change, valid) => {
    expect(decisionInput.safeParse({ ...base, ...change }).success).toBe(valid);
  });

  it("trims the reason", () => {
    expect(
      decisionInput.parse({ ...base, decision: "reject", reason: "  Falta  " })
        .reason
    ).toBe("Falta");
  });
});

describe(freePreviousSlot, () => {
  it.each([
    [[], "previous_1"],
    [["exclusive"], "previous_1"],
    [["previous_1"], "previous_2"],
    [["previous_2"], "previous_1"],
    [["exclusive", "previous_1"], "previous_2"],
    [["previous_1", "previous_2"], null],
    [["exclusive", "previous_1", "previous_2"], null],
  ] as const)("with %j taken the free slot is %s", (taken, expected) => {
    expect(freePreviousSlot(taken)).toBe(expected);
  });
});

describe(offeredStatus, () => {
  it.each([
    ["draft", "draft"],
    ["in_review", "draft"],
    ["approved", "approved"],
    ["rejected", "draft"],
  ] as const)("a %s comic is offered as %s", (status, expected) => {
    expect(offeredStatus(status)).toBe(expected);
  });
});
