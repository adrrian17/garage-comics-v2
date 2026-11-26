import { buttonVariants } from "@garage-comics/ui/components/button";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { CircleAlert, Download, Loader2, PackageOpen } from "lucide-react";
import { useEffect } from "react";

import {
  PageIcon,
  narrowPageClass,
  pageHeadingClass,
  pageLeadClass,
} from "@/components/page-intro";
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
      <a href={href} className={buttonVariants({ size: "sm" })}>
        <Download data-icon="inline-start" />
        Descargar PDF
      </a>
    );
  }

  if (state === "preparing") {
    return (
      <span className="text-muted-foreground flex h-9 items-center gap-2 text-sm">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Preparando tu PDF…
      </span>
    );
  }

  return (
    <span className="bg-destructive/8 text-destructive flex max-w-sm items-start gap-2 rounded-xl px-3 py-2 text-sm">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
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
    <main className={narrowPageClass}>
      <PageIcon>
        <PackageOpen />
      </PageIcon>
      <p className="text-muted-foreground mb-2 font-medium">
        Compra {view.orderNumber}
      </p>
      <h1 className={pageHeadingClass}>Tus cómics</h1>
      <p className={pageLeadClass}>
        Tu Link de descarga funciona hasta el {formatDateTime(view.expiresAt)},
        sin límite de descargas. Cada PDF lleva tu correo y tu Número de compra
        al pie de cada página.
      </p>
      <ul aria-live="polite" className="mt-10 flex flex-col border-t">
        {view.comics.map((comic) => (
          <li
            key={comic.orderItemId}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b py-5"
          >
            <span className="font-display text-lg leading-snug font-semibold tracking-tight wrap-anywhere">
              {comic.title}
            </span>
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
