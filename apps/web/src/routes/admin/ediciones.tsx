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
import { Button } from "@garage-comics/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@garage-comics/ui/components/field";
import { Input } from "@garage-comics/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@garage-comics/ui/components/table";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import {
  activateEdition,
  createEdition,
  listEditions,
} from "@/functions/editions";
import { EDITION_NAME_MAX_LENGTH, editionPhaseLabels } from "@/lib/edition";
import { formatMxn, formatShortDateTime } from "@/lib/format";

type Edition = Awaited<ReturnType<typeof listEditions>>[number];

const dateFields = [
  ["proposalsOpenAt", "Abren propuestas"],
  ["proposalsCloseAt", "Cierran propuestas"],
  ["salesOpenAt", "Abre la venta"],
  ["salesCloseAt", "Cierra la venta"],
] as const;

const CreateEditionForm = () => {
  const router = useRouter();
  const [failure, setFailure] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsPending(true);

    const result = await createEdition({ data: new FormData(form) }).catch(
      () => null
    );

    setIsPending(false);

    if (result === null) {
      setFailure("No pudimos crear la Edición. Intenta de nuevo.");

      return;
    }

    if (result.status === "invalid") {
      setFailure(result.message ?? "Revisa los datos e intenta de nuevo.");

      return;
    }

    setFailure(undefined);
    form.reset();
    toast.success("Edición creada.");
    await router.invalidate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Nueva Edición</h2>
        </CardTitle>
        <CardDescription>
          Horas de la Ciudad de México. Se crea inactiva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="Edición 2027"
                maxLength={EDITION_NAME_MAX_LENGTH}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {dateFields.map(([name, label]) => (
                <Field key={name}>
                  <FieldLabel htmlFor={name}>{label}</FieldLabel>
                  <Input id={name} name={name} type="datetime-local" required />
                </Field>
              ))}
            </div>
            <Field>
              <FieldLabel htmlFor="registrationPriceMxn">
                Precio de la Inscripción (MXN)
              </FieldLabel>
              <Input
                id="registrationPriceMxn"
                name="registrationPriceMxn"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
              />
              <FieldDescription>
                En pesos enteros. Debe cubrir los costos de Stripe Connect por
                Autor.
              </FieldDescription>
            </Field>
            {failure === undefined ? null : (
              <Alert variant="destructive">
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Creando…" : "Crear Edición"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

const ActivateEdition = ({ edition }: { edition: Edition }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const confirm = async () => {
    setIsPending(true);

    const activated = await activateEdition({ data: { id: edition.id } })
      .then(() => true)
      .catch(() => false);

    setIsPending(false);
    setOpen(false);

    if (!activated) {
      toast.error("No pudimos activar la Edición. Intenta de nuevo.");

      return;
    }

    toast.success(`${edition.name} es la Edición activa.`);
    await router.invalidate();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Activar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Activar {edition.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Solo una Edición puede estar activa. La página de inicio y las
            propuestas pasarán a usar esta.
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
            {isPending ? "Activando…" : "Activar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const EditionsTable = ({ editions }: { editions: Edition[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Edición</TableHead>
        <TableHead>Fase</TableHead>
        <TableHead>Propuestas</TableHead>
        <TableHead>Venta</TableHead>
        <TableHead className="text-right">Inscripción</TableHead>
        <TableHead>
          <span className="sr-only">Activa</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {editions.map((edition) => (
        <TableRow key={edition.id}>
          <TableCell>{edition.name}</TableCell>
          <TableCell>{editionPhaseLabels[edition.phase]}</TableCell>
          <TableCell className="whitespace-nowrap">
            {formatShortDateTime(edition.proposalsOpenAt)} –{" "}
            {formatShortDateTime(edition.proposalsCloseAt)}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {formatShortDateTime(edition.salesOpenAt)} –{" "}
            {formatShortDateTime(edition.salesCloseAt)}
          </TableCell>
          <TableCell className="text-right">
            {formatMxn(edition.registrationPriceMxn)}
          </TableCell>
          <TableCell className="text-right">
            {edition.isActive ? (
              <Badge>Activa</Badge>
            ) : (
              <ActivateEdition edition={edition} />
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const EditionsPage = () => {
  const editions = Route.useLoaderData();

  return (
    <section className="flex flex-col gap-6">
      {editions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Todavía no hay Ediciones</EmptyTitle>
            <EmptyDescription>
              Crea la primera con el formulario de abajo y luego actívala.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <EditionsTable editions={editions} />
      )}
      <CreateEditionForm />
    </section>
  );
};

export const Route = createFileRoute("/admin/ediciones")({
  loader: async () => await listEditions(),
  head: () => ({ meta: [{ title: "Ediciones · Garage Cómics" }] }),
  component: EditionsPage,
});
