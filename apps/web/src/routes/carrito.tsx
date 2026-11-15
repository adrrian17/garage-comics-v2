import { Alert, AlertDescription } from "@garage-comics/ui/components/alert";
import { Button, buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { CheckoutForm } from "@/components/checkout-form";
import { getCartLines } from "@/functions/catalog";
import { formatMxn } from "@/lib/format";
import { useCart } from "@/lib/use-cart";
import { useIsClient } from "@/lib/use-is-client";

type CartLines = Awaited<ReturnType<typeof getCartLines>>;

const Heading = ({ children }: { children: string }) => (
  <h1 className="text-3xl font-bold tracking-tight">{children}</h1>
);

const BackToCatalog = () => (
  <Link to="/" className={buttonVariants({ variant: "outline" })}>
    Ver el catálogo
  </Link>
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
      <>
        <Heading>Tu carrito está vacío</Heading>
        <p className="text-muted-foreground mt-2">
          Agrega cómics del catálogo para comprarlos todos en una sola Compra.
        </p>
        {notice}
        <div className="mt-8">
          <BackToCatalog />
        </div>
      </>
    );
  }

  if (lines?.status === "closed") {
    return (
      <>
        <Heading>La venta no está abierta</Heading>
        <p className="text-muted-foreground mt-2">
          Ahora no se pueden comprar cómics. Vuelve cuando abra la próxima
          Edición.
        </p>
        <div className="mt-8">
          <BackToCatalog />
        </div>
      </>
    );
  }

  if (lines === null) {
    return (
      <>
        <Heading>Tu carrito</Heading>
        <p className="text-muted-foreground mt-2">
          {failed
            ? "No pudimos cargar tu carrito. Recarga la página en un momento."
            : "Cargando tu carrito…"}
        </p>
      </>
    );
  }

  const inCart = new Set(ids);

  const comics = lines.comics.filter((comic) => inCart.has(comic.id));

  const total = comics.reduce((sum, comic) => sum + comic.priceMxn, 0);

  return (
    <>
      <Heading>Tu carrito</Heading>
      {notice}
      {failed ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>
            No pudimos actualizar tu carrito. Revisa tu conexión e intenta de
            nuevo.
          </AlertDescription>
        </Alert>
      ) : null}
      <ul className="mt-8 flex flex-col divide-y rounded-xl border">
        {comics.map((comic) => (
          <li key={comic.id} className="flex items-center gap-4 p-4">
            {comic.hasCover ? (
              <img
                src={`/portadas/${comic.id}`}
                alt=""
                width={64}
                height={96}
                className="h-24 w-16 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="bg-muted h-24 w-16 shrink-0 rounded-md"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium wrap-anywhere">{comic.title}</p>
              <p className="text-muted-foreground text-sm wrap-anywhere">
                {comic.author.displayName}
              </p>
            </div>
            <p className="font-semibold">{formatMxn(comic.priceMxn)}</p>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Quitar ${comic.title} del carrito`}
              onClick={() => {
                remove([comic.id]);
              }}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatMxn(total)}</span>
      </p>
      <CheckoutForm
        ids={comics.map((comic) => comic.id)}
        onChanged={(dropped) => {
          remove(dropped);
          setDroppedCount((count) => count + dropped.length);
        }}
      />
    </>
  );
};

const CartRoute = () => (
  <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
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
