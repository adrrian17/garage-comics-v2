import type { ProposalStatus } from "@garage-comics/db/schema/editions";
import { z } from "zod";

export const ACCEPTANCE_TTL_DAYS = 7;
const DAY_MS = 86_400_000;

/** Every allowed Proposal status change; anything not listed here is refused. */
export const proposalTransitions = {
  accept: { from: "pending", to: "accepted" },
  reject: { from: "pending", to: "rejected" },
  expire: { from: "accepted", to: "expired" },
  register: { from: "accepted", to: "registered" },
} as const satisfies Record<
  string,
  { from: ProposalStatus; to: ProposalStatus }
>;

type ProposalAction = keyof typeof proposalTransitions;

export const canApply = (status: ProposalStatus, action: ProposalAction) =>
  proposalTransitions[action].from === status;

/** A payment that arrives after the acceptance expired still registers: the money was already taken. */
export const registrableStatuses = [
  proposalTransitions.register.from,
  proposalTransitions.expire.to,
] as const;

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
  registered: "Inscrita",
} as const satisfies Record<ProposalStatus, string>;

// Stripe accepts a Checkout Session life of 30 minutes to 24 hours; each bound keeps a minute of margin for the request to arrive.
const CHECKOUT_MIN_LIFETIME_MS = 31 * 60_000;
const CHECKOUT_MAX_LIFETIME_MS = DAY_MS - 60_000;

/** When a Checkout Session should expire: at the acceptance deadline, within what Stripe allows. */
export const checkoutExpiresAt = (deadline: Date, now: Date) =>
  new Date(
    Math.min(
      Math.max(deadline.getTime(), now.getTime() + CHECKOUT_MIN_LIFETIME_MS),
      now.getTime() + CHECKOUT_MAX_LIFETIME_MS
    )
  );

/** A blank field becomes null; anything else must be an http(s) link. `subject` starts the error message. */
const optionalHttpUrl = (subject: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(
      z
        .url({
          protocol: /^https?$/u,
          error: `${subject} debe ser un link que empiece con http:// o https://`,
        })
        .nullable()
    );

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
  portfolioUrl: optionalHttpUrl("El portafolio"),
  about: z
    .string()
    .trim()
    .min(
      ABOUT_MIN_LENGTH,
      `Cuéntanos un poco más (mínimo ${ABOUT_MIN_LENGTH} caracteres).`
    )
    .max(ABOUT_MAX_LENGTH, `Usa como máximo ${ABOUT_MAX_LENGTH} caracteres.`),
});
