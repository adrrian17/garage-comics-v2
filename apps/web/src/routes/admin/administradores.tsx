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
  Field,
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

import { inviteAdmin, listAdmins } from "@/functions/admins";
import { formatDate } from "@/lib/format";

const InviteAdminForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);

    const sent = await inviteAdmin({ data: { email } })
      .then(() => true)
      .catch(() => false);

    setIsPending(false);

    if (!sent) {
      toast.error("No pudimos mandar la invitación. Intenta de nuevo.");

      return;
    }

    toast.success(`Le mandamos un link para entrar a ${email}.`);
    setEmail("");
    await router.invalidate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Invitar Administrador</h2>
        </CardTitle>
        <CardDescription>
          Tendrá los mismos permisos que tú y recibirá un link para entrar.
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
              <FieldLabel htmlFor="email">Correo</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
              />
            </Field>
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Invitando…" : "Invitar"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

const AdminsPage = () => {
  const admins = Route.useLoaderData();

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Administradores</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Correo</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>{admin.email}</TableCell>
              <TableCell>{formatDate(admin.createdAt)}</TableCell>
              <TableCell>
                {admin.emailVerified ? (
                  <Badge variant="secondary">Activo</Badge>
                ) : (
                  <Badge variant="outline">Invitación enviada</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <InviteAdminForm />
    </section>
  );
};

export const Route = createFileRoute("/admin/administradores")({
  loader: async () => await listAdmins(),
  head: () => ({ meta: [{ title: "Administradores · Garage Cómics" }] }),
  component: AdminsPage,
});
