import { Link, createFileRoute } from "@tanstack/react-router";

import { AuthorProfileForm } from "@/components/author-profile-form";
import { getAuthorProfile } from "@/functions/authors";

const AdminProfilePage = () => {
  const profile = Route.useLoaderData();

  // The first visit creates the profile, so it is only missing if that insert lost a race; a reload fixes it.
  if (profile === null) {
    return (
      <p className="text-muted-foreground">
        No pudimos cargar tu perfil. Recarga la página.
      </p>
    );
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        Como Administrador también eres Autor.{" "}
        <Link
          to="/autores/$slug"
          params={{ slug: profile.slug }}
          className="underline"
        >
          Ver mi página pública
        </Link>
      </p>
      <AuthorProfileForm profile={profile} />
    </>
  );
};

export const Route = createFileRoute("/admin/perfil")({
  loader: async () => await getAuthorProfile(),
  head: () => ({ meta: [{ title: "Mi perfil · Garage Cómics" }] }),
  component: AdminProfilePage,
});
