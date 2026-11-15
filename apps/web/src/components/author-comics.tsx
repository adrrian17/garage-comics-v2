import { comicSlots } from "@garage-comics/db/schema/comics";
import type { ComicSlot, ComicStatus } from "@garage-comics/db/schema/comics";
import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Badge } from "@garage-comics/ui/components/badge";
import type { badgeVariants } from "@garage-comics/ui/components/badge";
import { Button } from "@garage-comics/ui/components/button";
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
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ComicFiles } from "@/components/comic-files";
import { ComicForm } from "@/components/comic-form";
import type { MyComic } from "@/components/comic-form";
import { PastComics } from "@/components/past-comics";
import { WithdrawComic } from "@/components/withdraw-comic";
import { submitComic } from "@/functions/comics";
import type { getMyComics } from "@/functions/comics";
import {
  EXCLUSIVE_PAGES,
  canApply,
  comicStatusLabels,
  editionSlotLabels,
  freePreviousSlot,
} from "@/lib/comic";
import { editionPhaseLabels } from "@/lib/edition";

const statusBadge = {
  draft: "outline",
  in_review: "secondary",
  approved: "default",
  rejected: "outline",
} as const satisfies Record<
  ComicStatus,
  NonNullable<Parameters<typeof badgeVariants>[0]>["variant"]
>;

const slotHints = {
  exclusive: `El cómic nuevo de esta Edición, de ${EXCLUSIVE_PAGES.min} a ${EXCLUSIVE_PAGES.max} páginas.`,
  previous_1:
    "Un cómic que ya publicaste, de cualquier extensión. Puedes ofrecer hasta dos.",
  previous_2:
    "Un cómic que ya publicaste, de cualquier extensión. Puedes ofrecer hasta dos.",
} as const satisfies Record<ComicSlot, string>;

const SubmitButton = ({ comic }: { comic: MyComic }) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const submit = async () => {
    setIsPending(true);

    const result = await submitComic({
      data: { id: comic.id, revision: comic.revision },
    }).catch(() => null);

    setIsPending(false);

    if (result?.status === "submitted") {
      toast.success("Enviamos tu cómic a revisión.");
    } else if (result?.status === "incomplete") {
      toast.error("Falta la portada o el PDF.");
    } else if (result?.status === "stale") {
      toast.error("Este cómic ya había cambiado. Actualizamos la página.");
    } else {
      toast.error("No pudimos enviar tu cómic. Intenta de nuevo.");
    }

    await router.invalidate();
  };

  return (
    <Button
      disabled={isPending}
      onClick={() => {
        void submit();
      }}
    >
      {isPending ? "Enviando…" : "Enviar a revisión"}
    </Button>
  );
};

const SlotCard = ({
  slot,
  comic,
  canEdit,
}: {
  slot: ComicSlot;
  comic: MyComic | undefined;
  canEdit: boolean;
}) => {
  const [isCreating, setIsCreating] = useState(false);

  if (comic === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{editionSlotLabels[slot]}</h2>
          </CardTitle>
          <CardDescription>{slotHints[slot]}</CardDescription>
        </CardHeader>
        <CardContent>
          {isCreating ? (
            <ComicForm slot={slot} comic={undefined} disabled={!canEdit} />
          ) : (
            <Button
              variant="outline"
              disabled={!canEdit}
              onClick={() => {
                setIsCreating(true);
              }}
            >
              {slot === "exclusive" ? "Crear Exclusivo" : "Agregar cómic"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const hasFiles = comic.coverKey !== null && comic.pdfKey !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{comic.title}</h2>
        </CardTitle>
        <CardDescription>{editionSlotLabels[slot]}</CardDescription>
        <CardAction>
          <Badge variant={statusBadge[comic.status]}>
            {comicStatusLabels[comic.status]}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {comic.status === "rejected" ? (
            <Alert variant="destructive">
              <AlertDescription>
                Motivo del rechazo: {comic.rejectionReason}
              </AlertDescription>
            </Alert>
          ) : null}
          {comic.status === "approved" && canEdit ? (
            <Alert>
              <AlertDescription>
                Si guardas cambios o subes otro archivo en un cómic aprobado,
                vuelve a revisión.
              </AlertDescription>
            </Alert>
          ) : null}
          <ComicFiles comic={comic} disabled={!canEdit} />
          {/* Keyed by the form's own fields: attaching a file bumps the revision and must not discard unsaved edits. */}
          <ComicForm
            key={JSON.stringify([
              comic.title,
              comic.description,
              comic.genre,
              comic.priceMxn,
              comic.pageCount,
              comic.collaborators,
            ])}
            slot={slot}
            comic={comic}
            disabled={!canEdit}
          />
        </div>
      </CardContent>
      {canEdit ? (
        <CardFooter>
          <div className="flex flex-wrap items-center gap-2">
            {canApply(comic.status, "submit") && hasFiles ? (
              <SubmitButton comic={comic} />
            ) : null}
            <WithdrawComic comic={comic} />
            {canApply(comic.status, "submit") && !hasFiles ? (
              <p className="text-muted-foreground text-sm">
                Sube la portada y el PDF para enviarlo a revisión.
              </p>
            ) : null}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
};

type MyComics = Awaited<ReturnType<typeof getMyComics>>;

/** The comics of the active Edition for one Author, shared by the Author area and an Admin's own comics. */
export const AuthorComics = ({ data }: { data: MyComics }) => {
  if (data.status === "no_edition") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No hay una Edición activa</EmptyTitle>
          <EmptyDescription>
            Cuando haya una, aquí prepararás tus cómics.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (data.status === "not_registered") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Aún no tienes Inscripción en esta Edición</EmptyTitle>
          <EmptyDescription>
            Solo puedes subir cómics a una Edición en la que tienes Inscripción.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        {data.edition.name} · {editionPhaseLabels[data.phase]}
      </p>
      {data.canEdit ? null : (
        <Alert>
          <AlertDescription>
            La venta ya empezó, así que ya no se pueden cambiar cómics en esta
            Edición.
          </AlertDescription>
        </Alert>
      )}
      <ul className="flex flex-col gap-4">
        {comicSlots.map((slot) => (
          <li key={slot}>
            <SlotCard
              slot={slot}
              comic={data.comics.find((item) => item.slot === slot)}
              canEdit={data.canEdit}
            />
          </li>
        ))}
      </ul>
      {data.past.length === 0 ? null : (
        <PastComics
          past={data.past}
          canOffer={
            data.canEdit &&
            freePreviousSlot(data.comics.map((item) => item.slot)) !== null
          }
        />
      )}
    </section>
  );
};
