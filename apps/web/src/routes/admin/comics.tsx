import type { ComicStatus } from "@garage-comics/db/schema/comics";
import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
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
import { Field, FieldLabel } from "@garage-comics/ui/components/field";
import { Textarea } from "@garage-comics/ui/components/textarea";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { getComicsToReview, reviewComic } from "@/functions/comics-review";
import {
  REASON_MAX_LENGTH,
  canApply,
  comicStatusLabels,
  editionSlotLabels,
} from "@/lib/comic";
import type { Decision } from "@/lib/comic";
import { editionPhaseLabels } from "@/lib/edition";
import { formatMxn } from "@/lib/format";

type ReviewData = NonNullable<Awaited<ReturnType<typeof getComicsToReview>>>;

type ReviewComic = ReviewData["comics"][number];

type ReviewStatus = Exclude<ComicStatus, "draft">;

const BYTES_PER_MB = 1_000_000;

// The filter lives in the URL in Spanish; the server speaks in comic statuses.
const DEFAULT_SLUG = "en-revision";

const statusSlug = z.enum([DEFAULT_SLUG, "aprobados", "rechazados"]);

type StatusSlug = z.infer<typeof statusSlug>;

const statusFilters = {
  [DEFAULT_SLUG]: { status: "in_review", label: "En revisión" },
  aprobados: { status: "approved", label: "Aprobados" },
  rechazados: { status: "rejected", label: "Rechazados" },
} as const satisfies Record<
  StatusSlug,
  { status: ReviewStatus; label: string }
>;

const statusBadge = {
  draft: "outline",
  in_review: "secondary",
  approved: "default",
  rejected: "outline",
} as const satisfies Record<
  ComicStatus,
  NonNullable<Parameters<typeof badgeVariants>[0]>["variant"]
>;

const decisions = {
  approve: {
    label: "Aprobar",
    title: "¿Aprobar este cómic?",
    description: (comic: ReviewComic) =>
      `Le mandaremos un correo a ${comic.authorEmail}. Si cambia algo del cómic, volverá a revisión.`,
    done: "Cómic aprobado.",
  },
  reject: {
    label: "Rechazar",
    title: "¿Rechazar este cómic?",
    description: (comic: ReviewComic) =>
      `El motivo va en el correo que le mandaremos a ${comic.authorEmail}. Podrá corregir el cómic y enviarlo otra vez.`,
    done: "Cómic rechazado.",
  },
} as const satisfies Record<
  Decision,
  {
    label: string;
    title: string;
    description: (comic: ReviewComic) => string;
    done: string;
  }
>;

const DecideDialog = ({
  comic,
  decision,
}: {
  comic: ReviewComic;
  decision: Decision;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [reason, setReason] = useState("");
  const copy = decisions[decision];

  const confirm = async () => {
    setIsPending(true);

    const result = await reviewComic({
      data: { id: comic.id, revision: comic.revision, decision, reason },
    }).catch(() => null);

    setIsPending(false);
    setOpen(false);

    if (result === null) {
      toast.error("No pudimos guardar tu decisión. Intenta de nuevo.");
    } else if (result.status === "invalid") {
      toast.error(result.message ?? "Revisa tu decisión e intenta de nuevo.");
    } else if (result.status === "stale") {
      toast.error("Este cómic ya había cambiado. Actualizamos la lista.");
    } else if (result.status === "closed") {
      toast.error("La venta ya empezó: ya no se pueden decidir cómics.");
    } else if (result.notified) {
      setReason("");
      toast.success(copy.done);
    } else {
      setReason("");
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
          <Button variant={decision === "approve" ? "default" : "outline"} />
        }
      >
        {copy.label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.description(comic)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {decision === "reject" ? (
          <Field>
            <FieldLabel htmlFor={`reason-${comic.id}`}>
              Motivo del rechazo
            </FieldLabel>
            <Textarea
              id={`reason-${comic.id}`}
              rows={4}
              maxLength={REASON_MAX_LENGTH}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
            />
          </Field>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={
              isPending || (decision === "reject" && reason.trim() === "")
            }
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

const ComicCard = ({
  comic,
  canDecide,
}: {
  comic: ReviewComic;
  canDecide: boolean;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2>{comic.title}</h2>
      </CardTitle>
      <CardDescription className="break-all">
        {comic.authorName} (
        <a href={`mailto:${comic.authorEmail}`} className="underline">
          {comic.authorEmail}
        </a>
        ) · {editionSlotLabels[comic.slot]}
      </CardDescription>
      <CardAction>
        <Badge variant={statusBadge[comic.status]}>
          {comicStatusLabels[comic.status]}
        </Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        {comic.coverUrl === null ? null : (
          <img
            src={comic.coverUrl}
            alt={`Portada de ${comic.title}`}
            className="h-48 w-fit rounded-md border object-contain"
          />
        )}
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-line">{comic.description}</p>
          <p className="text-muted-foreground text-sm">
            {comic.genre} · {comic.pageCount} páginas declaradas ·{" "}
            {formatMxn(comic.priceMxn)}
          </p>
          {comic.collaborators.length === 0 ? null : (
            <ul className="text-sm">
              {comic.collaborators.map((collaborator) => (
                <li key={`${collaborator.name}-${collaborator.role}`}>
                  {collaborator.name} ({collaborator.role})
                  {collaborator.links.map((link) => (
                    <span key={link}>
                      {" · "}
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {new URL(link).hostname}
                      </a>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {comic.pdfUrl === null ? (
            <p className="text-muted-foreground text-sm">Sin PDF.</p>
          ) : (
            <a
              href={comic.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="w-fit text-sm underline"
            >
              Ver PDF ({((comic.pdfBytes ?? 0) / BYTES_PER_MB).toFixed(1)} MB)
            </a>
          )}
          {comic.status === "rejected" ? (
            <Alert>
              <AlertDescription>
                Motivo del rechazo: {comic.rejectionReason}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
    </CardContent>
    {canDecide && canApply(comic.status, "approve") ? (
      <CardFooter>
        <div className="flex flex-wrap gap-2">
          <DecideDialog comic={comic} decision="approve" />
          <DecideDialog comic={comic} decision="reject" />
        </div>
      </CardFooter>
    ) : null}
  </Card>
);

const StatusFilter = ({ current }: { current: StatusSlug }) => (
  <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
    {statusSlug.options.map((slug) => (
      <Link
        key={slug}
        to="/admin/comics"
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

const ComicsPage = () => {
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
            Activa una Edición para revisar sus cómics.{" "}
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
      {data.canDecide ? null : (
        <Alert>
          <AlertDescription>
            La venta ya empezó, así que ya no se pueden aprobar ni rechazar
            cómics.
          </AlertDescription>
        </Alert>
      )}
      <StatusFilter current={estado} />
      {data.comics.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay cómics aquí</EmptyTitle>
            <EmptyDescription>
              Ningún cómic de esta Edición está{" "}
              {statusFilters[estado].label.toLowerCase()}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.comics.map((comic) => (
            <li key={comic.id}>
              <ComicCard comic={comic} canDecide={data.canDecide} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const Route = createFileRoute("/admin/comics")({
  validateSearch: z.object({
    estado: statusSlug.catch(DEFAULT_SLUG).default(DEFAULT_SLUG),
  }),
  loaderDeps: ({ search }) => ({ estado: search.estado }),
  loader: async ({ deps }) =>
    await getComicsToReview({
      data: { status: statusFilters[deps.estado].status },
    }),
  head: () => ({ meta: [{ title: "Cómics · Garage Cómics" }] }),
  component: ComicsPage,
});
