import { buttonVariants } from "@garage-comics/ui/components/button";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { PageMessage } from "@/components/page-message";
import { getDownloadLink } from "@/functions/downloads";
import type { CopyState } from "@/lib/download-link";
import { formatDateTime } from "@/lib/format";

const POLL_MS = 10_000;

const CopyAction = ({
  state,
  href,
  orderNumber,
}: {
  state: CopyState;
  href: string;
  orderNumber: string;
}) => {
  if (state === "ready") {
    return (
      <a href={href} className={buttonVariants()}>
        Descargar
      </a>
    );
  }

  if (state === "preparing") {
    return (
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Preparando tu PDF…
      </span>
    );
  }

  return (
    <span className="text-destructive text-sm">
      No pudimos preparar este cómic. Responde al correo de tu Compra con tu
      Número de compra {orderNumber}.
    </span>
  );
};

const DownloadLinkPage = () => {
  const view = Route.useLoaderData();
  const { downloadLinkId } = Route.useParams();
  const router = useRouter();

  const preparing =
    view.status === "open" &&
    view.comics.some((comic) => comic.state === "preparing");

  useEffect(() => {
    const timer = setInterval(() => {
      if (preparing) {
        void router.invalidate();
      }
    }, POLL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [preparing, router]);

  if (view.status === "expired") {
    return (
      <PageMessage
        title="Tu Link de descarga venció"
        description={`Funcionó hasta el ${formatDateTime(view.expiresAt)}. Responde al correo de tu Compra con tu Número de compra ${view.orderNumber} y te mandamos uno nuevo.`}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Tu Compra {view.orderNumber}
      </h1>
      <p className="text-muted-foreground mt-2">
        Tu Link de descarga funciona hasta el {formatDateTime(view.expiresAt)},
        sin límite de descargas. Cada PDF lleva tu correo y tu Número de compra
        al pie de cada página.
      </p>
      <ul aria-live="polite" className="mt-8 flex flex-col gap-3">
        {view.comics.map((comic) => (
          <li
            key={comic.orderItemId}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
          >
            <span className="font-medium">{comic.title}</span>
            <CopyAction
              state={comic.state}
              href={`/descargas/${downloadLinkId}/${comic.orderItemId}`}
              orderNumber={view.orderNumber}
            />
          </li>
        ))}
      </ul>
    </main>
  );
};

export const Route = createFileRoute("/descargas/$downloadLinkId")({
  loader: async ({ params }) => {
    const view = await getDownloadLink({
      data: { downloadLinkId: params.downloadLinkId },
    });

    if (view === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router signals a missing page by throwing notFound().
      throw notFound();
    }

    return view;
  },
  head: () => ({
    meta: [
      { title: "Tu Link de descarga · Garage Cómics" },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: DownloadLinkPage,
});
