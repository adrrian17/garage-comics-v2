const FALLBACK_SLUG = "autor";

/** Lowercase ASCII words joined by hyphens, so a name such as "José Ángel" becomes "jose-angel". */
export const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replaceAll(/\p{Mn}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((word) => word !== "")
    .join("-") || FALLBACK_SLUG;

/** The first free slug for `name`: the plain one, then `-2`, `-3` and so on. `taken` holds the slugs already in use. */
export const availableSlug = (name: string, taken: readonly string[]) => {
  const base = slugify(name);
  const used = new Set(taken);

  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;

    if (!used.has(candidate)) {
      return candidate;
    }
  }
};
