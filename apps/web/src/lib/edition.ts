import type { edition } from "@garage-comics/db/schema/editions";
import { z } from "zod";

type Edition = typeof edition.$inferSelect;

type EditionWindows = Pick<
  Edition,
  "proposalsOpenAt" | "proposalsCloseAt" | "salesOpenAt" | "salesCloseAt"
>;

type EditionPhase =
  | "upcoming"
  | "proposals"
  | "preparation"
  | "sales"
  | "closed";

// Each phase starts at one boundary and lasts until the next; before the first one the Edition is upcoming.
const phaseStarts = [
  ["proposals", "proposalsOpenAt"],
  ["preparation", "proposalsCloseAt"],
  ["sales", "salesOpenAt"],
  ["closed", "salesCloseAt"],
] as const satisfies readonly (readonly [EditionPhase, keyof EditionWindows])[];

export const editionPhase = (
  windows: EditionWindows,
  now: Date
): EditionPhase =>
  phaseStarts.findLast(([, boundary]) => now >= windows[boundary])?.[0] ??
  "upcoming";

export const editionPhaseLabels = {
  upcoming: "Próxima",
  proposals: "Propuestas abiertas",
  preparation: "Preparación",
  sales: "A la venta",
  closed: "Cerrada",
} as const satisfies Record<EditionPhase, string>;

const editionDatesInOrder = (windows: EditionWindows) =>
  windows.proposalsOpenAt < windows.proposalsCloseAt &&
  windows.proposalsCloseAt <= windows.salesOpenAt &&
  windows.salesOpenAt < windows.salesCloseAt;

// shortcut: Mexico City has used a fixed UTC-06:00 since it dropped DST in 2022; switch to Temporal once Workers ship it.
// `new Date` rolls an impossible day such as February 30 into March, so check the parts round-trip.
const isRealDateTime = (value: string) => {
  const [year, month, day, hour, minute] = value.split(/[-T:]/u).map(Number);

  return new Date(Date.UTC(year, month - 1, day, hour, minute))
    .toISOString()
    .startsWith(value);
};

const mexicoCityDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u, "Falta una fecha.")
  .refine(isRealDateTime, "Esa fecha no existe.")
  .transform((value) => new Date(`${value}:00-06:00`));

export const EDITION_NAME_MAX_LENGTH = 80;

export const editionInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Ponle nombre a la Edición.")
      .max(EDITION_NAME_MAX_LENGTH, "El nombre es demasiado largo."),
    proposalsOpenAt: mexicoCityDateTime,
    proposalsCloseAt: mexicoCityDateTime,
    salesOpenAt: mexicoCityDateTime,
    salesCloseAt: mexicoCityDateTime,
    registrationPriceMxn: z.coerce
      .number()
      .int("La Inscripción va en pesos enteros.")
      .positive("La Inscripción debe costar más de $0."),
  })
  .refine(editionDatesInOrder, {
    message:
      "Las fechas deben ir en orden: abren propuestas, cierran propuestas, abre la venta, cierra la venta.",
  });
