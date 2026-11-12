import type { ProposalStatus } from "@garage-comics/db/schema/editions";
import { z } from "zod";

export const ACCEPTANCE_TTL_DAYS = 7;
const DAY_MS = 86_400_000;

/** Every allowed Proposal status change; anything not listed here is refused. */
export const proposalTransitions = {
  accept: { from: "pending", to: "accepted" },
  reject: { from: "pending", to: "rejected" },
  expire: { from: "accepted", to: "expired" },
} as const satisfies Record<
  string,
  { from: ProposalStatus; to: ProposalStatus }
>;

type ProposalAction = keyof typeof proposalTransitions;

export const canApply = (status: ProposalStatus, action: ProposalAction) =>
  proposalTransitions[action].from === status;

export const acceptanceDeadline = (acceptedAt: Date) =>
  new Date(acceptedAt.getTime() + ACCEPTANCE_TTL_DAYS * DAY_MS);

/** Acceptances given before this instant have run out at `now`. */
export const acceptanceCutoff = (now: Date) =>
  new Date(now.getTime() - ACCEPTANCE_TTL_DAYS * DAY_MS);

export const proposalStatusLabels = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "No aceptada",
  expired: "Vencida",
} as const satisfies Record<ProposalStatus, string>;

export const NAME_MAX_LENGTH = 120;
export const ABOUT_MIN_LENGTH = 20;
export const ABOUT_MAX_LENGTH = 2000;

export const proposalInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre.")
    .max(NAME_MAX_LENGTH, "Tu nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Escribe un correo válido.")),
  portfolioUrl: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(
      z
        .url({
          protocol: /^https?$/u,
          error: "El portafolio debe ser un link que empiece con https://",
        })
        .nullable()
    ),
  about: z
    .string()
    .trim()
    .min(
      ABOUT_MIN_LENGTH,
      `Cuéntanos un poco más (mínimo ${ABOUT_MIN_LENGTH} caracteres).`
    )
    .max(ABOUT_MAX_LENGTH),
});
