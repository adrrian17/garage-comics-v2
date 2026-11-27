import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { BadgeCheck, CalendarX, MailCheck, Ticket } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  PageIcon,
  SinglePage,
  pageHeadingClass,
  pageLeadClass,
} from "@/components/page-intro";
import {
  getRegistrationOffer,
  startRegistrationCheckout,
} from "@/functions/registrations";
import { formatDateTime, formatMxn } from "@/lib/format";

type Offer = Awaited<ReturnType<typeof getRegistrationOffer>>;

const Heading = ({ children }: { children: string }) => (
  <h1 className={pageHeadingClass}>{children}</h1>
);

const CheckEmail = () => (
  <>
    <PageIcon>
      <MailCheck />
    </PageIcon>
    <Heading>Revisa tu correo</Heading>
    <p className={pageLeadClass}>
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
      <PageIcon>
        <Ticket />
      </PageIcon>
      <Heading>Paga tu Inscripción</Heading>
      <p className={pageLeadClass}>
        Tu propuesta para {offer.editionName} fue aceptada. Paga tu Inscripción
        para asegurar tu lugar. Tu cuenta de Autor usará{" "}
        <strong className="text-foreground wrap-anywhere">{offer.email}</strong>
        .
      </p>
      <dl className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="panel p-5">
          <dt className="text-muted-foreground text-sm">Inscripción</dt>
          <dd className="font-display mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formatMxn(offer.priceMxn)}
          </dd>
        </div>
        <div className="panel p-5">
          <dt className="text-muted-foreground text-sm">Págala antes del</dt>
          <dd className="font-display mt-1 text-lg leading-snug font-semibold tracking-tight">
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
        className="mt-10"
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
    <PageIcon>
      <BadgeCheck />
    </PageIcon>
    <Heading>Tu Inscripción ya está pagada</Heading>
    <p className={pageLeadClass}>Entra con tu correo para ver tu cuenta.</p>
    <Link to="/entrar" className={buttonVariants({ className: "mt-10" })}>
      Entrar
    </Link>
  </>
);

const Expired = () => (
  <>
    <PageIcon>
      <CalendarX />
    </PageIcon>
    <Heading>Este link ya no funciona</Heading>
    <p className={pageLeadClass}>
      El plazo para pagar esta Inscripción terminó o el link no es válido. Si
      todavía quieres participar, manda una nueva propuesta mientras la
      convocatoria siga abierta.
    </p>
    <Link
      to="/propuesta"
      className={buttonVariants({ variant: "outline", className: "mt-10" })}
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

  return <SinglePage>{content()}</SinglePage>;
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
