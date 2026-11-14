import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Badge } from "@garage-comics/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@garage-comics/ui/components/card";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { getPayoutSetup } from "@/functions/payouts";
import { formatDateTime } from "@/lib/format";
import type { PayoutSetupStatus } from "@/lib/payout-setup";
import { getConnect } from "@/lib/stripe-connect";
import { useIsClient } from "@/lib/use-is-client";

type PayoutSetupData = Awaited<ReturnType<typeof getPayoutSetup>>;

const statusCopy = {
  needs_details: {
    badge: "Falta información",
    badgeVariant: "destructive",
    description:
      "Completa tus datos para que Garage Cómics pueda hacerte el Envío de fondos de cada venta.",
    showsOnboarding: true,
  },
  in_review: {
    badge: "En revisión",
    badgeVariant: "secondary",
    description:
      "Ya recibimos tus datos. Stripe los está revisando y no necesitas hacer nada más por ahora.",
    showsOnboarding: true,
  },
  rejected: {
    badge: "Rechazada",
    badgeVariant: "destructive",
    description:
      "Stripe no aprobó tu cuenta, así que no podemos hacerte Envíos de fondos. Escríbenos para revisar tu caso.",
    showsOnboarding: false,
  },
  ready: {
    badge: "Lista",
    badgeVariant: "default",
    description:
      "Tu cuenta está lista. Recibirás un Envío de fondos por cada cómic que vendas, y Stripe te hará una Transferencia a tu banco cada lunes.",
    showsOnboarding: false,
  },
} as const satisfies Record<
  PayoutSetupStatus,
  {
    badge: string;
    badgeVariant: "default" | "secondary" | "destructive";
    description: string;
    showsOnboarding: boolean;
  }
>;

const LOAD_ERROR =
  "No pudimos cargar el formulario de Stripe. Recarga la página o intenta de nuevo en un momento.";

// A blocked or failed Connect.js download never reaches `onLoadError`, so a loader that has not started by then counts as a failure.
const LOADER_START_TIMEOUT_MS = 20_000;

const ConnectOnboarding = ({
  userId,
  publishableKey,
}: {
  userId: string;
  publishableKey: string;
}) => {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const connect = getConnect(userId, publishableKey);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!started.current) {
        setFailed(true);
      }
    }, LOADER_START_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

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
        onLoaderStart={() => {
          started.current = true;
        }}
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
  userId,
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
      {copy.showsOnboarding && salesOpenAt !== null && (
        <Alert>
          <AlertDescription>
            Termina este registro antes de que abran las ventas de la Edición,
            el {formatDateTime(salesOpenAt)}.
          </AlertDescription>
        </Alert>
      )}
      {copy.showsOnboarding && (
        <Card>
          <CardContent>
            {isClient && (
              <ConnectOnboarding
                userId={userId}
                publishableKey={publishableKey}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
