import { describe, expect, it } from "vite-plus/test";

import {
  authorProfileInput,
  availableSlug,
  initials,
  isBlankProfile,
  slugify,
} from "./author";

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

describe(initials, () => {
  it("takes the first letters of the first two words", () => {
    expect(initials("ana lópez ruiz")).toBe("AL");
    expect(initials("  Rex ")).toBe("R");
  });
});

describe("the Author profile form", () => {
  const form = {
    displayName: "  Ana López ",
    role: "Guionista",
    bio: "Hago cómics.",
    instagramUrl: "https://instagram.com/ana",
    xUrl: "",
    facebookUrl: "",
    portfolioUrl: "",
  };

  it("trims text and turns blank links into null", () => {
    expect(authorProfileInput.parse(form)).toStrictEqual({
      displayName: "Ana López",
      role: "Guionista",
      bio: "Hago cómics.",
      instagramUrl: "https://instagram.com/ana",
      xUrl: null,
      facebookUrl: null,
      portfolioUrl: null,
    });
  });

  it.each(["data:text/html,hola", "ftp://example.com", "instagram.com/ana"])(
    "refuses the link %j",
    (link) => {
      expect(
        authorProfileInput.safeParse({ ...form, xUrl: link }).success
      ).toBeFalsy();
    }
  );

  it("refuses a blank public name", () => {
    expect(
      authorProfileInput.safeParse({ ...form, displayName: "   " }).success
    ).toBeFalsy();
  });
});

describe(isBlankProfile, () => {
  const blank = {
    role: "",
    bio: "",
    instagramUrl: null,
    xUrl: null,
    facebookUrl: null,
    portfolioUrl: null,
  };

  it("is blank with only a name", () => {
    expect(isBlankProfile(blank)).toBeTruthy();
  });

  it.each([
    { role: "Guionista" },
    { bio: "Hago cómics." },
    { portfolioUrl: "https://ana.example.com" },
  ])("is not blank with %j", (filled) => {
    expect(isBlankProfile({ ...blank, ...filled })).toBeFalsy();
  });
});
