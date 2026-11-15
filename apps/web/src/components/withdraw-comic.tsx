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
import { Button } from "@garage-comics/ui/components/button";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import type { MyComic } from "@/components/comic-form";
import { removeComic } from "@/functions/comics";

/** Takes a comic out of this Edition, which frees its place; earlier Editions keep theirs. */
export const WithdrawComic = ({ comic }: { comic: MyComic }) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const withdraw = async () => {
    setIsPending(true);

    const result = await removeComic({
      data: { id: comic.id, revision: comic.revision },
    }).catch(() => null);

    setIsPending(false);

    if (result?.status === "withdrawn") {
      toast.success("Quitamos el cómic de esta Edición.");
    } else if (result?.status === "stale") {
      toast.error("Este cómic ya había cambiado. Actualizamos la página.");
    } else {
      toast.error("No pudimos quitar el cómic. Intenta de nuevo.");
    }

    await router.invalidate();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        Quitar de la Edición
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar este cómic de la Edición?</AlertDialogTitle>
          <AlertDialogDescription>
            Pierdes su estado de revisión en esta Edición y se libera su lugar.
            Sus archivos y las Ediciones anteriores no cambian.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              void withdraw();
            }}
          >
            {isPending ? "Quitando…" : "Quitar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
