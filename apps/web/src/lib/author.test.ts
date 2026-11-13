import { describe, expect, it } from "vite-plus/test";

import { availableSlug, slugify } from "./author";

describe(slugify, () => {
  it.each([
    ["Ana López", "ana-lopez"],
    ["  José   Ángel  Peña ", "jose-angel-pena"],
    ["R. Martínez (Rex)", "r-martinez-rex"],
    ["猫", "autor"],
    ["!!!", "autor"],
  ])("turns %j into %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});

describe(availableSlug, () => {
  it("uses the plain slug when nobody has it", () => {
    expect(availableSlug("Ana López", ["luis"])).toBe("ana-lopez");
  });

  it("adds the first free number when the slug is taken", () => {
    expect(availableSlug("Ana López", ["ana-lopez"])).toBe("ana-lopez-2");
    expect(
      availableSlug("Ana López", ["ana-lopez", "ana-lopez-2", "ana-lopez-4"])
    ).toBe("ana-lopez-3");
  });
});
