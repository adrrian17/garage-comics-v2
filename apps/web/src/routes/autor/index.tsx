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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@garage-comics/ui/components/table";
import { Link, createFileRoute } from "@tanstack/react-router";

import { getAuthorHome } from "@/functions/authors";
import { formatMxn, formatShortDateTime } from "@/lib/format";

const AuthorHome = () => {
  const { profile, registrations } = Route.useLoaderData();
  const { session } = Route.useRouteContext();

  return (
    <>
      <p className="text-muted-foreground text-sm">Hola {session?.user.name}</p>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-semibold">Mi página pública</h2>
          </CardTitle>
          <CardDescription>
            Así te encuentran los lectores.{" "}
            <Link to="/autor/perfil" className="underline">
              Edita tu perfil
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile === null ? (
            <p className="text-muted-foreground">
              Todavía no tienes una página pública.
            </p>
          ) : (
            <Link
              to="/autores/$slug"
              params={{ slug: profile.slug }}
              className="underline"
            >
              Ver la página de {profile.displayName}
            </Link>
          )}
        </CardContent>
      </Card>
      {/* An Admin is an Author without Registrations. */}
      {session?.user.role === "admin" ? null : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-base font-semibold">Mis Inscripciones</h2>
            </CardTitle>
            <CardDescription>
              Solo puedes vender en las Ediciones en las que tienes Inscripción.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Aún no tienes Inscripciones</EmptyTitle>
                  <EmptyDescription>
                    Aparecerán aquí cuando pagues una.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Edición</TableHead>
                    <TableHead>Inscrita el</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.editionName}</TableCell>
                      <TableCell>
                        {formatShortDateTime(item.registeredAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMxn(item.amountMxn)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export const Route = createFileRoute("/autor/")({
  loader: async () => await getAuthorHome(),
  head: () => ({ meta: [{ title: "Inicio · Garage Cómics" }] }),
  component: AuthorHome,
});
