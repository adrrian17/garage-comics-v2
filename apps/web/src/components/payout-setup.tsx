import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Badge } from "@garage-comics/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import { loadConnectAndInitialize } from "@stripe/connect-js/pure";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import type { getPayoutSetup } from "@/functions/payouts";
import { createPayoutSession } from "@/functions/payouts";
import { formatDateTime } from "@/lib/format";
import type { PayoutSetupStatus } from "@/lib/payout-setup";
import { useIsClient } from "@/lib/use-is-client";

type PayoutSetupData = Awaited<ReturnType<typeof getPayoutSetup>>;

const statusCopy = {
  needs_details: {
    badge: "Falta información",
    badgeVariant: "destructive",
    description:
      "Completa tus datos para que Garage Cómics pueda hacerte el Envío de fondos de cada venta.",
  },
  in_review: {
    badge: "En revisión",
    badgeVariant: "secondary",
    description:
      "Ya recibimos tus datos. Stripe los está revisando y no necesitas hacer nada más por ahora.",
  },
  ready: {
    badge: "Lista",
    badgeVariant: "default",
    description:
      "Tu cuenta está lista. Recibirás un Envío de fondos por cada cómic que vendas, y Stripe te hará una Transferencia a tu banco cada lunes.",
  },
} as const satisfies Record<
  PayoutSetupStatus,
  {
    badge: string;
    badgeVariant: "default" | "secondary" | "destructive";
    description: string;
  }
>;

const LOAD_ERROR =
  "No pudimos cargar el formulario de Stripe. Recarga la página o intenta de nuevo en un momento.";

// Connect.js asks for a client secret as soon as it initializes, so a second instance (a remount, React's dev double render) would race the first to create the Stripe account. One per page load.
let connectInstance: ReturnType<typeof loadConnectAndInitialize> | undefined;

const getConnect = (publishableKey: string) => {
  connectInstance ??= loadConnectAndInitialize({
    publishableKey,
    locale: "es-419",
    fetchClientSecret: async () => await createPayoutSession(),
  });

  return connectInstance;
};

const ConnectOnboarding = ({ publishableKey }: { publishableKey: string }) => {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const connect = getConnect(publishableKey);

  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{LOAD_ERROR}</AlertDescription>
      </Alert>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={connect}>
      <ConnectAccountOnboarding
        onLoadError={() => {
          setFailed(true);
        }}
        onExit={() => {
          void router.invalidate();
        }}
      />
    </ConnectComponentsProvider>
  );
};

/** The payouts page body, shared by the Author area and an Admin's own area. */
export const PayoutSetup = ({
  status,
  publishableKey,
  salesOpenAt,
}: PayoutSetupData) => {
  const copy = statusCopy[status];
  // Connect.js only runs in the browser, so onboarding starts after hydration, never during server rendering.
  const isClient = useIsClient();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              Cuenta para recibir tus pagos
              <Badge variant={copy.badgeVariant}>{copy.badge}</Badge>
            </h2>
          </CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
      </Card>
      {status !== "ready" && salesOpenAt !== null && (
        <Alert>
          <AlertDescription>
            Termina este registro antes de que abran las ventas de la Edición,
            el {formatDateTime(salesOpenAt)}.
          </AlertDescription>
        </Alert>
      )}
      {status !== "ready" && (
        <Card>
          <CardContent>
            {isClient && <ConnectOnboarding publishableKey={publishableKey} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
