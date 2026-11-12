import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button } from "@garage-comics/ui/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@garage-comics/ui/components/field";
import { Input } from "@garage-comics/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

// Moves focus to the confirmation heading so screen readers announce it.
const focusOnMount = (element: HTMLElement | null) => {
  element?.focus();
};

// Better Auth appends `?error=<code>` when a magic link fails.
const linkErrorMessage = (code: string) =>
  code === "new_user_signup_disabled"
    ? "Ese correo no tiene cuenta en Garage Cómics."
    : "Ese link ya venció o ya se usó. Pide uno nuevo.";

const headingClass = "text-3xl font-bold tracking-tight";

const CheckEmail = ({
  email,
  onRetry,
}: {
  email: string;
  onRetry: () => void;
}) => (
  <>
    <MailCheck aria-hidden className="mb-4 size-8" />
    <h1
      ref={focusOnMount}
      tabIndex={-1}
      className={`${headingClass} outline-none`}
    >
      Revisa tu correo
    </h1>
    <p className="text-muted-foreground mt-2">
      Te mandamos un link a <strong className="text-foreground">{email}</strong>
      . Ábrelo en este dispositivo para entrar. Vence en 5 minutos.
    </p>
    <Button variant="outline" className="mt-8 w-full" onClick={onRetry}>
      Usar otro correo
    </Button>
  </>
);

const SignInPage = () => {
  const { error } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);

    const sent = await authClient.signIn
      .magicLink({
        email,
        callbackURL: "/admin",
        errorCallbackURL: "/entrar",
      })
      .then((result) => result.error === null)
      .catch(() => false);

    setIsPending(false);

    if (!sent) {
      toast.error("No pudimos mandar el link. Intenta de nuevo en un momento.");

      return;
    }

    setSentTo(email);
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      {sentTo === undefined ? (
        <>
          <h1 className={headingClass}>Entrar</h1>
          <p className="text-muted-foreground mt-2">
            Sin contraseñas: te mandamos un link a tu correo.
          </p>
          <form
            className="mt-8"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <FieldGroup>
              {error === undefined ? null : (
                <Alert variant="destructive">
                  <AlertDescription>{linkErrorMessage(error)}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="email">Correo</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                />
              </Field>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Mandando…" : "Mandarme el link"}
              </Button>
            </FieldGroup>
          </form>
        </>
      ) : (
        <CheckEmail
          email={sentTo}
          onRetry={() => {
            setSentTo(undefined);
          }}
        />
      )}
    </main>
  );
};

export const Route = createFileRoute("/entrar")({
  validateSearch: z.object({ error: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Entrar · Garage Cómics" },
      {
        name: "description",
        content: "Entra a Garage Cómics con un link en tu correo.",
      },
    ],
  }),
  component: SignInPage,
});
