import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  getRegistrationOffer,
  startRegistrationCheckout,
} from "@/functions/registrations";
import { formatDateTime, formatMxn } from "@/lib/format";

type Offer = Awaited<ReturnType<typeof getRegistrationOffer>>;

const headingClass = "text-3xl font-bold tracking-tight";

const Heading = ({ children }: { children: string }) => (
  <h1 className={headingClass}>{children}</h1>
);

const CheckEmail = () => (
  <>
    <MailCheck aria-hidden className="mb-4 size-8" />
    <Heading>Revisa tu correo</Heading>
    <p className="text-muted-foreground mt-2">
      Estamos confirmando tu pago. En unos minutos te mandaremos un link para
      entrar a Garage Cómics y armar tu perfil.
    </p>
  </>
);

const Pay = ({
  proposalId,
  offer,
}: {
  proposalId: string;
  offer: Extract<Offer, { status: "payable" }>;
}) => {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const pay = async () => {
    setIsPending(true);
    setFailure(null);

    const result = await startRegistrationCheckout({
      data: { proposalId },
    }).catch(() => null);

    if (result?.status === "checkout") {
      // Stays pending: the browser is already on its way to Stripe.
      window.location.assign(result.url);

      return;
    }

    setIsPending(false);

    if (result?.status === "unavailable") {
      await router.invalidate();

      return;
    }

    setFailure("No pudimos abrir el pago. Intenta de nuevo en un momento.");
  };

  return (
    <>
      <Heading>Paga tu Inscripción</Heading>
      <p className="text-muted-foreground mt-2">
        Tu propuesta para {offer.editionName} fue aceptada. Paga tu Inscripción
        para asegurar tu lugar. Tu cuenta de Autor usará{" "}
        <strong className="text-foreground wrap-anywhere">{offer.email}</strong>
        .
      </p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <dt className="text-muted-foreground text-sm">Inscripción</dt>
          <dd className="text-base font-semibold">
            {formatMxn(offer.priceMxn)}
          </dd>
        </div>
        <div className="rounded-xl border p-4">
          <dt className="text-muted-foreground text-sm">Págala antes del</dt>
          <dd className="text-base font-semibold">
            {formatDateTime(offer.deadline)}
          </dd>
        </div>
      </dl>
      {failure === null ? null : (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      <Button
        size="lg"
        className="mt-8"
        disabled={isPending}
        onClick={() => {
          void pay();
        }}
      >
        {isPending ? "Abriendo el pago…" : "Pagar Inscripción"}
      </Button>
    </>
  );
};

const Registered = () => (
  <>
    <Heading>Tu Inscripción ya está pagada</Heading>
    <p className="text-muted-foreground mt-2">
      Entra con tu correo para ver tu cuenta.
    </p>
    <Link to="/entrar" className={buttonVariants({ className: "mt-8" })}>
      Entrar
    </Link>
  </>
);

const Expired = () => (
  <>
    <Heading>Este link ya no funciona</Heading>
    <p className="text-muted-foreground mt-2">
      El plazo para pagar esta Inscripción terminó o el link no es válido. Si
      todavía quieres participar, manda una nueva propuesta mientras la
      convocatoria siga abierta.
    </p>
    <Link
      to="/propuesta"
      className={buttonVariants({ variant: "outline", className: "mt-8" })}
    >
      Ir a propuestas
    </Link>
  </>
);

const RegistrationPage = () => {
  const offer = Route.useLoaderData();
  const { proposalId } = Route.useParams();
  const { pagado } = Route.useSearch();

  const content = () => {
    // Stripe's redirect proves nothing; the webhook registers the payment and sends the link.
    if (pagado === 1) {
      return <CheckEmail />;
    }

    switch (offer.status) {
      case "payable": {
        return <Pay proposalId={proposalId} offer={offer} />;
      }

      case "registered": {
        return <Registered />;
      }

      case "unavailable": {
        return <Expired />;
      }

      default: {
        return offer satisfies never;
      }
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      {content()}
    </main>
  );
};

export const Route = createFileRoute("/inscripcion/$proposalId")({
  // TanStack parses `?pagado=1` as a number before validation sees it.
  validateSearch: z.object({ pagado: z.coerce.number().optional() }),
  loader: async ({ params }) =>
    await getRegistrationOffer({ data: { proposalId: params.proposalId } }),
  head: () => ({
    meta: [
      { title: "Inscripción · Garage Cómics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegistrationPage,
});
