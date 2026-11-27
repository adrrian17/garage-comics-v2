import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button } from "@garage-comics/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@garage-comics/ui/components/field";
import { Input } from "@garage-comics/ui/components/input";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { startCheckout } from "@/functions/checkout";
import { checkoutInput } from "@/lib/checkout";

/** Asks for the Customer's email and sends them to Stripe to pay. `onChanged` receives the comics that stopped being on sale. */
export const CheckoutForm = ({
  ids,
  onChanged,
}: {
  ids: string[];
  onChanged: (dropped: string[]) => void;
}) => {
  const [failure, setFailure] = useState<string | null>(null);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailure(null);
    setEmailInvalid(false);

    const input = checkoutInput.safeParse({
      ids,
      email: new FormData(event.currentTarget).get("email"),
    });

    if (!input.success) {
      const [issue] = input.error.issues;

      setFailure(issue?.message ?? "Revisa tus datos.");
      setEmailInvalid(issue?.path[0] === "email");

      return;
    }

    setIsPending(true);

    const result = await startCheckout({ data: input.data }).catch(() => null);

    if (result?.status === "redirect") {
      // Stays pending: the browser is already on its way to Stripe.
      window.location.assign(result.url);

      return;
    }

    setIsPending(false);

    if (result?.status === "changed") {
      onChanged(result.dropped);
      setFailure(
        "Cambió lo que hay a la venta. Revisa tu carrito y vuelve a pagar."
      );
    } else if (result?.status === "closed") {
      setFailure("La venta ya cerró, así que no pudimos abrir el pago.");
    } else {
      setFailure("No pudimos abrir el pago. Intenta de nuevo en un momento.");
    }
  };

  return (
    <form
      className="mt-6 flex flex-col gap-4 border-t pt-6"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <Field data-invalid={emailInvalid || undefined}>
        <FieldLabel htmlFor="email">Tu correo</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={emailInvalid || undefined}
        />
        <FieldDescription>
          Ahí te mandamos tu Número de compra y tus cómics. Revisa que esté bien
          escrito.
        </FieldDescription>
      </Field>
      {failure === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || ids.length === 0}
      >
        {isPending ? "Abriendo el pago…" : "Pagar con tarjeta u OXXO"}
      </Button>
    </form>
  );
};
