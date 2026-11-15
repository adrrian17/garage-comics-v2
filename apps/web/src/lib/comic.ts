import type {
  Collaborator,
  ComicSlot,
  ComicStatus,
  editionComic,
} from "@garage-comics/db/schema/comics";
import { z } from "zod";

import type { EditionPhase } from "./edition";
import { optionalHttpUrl } from "./proposal";

export const COMIC_MIN_PRICE_MXN = 70;

export const EXCLUSIVE_PAGES = { min: 12, max: 24 } as const;

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const GENRE_MAX_LENGTH = 60;
export const COLLABORATORS_MAX = 10;
const COLLABORATOR_LINKS_MAX = 5;
export const COLLABORATOR_NAME_MAX_LENGTH = 120;
export const COLLABORATOR_ROLE_MAX_LENGTH = 80;

const MB = 1_000_000;

// R2 needs every part of a multipart upload to be the same size except the last, and at least 5 MiB.
export const PART_BYTES = 10 * 1024 * 1024;

const uploadRules = {
  cover: {
    noun: "La portada",
    maxBytes: 10 * MB,
    contentTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  pdf: {
    noun: "El PDF",
    maxBytes: 500 * MB,
    contentTypes: ["application/pdf"],
  },
} as const;

export type UploadKind = keyof typeof uploadRules;

/** The size and type gate that runs before any upload starts. */
export const planParts = (
  kind: UploadKind,
  contentType: string,
  sizeBytes: number
) => {
  const { noun, maxBytes } = uploadRules[kind];
  const contentTypes: readonly string[] = uploadRules[kind].contentTypes;

  if (!contentTypes.includes(contentType)) {
    return {
      status: "invalid" as const,
      message: `${noun} no tiene un formato válido.`,
    };
  }

  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return { status: "invalid" as const, message: `${noun} está vacío.` };
  }

  if (sizeBytes > maxBytes) {
    return {
      status: "invalid" as const,
      message: `${noun} pesa demasiado: el máximo es de ${maxBytes / MB} MB.`,
    };
  }

  return { status: "ok" as const, parts: Math.ceil(sizeBytes / PART_BYTES) };
};

const startsWith = (head: Uint8Array, signature: readonly number[], at = 0) =>
  signature.every((byte, index) => head[at + index] === byte);

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];
const WEBP_OFFSET = 8;

const isWebp = (head: Uint8Array) =>
  startsWith(head, RIFF_SIGNATURE) &&
  startsWith(head, WEBP_SIGNATURE, WEBP_OFFSET);

const isCoverImage = (head: Uint8Array) =>
  startsWith(head, PNG_SIGNATURE) ||
  startsWith(head, JPEG_SIGNATURE) ||
  isWebp(head);

/** Whether the first bytes of a file are what its kind claims; the name and the declared type prove nothing. */
export const sniffMatches = (kind: UploadKind, head: Uint8Array) =>
  kind === "pdf" ? startsWith(head, PDF_SIGNATURE) : isCoverImage(head);

/** Every allowed comic status change; anything not listed here is refused. */
export const comicTransitions = {
  submit: { from: ["draft", "rejected"], to: "in_review" },
  approve: { from: ["in_review"], to: "approved" },
  reject: { from: ["in_review"], to: "rejected" },
} as const satisfies Record<
  string,
  { from: readonly ComicStatus[]; to: ComicStatus }
>;

type ComicAction = keyof typeof comicTransitions;

export const canApply = (status: ComicStatus, action: ComicAction) => {
  const allowed: readonly ComicStatus[] = comicTransitions[action].from;

  return allowed.includes(status);
};

/** Saving an approved comic with changes sends it back to review; every other status keeps itself. */
export const statusAfterEdit = (status: ComicStatus, changed: boolean) =>
  status === "approved" && changed ? comicTransitions.submit.to : status;

export type ComicContent = Pick<
  typeof editionComic.$inferSelect,
  | "title"
  | "description"
  | "genre"
  | "priceMxn"
  | "pageCount"
  | "collaborators"
  | "coverKey"
  | "pdfKey"
>;

const collaboratorsFingerprint = (collaborators: Collaborator[]) =>
  JSON.stringify(
    collaborators.map(({ name, role, links }) => [name, role, links])
  );

const scalarFields = [
  "title",
  "description",
  "genre",
  "priceMxn",
  "pageCount",
  "coverKey",
  "pdfKey",
] as const satisfies readonly (keyof ComicContent)[];

/** A new file always counts as a change, because its key is new. */
export const contentChanged = (previous: ComicContent, next: ComicContent) =>
  scalarFields.some((field) => previous[field] !== next[field]) ||
  collaboratorsFingerprint(previous.collaborators) !==
    collaboratorsFingerprint(next.collaborators);

export const pageCountError = (slot: ComicSlot, pageCount: number) =>
  slot === "exclusive" &&
  (pageCount < EXCLUSIVE_PAGES.min || pageCount > EXCLUSIVE_PAGES.max)
    ? `El Exclusivo de la edición debe tener entre ${EXCLUSIVE_PAGES.min} y ${EXCLUSIVE_PAGES.max} páginas.`
    : null;

/** Authors can write, and Admins can decide, only until the sales window opens. */
export const canPrepareComics = (phase: EditionPhase) =>
  phase !== "sales" && phase !== "closed";

export const comicStatusLabels = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
} as const satisfies Record<ComicStatus, string>;

export const editionSlotLabels = {
  exclusive: "Exclusivo de la edición",
  previous_1: "Trabajo previo",
  previous_2: "Trabajo previo",
} as const satisfies Record<ComicSlot, string>;

const collaboratorInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre de cada Colaborador.")
    .max(
      COLLABORATOR_NAME_MAX_LENGTH,
      "El nombre de un Colaborador es demasiado largo."
    ),
  role: z
    .string()
    .trim()
    .min(1, "Escribe el rol de cada Colaborador.")
    .max(
      COLLABORATOR_ROLE_MAX_LENGTH,
      "El rol de un Colaborador es demasiado largo."
    ),
  links: z
    .array(optionalHttpUrl("El link de un Colaborador"))
    .transform((links) => links.filter((link) => link !== null))
    .pipe(
      z
        .array(z.string())
        .max(
          COLLABORATOR_LINKS_MAX,
          `Cada Colaborador puede tener hasta ${COLLABORATOR_LINKS_MAX} links.`
        )
    ),
});

export const comicInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Ponle título a tu cómic.")
    .max(TITLE_MAX_LENGTH, "El título es demasiado largo."),
  description: z
    .string()
    .trim()
    .min(1, "Escribe una descripción.")
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Usa como máximo ${DESCRIPTION_MAX_LENGTH} caracteres en la descripción.`
    ),
  genre: z
    .string()
    .trim()
    .min(1, "Escribe el género.")
    .max(GENRE_MAX_LENGTH, "El género es demasiado largo."),
  priceMxn: z.coerce
    .number("El precio debe ser un número.")
    .int("El precio va en pesos enteros.")
    .min(
      COMIC_MIN_PRICE_MXN,
      `El precio mínimo es de $${COMIC_MIN_PRICE_MXN}.`
    ),
  pageCount: z.coerce
    .number("Las páginas deben ser un número.")
    .int("Las páginas deben ser un número entero.")
    .min(1, "Escribe cuántas páginas tiene."),
  collaborators: z
    .array(collaboratorInput)
    .max(
      COLLABORATORS_MAX,
      `Puedes acreditar hasta ${COLLABORATORS_MAX} Colaboradores.`
    ),
});

export type ComicInput = z.output<typeof comicInput>;
