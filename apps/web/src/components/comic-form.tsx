import {
  COMIC_MIN_PRICE_MXN,
  EXCLUSIVE_PAGES,
} from "@garage-comics/db/schema/comics";
import type { Collaborator, ComicSlot } from "@garage-comics/db/schema/comics";
import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button } from "@garage-comics/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@garage-comics/ui/components/field";
import { Input } from "@garage-comics/ui/components/input";
import { Textarea } from "@garage-comics/ui/components/textarea";
import { useRouter } from "@tanstack/react-router";
import { useId, useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { createComic, updateComic } from "@/functions/comics";
import type { getMyComics } from "@/functions/comics";
import {
  COLLABORATORS_MAX,
  COLLABORATOR_NAME_MAX_LENGTH,
  COLLABORATOR_ROLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  GENRE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@/lib/comic";

type MyComics = Extract<
  Awaited<ReturnType<typeof getMyComics>>,
  { status: "ok" }
>;

export type MyComic = MyComics["comics"][number];

interface CollaboratorDraft {
  key: string;
  name: string;
  role: string;
  links: string;
}

const toDraft = ({ name, role, links }: Collaborator): CollaboratorDraft => ({
  key: crypto.randomUUID(),
  name,
  role,
  links: links.join("\n"),
});

const failures = {
  stale:
    "Este cómic cambió desde que abriste la página. La actualizamos: revisa y vuelve a intentar.",
  slot_taken: "Ya hay un cómic en este lugar. Actualizamos la página.",
  closed: "La venta ya empezó: ya no se pueden cambiar cómics.",
  no_edition: "No hay una Edición activa.",
  not_registered: "Necesitas una Inscripción en esta Edición.",
} as const;

export const ComicForm = ({
  slot,
  comic,
  disabled,
}: {
  slot: ComicSlot;
  comic: MyComic | undefined;
  disabled: boolean;
}) => {
  const router = useRouter();
  const formId = useId();
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [collaborators, setCollaborators] = useState(() =>
    (comic?.collaborators ?? []).map(toDraft)
  );

  const changeCollaborator = (
    key: string,
    change: Partial<CollaboratorDraft>
  ) => {
    setCollaborators((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item))
    );
  };

  const removeCollaborator = (key: string) => {
    setCollaborators((current) => current.filter((item) => item.key !== key));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const text = (name: string) => z.string().parse(form.get(name));

    const content = {
      title: text("title"),
      description: text("description"),
      genre: text("genre"),
      priceMxn: text("priceMxn"),
      pageCount: text("pageCount"),
      collaborators: collaborators.map(({ name, role, links }) => ({
        name,
        role,
        links: links.split("\n"),
      })),
    };

    setIsPending(true);
    setFailure(null);

    const result = await (
      comic === undefined
        ? createComic({ data: { ...content, slot } })
        : updateComic({
            data: { ...content, id: comic.id, revision: comic.revision },
          })
    ).catch(() => null);

    setIsPending(false);

    if (result === null) {
      setFailure(
        "No pudimos guardar tu cómic. Intenta de nuevo en un momento."
      );

      return;
    }

    if (result.status === "invalid") {
      setFailure(result.message ?? "Revisa los datos e intenta de nuevo.");

      return;
    }

    if (result.status === "created" || result.status === "saved") {
      if (result.status === "saved" && result.sentBackToReview) {
        toast.warning(
          "Guardamos tus cambios. Como tu cómic estaba aprobado, volvió a revisión."
        );
      } else {
        toast.success("Guardamos tu cómic.");
      }
    } else {
      // The page refreshes right after, which unmounts this form, so an inline message would vanish.
      toast.error(failures[result.status]);
    }

    await router.invalidate();
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${formId}-title`}>Título</FieldLabel>
          <Input
            id={`${formId}-title`}
            name="title"
            maxLength={TITLE_MAX_LENGTH}
            defaultValue={comic?.title}
            disabled={disabled}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${formId}-description`}>Descripción</FieldLabel>
          <Textarea
            id={`${formId}-description`}
            name="description"
            rows={5}
            maxLength={DESCRIPTION_MAX_LENGTH}
            defaultValue={comic?.description}
            disabled={disabled}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${formId}-genre`}>Género</FieldLabel>
          <Input
            id={`${formId}-genre`}
            name="genre"
            maxLength={GENRE_MAX_LENGTH}
            placeholder="Terror, aventura, ciencia ficción…"
            defaultValue={comic?.genre}
            disabled={disabled}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${formId}-priceMxn`}>Precio (MXN)</FieldLabel>
          <Input
            id={`${formId}-priceMxn`}
            name="priceMxn"
            type="number"
            inputMode="numeric"
            min={COMIC_MIN_PRICE_MXN}
            step={1}
            defaultValue={comic?.priceMxn}
            disabled={disabled}
            required
          />
          <FieldDescription>
            En pesos enteros, de ${COMIC_MIN_PRICE_MXN} en adelante.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${formId}-pageCount`}>Páginas</FieldLabel>
          <Input
            id={`${formId}-pageCount`}
            name="pageCount"
            type="number"
            inputMode="numeric"
            min={slot === "exclusive" ? EXCLUSIVE_PAGES.min : 1}
            max={slot === "exclusive" ? EXCLUSIVE_PAGES.max : undefined}
            step={1}
            defaultValue={comic?.pageCount}
            disabled={disabled}
            required
          />
          <FieldDescription>
            {slot === "exclusive"
              ? `El Exclusivo de la edición lleva de ${EXCLUSIVE_PAGES.min} a ${EXCLUSIVE_PAGES.max} páginas.`
              : "Un Trabajo previo puede tener cualquier número de páginas."}
          </FieldDescription>
        </Field>
        <FieldSet>
          <FieldLegend variant="label">Colaboradores</FieldLegend>
          <FieldDescription>
            Quienes trabajaron contigo. No necesitan cuenta ni reciben dinero de
            Garage Cómics.
          </FieldDescription>
          {collaborators.map((collaborator, index) => (
            <div
              key={collaborator.key}
              className="flex flex-col gap-3 rounded-lg border p-3"
            >
              <Field>
                <FieldLabel htmlFor={`${formId}-collaborator-${index}-name`}>
                  Nombre del Colaborador {index + 1}
                </FieldLabel>
                <Input
                  id={`${formId}-collaborator-${index}-name`}
                  maxLength={COLLABORATOR_NAME_MAX_LENGTH}
                  value={collaborator.name}
                  onChange={(event) => {
                    changeCollaborator(collaborator.key, {
                      name: event.target.value,
                    });
                  }}
                  disabled={disabled}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-collaborator-${index}-role`}>
                  Rol
                </FieldLabel>
                <Input
                  id={`${formId}-collaborator-${index}-role`}
                  maxLength={COLLABORATOR_ROLE_MAX_LENGTH}
                  placeholder="Color, letras, guion…"
                  value={collaborator.role}
                  onChange={(event) => {
                    changeCollaborator(collaborator.key, {
                      role: event.target.value,
                    });
                  }}
                  disabled={disabled}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-collaborator-${index}-links`}>
                  Links
                </FieldLabel>
                <Textarea
                  id={`${formId}-collaborator-${index}-links`}
                  rows={2}
                  placeholder="https://"
                  value={collaborator.links}
                  onChange={(event) => {
                    changeCollaborator(collaborator.key, {
                      links: event.target.value,
                    });
                  }}
                  disabled={disabled}
                />
                <FieldDescription>Uno por línea.</FieldDescription>
              </Field>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={disabled}
                onClick={() => {
                  removeCollaborator(collaborator.key);
                }}
              >
                Quitar Colaborador
              </Button>
            </div>
          ))}
          {collaborators.length < COLLABORATORS_MAX ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={disabled}
              onClick={() => {
                setCollaborators((current) => [
                  ...current,
                  toDraft({ name: "", role: "", links: [] }),
                ]);
              }}
            >
              Agregar Colaborador
            </Button>
          ) : null}
        </FieldSet>
        {failure === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          className="w-fit"
          disabled={disabled || isPending}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </FieldGroup>
    </form>
  );
};
