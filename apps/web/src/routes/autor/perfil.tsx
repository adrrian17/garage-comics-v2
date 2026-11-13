import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button } from "@garage-comics/ui/components/button";
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
import { Textarea } from "@garage-comics/ui/components/textarea";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { getAuthorProfile, saveAuthorProfile } from "@/functions/authors";
import { BIO_MAX_LENGTH, ROLE_MAX_LENGTH } from "@/lib/author";
import { NAME_MAX_LENGTH } from "@/lib/proposal";

type Profile = NonNullable<Awaited<ReturnType<typeof getAuthorProfile>>>;

const LinkField = ({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
}) => (
  <Field>
    <FieldLabel htmlFor={name}>{label}</FieldLabel>
    <Input
      id={name}
      name={name}
      type="url"
      inputMode="url"
      placeholder="https://"
      defaultValue={defaultValue ?? ""}
    />
  </Field>
);

const ProfileForm = ({ profile }: { profile: Profile }) => {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsPending(true);
    setFailure(null);

    const result = await saveAuthorProfile({ data }).catch(() => null);

    setIsPending(false);

    if (result?.status === "saved") {
      toast.success("Guardamos tu perfil.");
      await router.invalidate();

      return;
    }

    setFailure(
      result?.status === "invalid"
        ? (result.message ?? "Revisa los datos e intenta de nuevo.")
        : "No pudimos guardar tu perfil. Intenta de nuevo en un momento."
    );
  };

  return (
    <form
      className="max-w-2xl"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="displayName">Nombre público</FieldLabel>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            maxLength={NAME_MAX_LENGTH}
            defaultValue={profile.displayName}
            required
          />
          <FieldDescription>
            Es el nombre que verán los lectores en tu página.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="role">A qué te dedicas</FieldLabel>
          <Input
            id="role"
            name="role"
            maxLength={ROLE_MAX_LENGTH}
            placeholder="Guionista, ilustradora, colorista…"
            defaultValue={profile.role}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="bio">Sobre ti</FieldLabel>
          <Textarea
            id="bio"
            name="bio"
            rows={6}
            maxLength={BIO_MAX_LENGTH}
            defaultValue={profile.bio}
          />
        </Field>
        <LinkField
          name="instagramUrl"
          label="Instagram"
          defaultValue={profile.instagramUrl}
        />
        <LinkField name="xUrl" label="X" defaultValue={profile.xUrl} />
        <LinkField
          name="facebookUrl"
          label="Facebook"
          defaultValue={profile.facebookUrl}
        />
        <LinkField
          name="portfolioUrl"
          label="Portafolio"
          defaultValue={profile.portfolioUrl}
        />
        {failure === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-fit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar perfil"}
        </Button>
      </FieldGroup>
    </form>
  );
};

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

  return <ProfileForm profile={profile} />;
};

export const Route = createFileRoute("/autor/perfil")({
  loader: async () => await getAuthorProfile(),
  head: () => ({ meta: [{ title: "Perfil · Garage Cómics" }] }),
  component: ProfilePage,
});
