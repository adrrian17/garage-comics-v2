import { describe, expect, it } from "vite-plus/test";

import { collaboratorNames, linkLabel } from "./credits";

const person = (name: string) => ({ name, role: "Color", links: [] });

describe(collaboratorNames, () => {
  it("is empty without Collaborators", () => {
    expect(collaboratorNames([])).toBe("");
  });

  it("joins two names with y", () => {
    expect(collaboratorNames([person("Luis"), person("Sofía")])).toBe(
      "Luis y Sofía"
    );
  });

  it("joins every name when they fit", () => {
    expect(
      collaboratorNames([person("Luis"), person("Sofía"), person("Rocío")])
    ).toBe("Luis, Sofía y Rocío");
  });

  it("writes e instead of y before a name that sounds like i", () => {
    expect(collaboratorNames([person("Sofía"), person("Iván")])).toBe(
      "Sofía e Iván"
    );
  });

  it("names the first ones and counts the rest past the limit", () => {
    expect(
      collaboratorNames(
        [person("Luis"), person("Sofía"), person("Iván"), person("Rocío")],
        2
      )
    ).toBe("Luis, Sofía y 2 más");
  });
});

describe(linkLabel, () => {
  it("shows the site without www, protocol or path", () => {
    expect(linkLabel("https://www.instagram.com/luis.dibuja?igsh=abc")).toBe(
      "instagram.com"
    );
  });

  it("falls back to the raw link when it is not a URL", () => {
    expect(linkLabel("no es un link")).toBe("no es un link");
  });
});
