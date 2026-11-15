import { createFileRoute } from "@tanstack/react-router";

import { AuthorComics } from "@/components/author-comics";
import { getMyComics } from "@/functions/comics";

const AdminComicsPage = () => (
  <>
    <p className="text-muted-foreground text-sm">
      Como Administrador también eres Autor: no necesitas Inscripción para
      preparar tus cómics.
    </p>
    <AuthorComics data={Route.useLoaderData()} />
  </>
);

export const Route = createFileRoute("/admin/mis-comics")({
  loader: async () => await getMyComics(),
  head: () => ({ meta: [{ title: "Mis cómics · Garage Cómics" }] }),
  component: AdminComicsPage,
});
