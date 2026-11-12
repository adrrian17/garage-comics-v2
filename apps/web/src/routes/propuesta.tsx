import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@garage-comics/ui/components/field";
import { Input } from "@garage-comics/ui/components/input";
import { Textarea } from "@garage-comics/ui/components/textarea";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { getActiveEdition } from "@/functions/editions";
import { submitProposal } from "@/functions/proposals";
import { formatDateTime } from "@/lib/format";
import {
  ABOUT_MAX_LENGTH,
  ABOUT_MIN_LENGTH,
  NAME_MAX_LENGTH,
} from "@/lib/proposal";

// Moves focus to the success heading so screen readers announce it.
const focusOnMount = (element: HTMLElement | null) => {
  element?.focus();
};

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
        <Field>
          <FieldLabel htmlFor="name">Nombre</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            maxLength={NAME_MAX_LENGTH}
            required
          />
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
        {failure === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Mandando…" : "Mandar propuesta"}
        </Button>
      </FieldGroup>
    </form>
  );
};

const headingClass = "text-3xl font-bold tracking-tight";

const Sent = ({ email }: { email: string }) => (
  <>
    <PartyPopper aria-hidden className="mb-4 size-8" />
    <h1
      ref={focusOnMount}
      tabIndex={-1}
      className={`${headingClass} outline-none`}
    >
      ¡Recibimos tu propuesta!
    </h1>
    <p className="text-muted-foreground mt-2">
      Cuando la revisemos te escribiremos a{" "}
      <strong className="text-foreground">{email}</strong>.
    </p>
  </>
);

const ClosedNotice = ({
  edition,
}: {
  edition: Awaited<ReturnType<typeof getActiveEdition>>;
}) => (
  <>
    <h1 className={headingClass}>Participa con tu cómic</h1>
    <p className="text-muted-foreground mt-2">
      No necesitas cuenta y no cuesta nada.
    </p>
    <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">
          {edition?.phase === "upcoming"
            ? "Las propuestas todavía no abren"
            : "Las propuestas están cerradas"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {edition?.phase === "upcoming"
            ? `Las propuestas para ${edition.name} abren el ${formatDateTime(edition.proposalsOpenAt)}.`
            : "Anunciaremos la próxima convocatoria en la página de inicio."}
        </p>
      </div>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Volver al inicio
      </Link>
    </div>
  </>
);

const ProposalPage = () => {
  const edition = Route.useLoaderData();
  const [sentTo, setSentTo] = useState<string>();

  const content = () => {
    if (edition?.phase !== "proposals") {
      return <ClosedNotice edition={edition} />;
    }

    if (sentTo !== undefined) {
      return <Sent email={sentTo} />;
    }

    return (
      <>
        <h1 className={headingClass}>Participa con tu cómic</h1>
        <p className="text-muted-foreground mt-2">
          Para {edition.name}. No necesitas cuenta y no cuesta nada. Recibimos
          propuestas hasta el {formatDateTime(edition.proposalsCloseAt)}.
        </p>
        <div className="mt-8">
          <ProposalForm editionName={edition.name} onSent={setSentTo} />
        </div>
      </>
    );
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">{content()}</main>
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
