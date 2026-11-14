import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import { createFileRoute } from "@tanstack/react-router";

import { AuthorProfileForm } from "@/components/author-profile-form";
import { getAuthorProfile } from "@/functions/authors";

const ProfilePage = () => {
  const profile = Route.useLoaderData();

  if (profile === null) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Aún no tienes perfil</EmptyTitle>
          <EmptyDescription>
            Se crea cuando pagas tu primera Inscripción.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <AuthorProfileForm profile={profile} />;
};

export const Route = createFileRoute("/autor/perfil")({
  loader: async () => await getAuthorProfile(),
  head: () => ({ meta: [{ title: "Perfil · Garage Cómics" }] }),
  component: ProfilePage,
});
