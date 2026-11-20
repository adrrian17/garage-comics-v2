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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@garage-comics/ui/components/table";
import {
  ConnectAccountOnboarding,
  ConnectBalances,
  ConnectComponentsProvider,
  ConnectPayoutsList,
} from "@stripe/react-connect-js";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { getPayoutSetup } from "@/functions/payouts";
import { formatCentavos, formatDateTime } from "@/lib/format";
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
  paused: {
    badge: "Pausada",
    badgeVariant: "secondary",
    description:
      "Garage Cómics pausó tu cuenta por ahora. Mientras siga pausada, pueden detenerse tus Envíos de fondos o tus Transferencias a tu banco. Escríbenos si tienes dudas.",
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

/** Hosts Stripe's embedded components on the page's one Connect instance, and shows one error if they fail to load. */
const ConnectEmbed = ({
  userId,
  publishableKey,
  children,
}: {
  userId: string;
  publishableKey: string;
  children: (handlers: {
    onLoaderStart: () => void;
    onLoadError: () => void;
  }) => ReactNode;
}) => {
  const [phase, setPhase] = useState<"loading" | "started" | "failed">(
    "loading"
  );

  const connect = getConnect(userId, publishableKey);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPhase((current) => (current === "loading" ? "failed" : current));
    }, LOADER_START_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (phase === "failed") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{LOAD_ERROR}</AlertDescription>
      </Alert>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={connect}>
      {children({
        onLoaderStart: () => {
          setPhase((current) => (current === "failed" ? current : "started"));
        },
        onLoadError: () => {
          setPhase("failed");
        },
      })}
    </ConnectComponentsProvider>
  );
};

const TransfersCard = ({ sales }: { sales: PayoutSetupData["sales"] }) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2 className="text-base font-semibold">Envíos de fondos</h2>
      </CardTitle>
      <CardDescription>
        Tu parte de cada cómic vendido, enviada a tu cuenta de Stripe.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {sales.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no tienes Envíos de fondos.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número de compra</TableHead>
              <TableHead>Cómic</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.orderItemId}>
                <TableCell>{sale.orderNumber}</TableCell>
                <TableCell>{sale.title}</TableCell>
                <TableCell>{formatCentavos(sale.shareCentavos)}</TableCell>
                <TableCell>
                  {sale.transferSent ? "Enviado" : "En camino"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);

/** The payouts page body, shared by the Author area and an Admin's own area. */
export const PayoutSetup = ({
  userId,
  status,
  publishableKey,
  salesOpenAt,
  sales,
}: PayoutSetupData) => {
  const router = useRouter();
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
              <ConnectEmbed userId={userId} publishableKey={publishableKey}>
                {(handlers) => (
                  <ConnectAccountOnboarding
                    {...handlers}
                    onExit={() => {
                      void router.invalidate();
                    }}
                  />
                )}
              </ConnectEmbed>
            )}
          </CardContent>
        </Card>
      )}
      {status !== "needs_details" && (
        <Card>
          <CardContent>
            {isClient && (
              <ConnectEmbed userId={userId} publishableKey={publishableKey}>
                {(handlers) => (
                  <div className="flex flex-col gap-6">
                    <ConnectBalances {...handlers} />
                    <ConnectPayoutsList {...handlers} />
                  </div>
                )}
              </ConnectEmbed>
            )}
          </CardContent>
        </Card>
      )}
      <TransfersCard sales={sales} />
    </div>
  );
};
