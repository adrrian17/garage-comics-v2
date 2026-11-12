import type { ProposalStatus } from "@garage-comics/db/schema/editions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@garage-comics/ui/components/alert-dialog";
import { Badge } from "@garage-comics/ui/components/badge";
import type { badgeVariants } from "@garage-comics/ui/components/badge";
import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { decideProposal, listProposals } from "@/functions/proposals";
import { editionPhaseLabels } from "@/lib/edition";
import { formatDateTime } from "@/lib/format";
import {
  ACCEPTANCE_TTL_DAYS,
  acceptanceDeadline,
  canApply,
  proposalStatusLabels,
} from "@/lib/proposal";

type Proposals = NonNullable<Awaited<ReturnType<typeof listProposals>>>;

type Proposal = Proposals["proposals"][number];

// The filter lives in the URL in Spanish; the server speaks in Proposal statuses.
const statusSlug = z.enum([
  "pendientes",
  "aceptadas",
  "no-aceptadas",
  "vencidas",
  "inscritas",
]);

type StatusSlug = z.infer<typeof statusSlug>;

const statusFilters = {
  pendientes: { status: "pending", label: "Pendientes" },
  aceptadas: { status: "accepted", label: "Aceptadas" },
  "no-aceptadas": { status: "rejected", label: "No aceptadas" },
  vencidas: { status: "expired", label: "Vencidas" },
  inscritas: { status: "registered", label: "Inscritas" },
} as const satisfies Record<
  StatusSlug,
  { status: ProposalStatus; label: string }
>;

const statusBadge = {
  pending: "secondary",
  accepted: "default",
  rejected: "outline",
  expired: "outline",
  registered: "default",
} as const satisfies Record<
  ProposalStatus,
  NonNullable<Parameters<typeof badgeVariants>[0]>["variant"]
>;

const decisions = {
  accept: {
    label: "Aceptar",
    title: "¿Aceptar esta propuesta?",
    description: (proposal: Proposal) =>
      `Le mandaremos un correo a ${proposal.email}. Tendrá ${ACCEPTANCE_TTL_DAYS} días para pagar su Inscripción.`,
    done: "Propuesta aceptada.",
  },
  reject: {
    label: "No aceptar",
    title: "¿No aceptar esta propuesta?",
    description: (proposal: Proposal) =>
      `Le mandaremos un correo a ${proposal.email} sin dar motivos. Podrá mandar otra propuesta.`,
    done: "Propuesta no aceptada.",
  },
} as const;

type Decision = keyof typeof decisions;

const ConfirmDecision = ({
  proposal,
  decision,
}: {
  proposal: Proposal;
  decision: Decision;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const copy = decisions[decision];

  const confirm = async () => {
    setIsPending(true);

    const result = await decideProposal({
      data: { id: proposal.id, decision },
    }).catch(() => null);

    setIsPending(false);
    setOpen(false);

    if (result === null) {
      toast.error("No pudimos guardar tu decisión. Intenta de nuevo.");
    } else if (result.status === "stale") {
      toast.error("Esta propuesta ya había cambiado. Actualizamos la lista.");
    } else if (result.notified) {
      toast.success(copy.done);
    } else {
      toast.warning(
        `Guardamos tu decisión, pero no pudimos mandar el correo. Escríbele a ${result.email}.`
      );
    }

    await router.invalidate();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant={decision === "accept" ? "default" : "outline"} />
        }
      >
        {copy.label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.description(proposal)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              void confirm();
            }}
          >
            {isPending ? "Guardando…" : copy.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ProposalCard = ({ proposal }: { proposal: Proposal }) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2>{proposal.name}</h2>
      </CardTitle>
      <CardDescription className="break-all">
        <a href={`mailto:${proposal.email}`} className="underline">
          {proposal.email}
        </a>
        {proposal.portfolioUrl === null ? null : (
          <>
            {" · "}
            <a
              href={proposal.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Portafolio
            </a>
          </>
        )}
      </CardDescription>
      <CardAction>
        <Badge variant={statusBadge[proposal.status]}>
          {proposalStatusLabels[proposal.status]}
        </Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p className="whitespace-pre-line">{proposal.about}</p>
      <p className="text-muted-foreground mt-3 text-sm">
        Recibida el {formatDateTime(proposal.createdAt)}
        {proposal.status === "accepted" && proposal.acceptedAt !== null ? (
          <>
            {" · "}
            <strong className="text-foreground">
              Paga su Inscripción antes del{" "}
              {formatDateTime(acceptanceDeadline(proposal.acceptedAt))}
            </strong>
          </>
        ) : null}
      </p>
    </CardContent>
    {canApply(proposal.status, "accept") ? (
      <CardFooter>
        <div className="flex flex-wrap gap-2">
          <ConfirmDecision proposal={proposal} decision="accept" />
          <ConfirmDecision proposal={proposal} decision="reject" />
        </div>
      </CardFooter>
    ) : null}
  </Card>
);

const StatusFilter = ({ current }: { current: StatusSlug | undefined }) => (
  <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
    <Link
      to="/admin/propuestas"
      search={{}}
      aria-current={current === undefined ? "page" : undefined}
      className={buttonVariants({
        variant: current === undefined ? "default" : "outline",
        size: "sm",
      })}
    >
      Todas
    </Link>
    {statusSlug.options.map((slug) => (
      <Link
        key={slug}
        to="/admin/propuestas"
        search={{ estado: slug }}
        aria-current={current === slug ? "page" : undefined}
        className={buttonVariants({
          variant: current === slug ? "default" : "outline",
          size: "sm",
        })}
      >
        {statusFilters[slug].label}
      </Link>
    ))}
  </nav>
);

const ProposalsPage = () => {
  const data = Route.useLoaderData();
  const { estado } = Route.useSearch();

  if (data === null) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <h2>No hay una Edición activa</h2>
          </EmptyTitle>
          <EmptyDescription>
            Activa una Edición para ver sus propuestas.{" "}
            <Link to="/admin/ediciones">Ir a Ediciones</Link>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        {data.edition.name} · {editionPhaseLabels[data.edition.phase]}
      </p>
      <StatusFilter current={estado} />
      {data.proposals.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay propuestas aquí</EmptyTitle>
            <EmptyDescription>
              {estado === undefined
                ? "Todavía nadie manda una propuesta para esta Edición."
                : "Ninguna propuesta tiene este estado."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.proposals.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard proposal={proposal} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const Route = createFileRoute("/admin/propuestas")({
  validateSearch: z.object({
    estado: statusSlug.optional(),
  }),
  loaderDeps: ({ search }) => ({ estado: search.estado }),
  loader: async ({ deps }) =>
    await listProposals({
      data: {
        status:
          deps.estado === undefined
            ? undefined
            : statusFilters[deps.estado].status,
      },
    }),
  head: () => ({ meta: [{ title: "Propuestas · Garage Cómics" }] }),
  component: ProposalsPage,
});
