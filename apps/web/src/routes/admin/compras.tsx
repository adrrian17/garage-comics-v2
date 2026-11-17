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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import { Field, FieldLabel } from "@garage-comics/ui/components/field";
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
import { z } from "zod";

import { getPaidOrders, resendLink } from "@/functions/downloads";
import { formatShortDateTime } from "@/lib/format";
import { ORDER_SEARCH_MAX_LENGTH } from "@/lib/order-number";

type PaidOrder = Awaited<ReturnType<typeof getPaidOrders>>[number];

const ResendDownloadLink = ({ paidOrder }: { paidOrder: PaidOrder }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const confirm = async () => {
    setIsPending(true);

    const result = await resendLink({ data: { orderId: paidOrder.id } }).catch(
      () => null
    );

    setIsPending(false);
    setOpen(false);

    if (result === null) {
      toast.error("No pudimos reenviar el Link de descarga. Intenta de nuevo.");
    } else if (result.status === "not_paid") {
      toast.error("Esta Compra no está pagada.");
    } else if (result.notified) {
      toast.success(`Le mandamos a ${result.email} un nuevo Link de descarga.`);
    } else {
      toast.warning(
        `Creamos el Link de descarga, pero no pudimos mandar el correo a ${result.email}. Intenta de nuevo.`
      );
    }

    await router.invalidate();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Reenviar Link de descarga
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Reenviar el Link de descarga de {paidOrder.orderNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Le mandaremos a {paidOrder.email} un nuevo Link de descarga que
            funciona 24 horas, con sus PDF preparados de nuevo. Si su link
            anterior sigue vigente, funciona hasta que venza.
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
            {isPending ? "Reenviando…" : "Reenviar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const downloadLinkLabel = (link: PaidOrder["downloadLink"]) => {
  if (link === null) {
    return "Sin Link de descarga";
  }

  return link.open
    ? `Vigente hasta el ${formatShortDateTime(link.expiresAt)}`
    : `Venció el ${formatShortDateTime(link.expiresAt)}`;
};

const OrderSearch = ({ current }: { current: string | undefined }) => {
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(current ?? "");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const buscar = query.trim();

    void navigate({ search: buscar === "" ? {} : { buscar } });
  };

  return (
    <search>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Field className="max-w-sm">
          <FieldLabel htmlFor="buscar">Número de compra o correo</FieldLabel>
          <Input
            id="buscar"
            type="search"
            autoComplete="off"
            maxLength={ORDER_SEARCH_MAX_LENGTH}
            placeholder="GRG-1042 o ana@ejemplo.com"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </Field>
        <Button type="submit">Buscar</Button>
      </form>
    </search>
  );
};

const OrdersPage = () => {
  const paidOrders = Route.useLoaderData();
  const { buscar } = Route.useSearch();

  return (
    <section className="flex flex-col gap-6">
      <OrderSearch key={buscar} current={buscar} />
      {paidOrders.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay Compras aquí</EmptyTitle>
            <EmptyDescription>
              {buscar === undefined
                ? "Todavía no hay Compras pagadas."
                : "Ninguna Compra pagada tiene ese Número de compra o correo."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número de compra</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Edición</TableHead>
              <TableHead>Pagada</TableHead>
              <TableHead>Link de descarga</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paidOrders.map((paidOrder) => (
              <TableRow key={paidOrder.id}>
                <TableCell>{paidOrder.orderNumber}</TableCell>
                <TableCell className="break-all">{paidOrder.email}</TableCell>
                <TableCell>{paidOrder.editionName}</TableCell>
                <TableCell>{formatShortDateTime(paidOrder.paidAt)}</TableCell>
                <TableCell>
                  {downloadLinkLabel(paidOrder.downloadLink)}
                </TableCell>
                <TableCell>
                  <ResendDownloadLink paidOrder={paidOrder} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
};

export const Route = createFileRoute("/admin/compras")({
  validateSearch: z.object({ buscar: z.string().optional() }),
  loaderDeps: ({ search }) => ({ buscar: search.buscar }),
  loader: async ({ deps }) =>
    await getPaidOrders({ data: { search: deps.buscar } }),
  head: () => ({ meta: [{ title: "Compras · Garage Cómics" }] }),
  component: OrdersPage,
});
