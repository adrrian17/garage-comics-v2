import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@garage-comics/ui/components/field";
import { Input } from "@garage-comics/ui/components/input";
import { Textarea } from "@garage-comics/ui/components/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { getActiveEdition } from "@/functions/editions";
import { submitProposal } from "@/functions/proposals";
import { formatDateTime } from "@/lib/format";
import { ABOUT_MAX_LENGTH, ABOUT_MIN_LENGTH } from "@/lib/proposal";

// A thrown request (offline, server down) becomes a result so the form can say so.
const failed = { status: "error" } as const;

type SubmitResult = Awaited<ReturnType<typeof submitProposal>> | typeof failed;

const failureMessage = (result: SubmitResult, editionName: string) => {
  switch (result.status) {
    case "invalid": {
      return result.message ?? "Revisa los datos e intenta de nuevo.";
    }

    case "duplicate": {
      return `Ya tienes una propuesta abierta para ${editionName} con este correo. Te escribiremos en cuanto la revisemos.`;
    }

    case "closed": {
      return "Las propuestas para esta Edición ya cerraron.";
    }

    case "error": {
      return "No pudimos mandar tu propuesta. Intenta de nuevo en un momento.";
    }

    case "sent": {
      return null;
    }

    default: {
      return result satisfies never;
    }
  }
};

const ProposalForm = ({
  editionName,
  onSent,
}: {
  editionName: string;
  onSent: (email: string) => void;
}) => {
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsPending(true);

    const result: SubmitResult = await submitProposal({ data }).catch(
      () => failed
    );

    setIsPending(false);

    if (result.status === "sent") {
      onSent(result.email);

      return;
    }

    setFailure(failureMessage(result, editionName));
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <FieldGroup>
        {failure === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="name">Nombre</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Correo</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <FieldDescription>
            Aquí te avisamos si tu propuesta fue aceptada.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="portfolioUrl">Portafolio (opcional)</FieldLabel>
          <Input
            id="portfolioUrl"
            name="portfolioUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
          />
          <FieldDescription>
            Tu sitio, Instagram o cualquier link donde veamos tu trabajo.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="about">Cuéntanos de ti y de tu cómic</FieldLabel>
          <Textarea
            id="about"
            name="about"
            rows={6}
            minLength={ABOUT_MIN_LENGTH}
            maxLength={ABOUT_MAX_LENGTH}
            required
          />
          <FieldDescription>
            Qué haces, qué cómic quieres vender y cualquier cosa que debamos
            saber.
          </FieldDescription>
        </Field>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Mandando…" : "Mandar propuesta"}
        </Button>
      </FieldGroup>
    </form>
  );
};

const Sent = ({ email }: { email: string }) => (
  <CardHeader>
    <PartyPopper aria-hidden className="text-primary mb-2 size-8" />
    <CardTitle>
      <h1>¡Recibimos tu propuesta!</h1>
    </CardTitle>
    <CardDescription>
      Te mandamos una confirmación a <strong>{email}</strong>. Cuando la
      revisemos te escribiremos a ese mismo correo.
    </CardDescription>
  </CardHeader>
);

const ProposalPage = () => {
  const edition = Route.useLoaderData();
  const [sentTo, setSentTo] = useState<string>();

  if (edition?.phase !== "proposals") {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12 sm:py-20">
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>
                {edition?.phase === "upcoming"
                  ? "Las propuestas todavía no abren"
                  : "Las propuestas están cerradas"}
              </h1>
            </CardTitle>
            <CardDescription>
              {edition?.phase === "upcoming"
                ? `Las propuestas para ${edition.name} abren el ${formatDateTime(edition.proposalsOpenAt)}.`
                : "Anunciaremos la próxima convocatoria en la página de inicio."}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:py-20">
      <Card>
        {sentTo === undefined ? (
          <>
            <CardHeader>
              <CardTitle>
                <h1>Manda tu propuesta</h1>
              </CardTitle>
              <CardDescription>
                Para {edition.name}. No necesitas cuenta y no cuesta nada.
                Recibimos propuestas hasta el{" "}
                {formatDateTime(edition.proposalsCloseAt)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProposalForm editionName={edition.name} onSent={setSentTo} />
            </CardContent>
          </>
        ) : (
          <Sent email={sentTo} />
        )}
      </Card>
    </main>
  );
};

export const Route = createFileRoute("/propuesta")({
  loader: async () => await getActiveEdition(),
  head: () => ({
    meta: [
      { title: "Manda tu propuesta · Garage Cómics" },
      {
        name: "description",
        content:
          "Manda tu propuesta para vender tus cómics en la próxima Edición de Garage Cómics. No necesitas cuenta y no cuesta nada.",
      },
    ],
  }),
  component: ProposalPage,
});
