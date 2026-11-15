import { Badge } from "@garage-comics/ui/components/badge";
import { Button } from "@garage-comics/ui/components/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import type { getMyComics } from "@/functions/comics";
import { offerPast } from "@/functions/comics";
import { comicStatusLabels } from "@/lib/comic";

type PastComic = Extract<
  Awaited<ReturnType<typeof getMyComics>>,
  { status: "ok" }
>["past"][number];

const OfferButton = ({
  comic,
  disabled,
}: {
  comic: PastComic;
  disabled: boolean;
}) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const offer = async () => {
    setIsPending(true);

    const result = await offerPast({ data: { id: comic.id } }).catch(
      () => null
    );

    setIsPending(false);

    if (result?.status === "offered") {
      toast.success(
        result.approved
          ? `Ofreciste "${comic.title}". Sigue aprobado.`
          : `Agregamos "${comic.title}" como Trabajo previo. Envíalo a revisión cuando esté listo.`
      );
    } else if (result?.status === "slot_taken") {
      toast.error(
        "No quedan lugares de Trabajo previo, o ya ofreciste este cómic."
      );
    } else if (result?.status === "stale") {
      toast.error("Ese cómic ya no está disponible. Actualizamos la página.");
    } else if (result?.status === "closed") {
      toast.error("La venta ya empezó: ya no se pueden cambiar cómics.");
    } else {
      toast.error("No pudimos ofrecer el cómic. Intenta de nuevo.");
    }

    await router.invalidate();
  };

  return (
    <Button
      variant="outline"
      disabled={disabled || isPending}
      onClick={() => {
        void offer();
      }}
    >
      {isPending ? "Ofreciendo…" : "Ofrecer como Trabajo previo"}
    </Button>
  );
};

/** Comics from earlier Editions that can come back as a Previous Work. */
export const PastComics = ({
  past,
  canOffer,
}: {
  past: PastComic[];
  canOffer: boolean;
}) => (
  <section className="flex flex-col gap-4">
    <h2 className="text-base font-semibold">De ediciones anteriores</h2>
    <p className="text-muted-foreground text-sm">
      Ofrece como Trabajo previo un cómic que ya publicaste. Si ya estaba
      aprobado y no lo cambias, sigue aprobado.
    </p>
    {canOffer ? null : (
      <p className="text-muted-foreground text-sm">
        Ya usaste tus dos lugares de Trabajo previo.
      </p>
    )}
    <ul className="flex flex-col gap-4">
      {past.map((comic) => (
        <li key={comic.id}>
          <Card>
            <CardHeader>
              <CardTitle>
                <h3>{comic.title}</h3>
              </CardTitle>
              <CardDescription>
                {comic.editionName} · {comic.pageCount} páginas
              </CardDescription>
              <CardAction>
                <Badge variant="outline">
                  {comicStatusLabels[comic.status]}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter>
              <OfferButton comic={comic} disabled={!canOffer} />
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  </section>
);
