import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarX, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { CheckoutForm } from "@/components/checkout-form";
import { ComicCover } from "@/components/comic-grid";
import {
  PageIcon,
  pageHeadingClass,
  pageLeadClass,
} from "@/components/page-intro";
import { getCartLines } from "@/functions/catalog";
import { formatMxn } from "@/lib/format";
import { useCart } from "@/lib/use-cart";
import { useIsClient } from "@/lib/use-is-client";

type CartLines = Awaited<ReturnType<typeof getCartLines>>;

const Heading = ({ children }: { children: string }) => (
  <h1 className={pageHeadingClass}>{children}</h1>
);

const BackToCatalog = () => (
  <Link to="/" className={buttonVariants({ variant: "outline" })}>
    Ver el catálogo
  </Link>
);

/** A cart state with nothing to list: empty, closed or still loading. */
const CartMessage = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <div className="mx-auto max-w-xl py-4 sm:py-12">
    <PageIcon>{icon}</PageIcon>
    <Heading>{title}</Heading>
    {children}
  </div>
);

const CartPage = () => {
  const { ids, remove } = useCart();
  const isClient = useIsClient();
  const [lines, setLines] = useState<CartLines | null>(null);
  const [failed, setFailed] = useState(false);
  const [droppedCount, setDroppedCount] = useState(0);

  useEffect(() => {
    let current = true;

    const load = async () => {
      if (ids.length === 0) {
        return;
      }

      try {
        const result = await getCartLines({ data: { ids } });

        if (current) {
          setFailed(false);
          setLines(result);

          if (result.status === "open" && result.dropped.length > 0) {
            remove(result.dropped);
            setDroppedCount((count) => count + result.dropped.length);
          }
        }
      } catch {
        if (current) {
          setFailed(true);
        }
      }
    };

    void load();

    return () => {
      current = false;
    };
  }, [ids, remove]);

  // The cart only exists in the browser, so the server render says nothing about it.
  if (!isClient) {
    return null;
  }

  const notice =
    droppedCount === 0 ? null : (
      <Alert className="mt-6">
        <AlertDescription>
          {droppedCount === 1
            ? "Quitamos de tu carrito un cómic que ya no está a la venta."
            : `Quitamos de tu carrito ${droppedCount} cómics que ya no están a la venta.`}
        </AlertDescription>
      </Alert>
    );

  if (ids.length === 0) {
    return (
      <CartMessage title="Tu carrito está vacío" icon={<ShoppingBag />}>
        <p className={pageLeadClass}>
          Agrega cómics del catálogo para comprarlos todos en una sola Compra.
        </p>
        {notice}
        <div className="mt-10">
          <BackToCatalog />
        </div>
      </CartMessage>
    );
  }

  if (lines?.status === "closed") {
    return (
      <CartMessage title="La venta no está abierta" icon={<CalendarX />}>
        <p className={pageLeadClass}>
          Ahora no se pueden comprar cómics. Vuelve cuando abra la próxima
          Edición.
        </p>
        <div className="mt-10">
          <BackToCatalog />
        </div>
      </CartMessage>
    );
  }

  if (lines === null) {
    return (
      <CartMessage title="Tu carrito" icon={<ShoppingBag />}>
        <p className={pageLeadClass}>
          {failed
            ? "No pudimos cargar tu carrito. Recarga la página en un momento."
            : "Cargando tu carrito…"}
        </p>
      </CartMessage>
    );
  }

  const inCart = new Set(ids);

  const comics = lines.comics.filter((comic) => inCart.has(comic.id));

  const total = comics.reduce((sum, comic) => sum + comic.priceMxn, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b pb-6">
        <Heading>Tu carrito</Heading>
        <p className="text-muted-foreground text-sm">
          {comics.length === 1 ? "1 cómic" : `${comics.length} cómics`}
        </p>
      </div>
      {notice}
      {failed ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>
            No pudimos actualizar tu carrito. Revisa tu conexión e intenta de
            nuevo.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-2 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <ul className="flex flex-col divide-y">
          {comics.map((comic) => (
            <li
              key={comic.id}
              className="flex items-center gap-4 py-6 sm:gap-6"
            >
              <ComicCover
                comic={comic}
                className="ring-foreground/10 w-16 shrink-0 ring-1 sm:w-20"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-snug font-semibold tracking-tight wrap-anywhere">
                  {comic.title}
                </p>
                <p className="text-muted-foreground mt-1 text-sm wrap-anywhere">
                  {comic.author.displayName}
                </p>
              </div>
              <p className="font-display text-lg font-semibold tabular-nums">
                {formatMxn(comic.priceMxn)}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar ${comic.title} del carrito`}
                onClick={() => {
                  remove([comic.id]);
                }}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
        <section
          aria-labelledby="resumen"
          className="panel p-6 sm:p-8 lg:sticky lg:top-24 lg:mt-6"
        >
          <h2 id="resumen" className="sr-only">
            Resumen de tu Compra
          </h2>
          <p className="flex items-baseline justify-between gap-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-3xl font-semibold tracking-tight tabular-nums">
              {formatMxn(total)}
            </span>
          </p>
          <CheckoutForm
            ids={comics.map((comic) => comic.id)}
            onChanged={(dropped) => {
              remove(dropped);
              setDroppedCount((count) => count + dropped.length);
            }}
          />
        </section>
      </div>
    </>
  );
};

const CartRoute = () => (
  <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
    <CartPage />
  </main>
);

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Carrito · Garage Cómics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartRoute,
});
