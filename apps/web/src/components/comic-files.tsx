import { Field, FieldLabel } from "@garage-comics/ui/components/field";
import { Input } from "@garage-comics/ui/components/input";
import { useRouter } from "@tanstack/react-router";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import type { MyComic } from "@/components/comic-form";
import type { UploadKind } from "@/lib/comic";
import { uploadComicFile } from "@/lib/upload";

const BYTES_PER_MB = 1_000_000;

const kindCopy = {
  cover: { label: "Portada", accept: "image/png,image/jpeg,image/webp" },
  pdf: { label: "PDF", accept: "application/pdf" },
} as const satisfies Record<UploadKind, { label: string; accept: string }>;

const FileField = ({
  comic,
  kind,
  disabled,
}: {
  comic: MyComic;
  kind: UploadKind;
  disabled: boolean;
}) => {
  const router = useRouter();
  const inputId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const { label, accept } = kindCopy[kind];

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const [file] = input.files ?? [];

    if (file === undefined) {
      return;
    }

    setProgress(0);

    const result = await uploadComicFile(comic.id, kind, file, setProgress);

    setProgress(null);
    input.value = "";

    if (result.status === "failed") {
      toast.error(result.message);
    } else if (result.sentBackToReview) {
      toast.warning(
        "Guardamos el archivo. Como tu cómic estaba aprobado, volvió a revisión."
      );
    } else {
      toast.success("Subimos el archivo.");
    }

    await router.invalidate();
  };

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {kind === "cover" && comic.coverUrl !== null ? (
        <img
          src={comic.coverUrl}
          alt={`Portada de ${comic.title}`}
          className="h-40 w-fit rounded-md border object-contain"
        />
      ) : null}
      {kind === "pdf" && comic.pdfBytes !== null ? (
        <p className="text-muted-foreground text-sm">
          PDF subido ({(comic.pdfBytes / BYTES_PER_MB).toFixed(1)} MB).
        </p>
      ) : null}
      <Input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled || progress !== null}
        onChange={(event) => {
          void handleChange(event);
        }}
      />
      {progress === null ? null : (
        <progress
          className="w-full"
          aria-label={`Subiendo ${label}`}
          value={progress}
          max={1}
        />
      )}
    </Field>
  );
};

/** The cover and PDF pickers of a comic that already exists. Files upload on their own, not with the form. */
export const ComicFiles = ({
  comic,
  disabled,
}: {
  comic: MyComic;
  disabled: boolean;
}) => (
  <div className="flex flex-col gap-4">
    <FileField comic={comic} kind="cover" disabled={disabled} />
    <FileField comic={comic} kind="pdf" disabled={disabled} />
  </div>
);
