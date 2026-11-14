import { z } from "zod";

import { NAME_MAX_LENGTH, optionalHttpUrl } from "./proposal";

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

/** True when an Author has filled in nothing beyond their name. */
export const isBlankProfile = (profile: {
  role: string;
  bio: string;
  instagramUrl: string | null;
  xUrl: string | null;
  facebookUrl: string | null;
  portfolioUrl: string | null;
}) =>
  profile.role === "" &&
  profile.bio === "" &&
  [
    profile.instagramUrl,
    profile.xUrl,
    profile.facebookUrl,
    profile.portfolioUrl,
  ].every((link) => link === null);

const INITIALS_MAX = 2;

/** Up to two capital letters from the first words of a name, for the placeholder avatar. */
export const initials = (name: string) =>
  name
    .split(/\s+/u)
    .filter((word) => word !== "")
    .slice(0, INITIALS_MAX)
    .map((word) => String.fromCodePoint(word.codePointAt(0) ?? 0).toUpperCase())
    .join("");

export const ROLE_MAX_LENGTH = 60;
export const BIO_MAX_LENGTH = 1000;

export const authorProfileInput = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre público.")
    .max(NAME_MAX_LENGTH, "Tu nombre es demasiado largo."),
  role: z
    .string()
    .trim()
    .max(ROLE_MAX_LENGTH, `Usa como máximo ${ROLE_MAX_LENGTH} caracteres.`),
  bio: z
    .string()
    .trim()
    .max(BIO_MAX_LENGTH, `Usa como máximo ${BIO_MAX_LENGTH} caracteres.`),
  instagramUrl: optionalHttpUrl("El link de Instagram"),
  xUrl: optionalHttpUrl("El link de X"),
  facebookUrl: optionalHttpUrl("El link de Facebook"),
  portfolioUrl: optionalHttpUrl("El portafolio"),
});
