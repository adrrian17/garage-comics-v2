import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useEffect } from "react";

import { useCart } from "@/lib/use-cart";

const OrderPlacedPage = () => {
  const { clear } = useCart();

  // The Customer got as far as paying, so the cart has done its job. Stripe's redirect proves nothing about the payment; the webhook confirms it.
  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <MailCheck aria-hidden className="mb-4 size-8" />
      <h1 className="text-3xl font-bold tracking-tight">
        Estamos confirmando tu pago
      </h1>
      <p className="text-muted-foreground mt-2">
        En cuanto se confirme, te mandamos por correo tu Número de compra y tu
        Link de descarga. Si elegiste OXXO, la confirmación llega cuando pagues
        en la tienda y se registre tu pago. Si no pagas a tiempo, la Compra se
        cancela y no se te cobra nada.
      </p>
      <Link to="/" className={buttonVariants({ className: "mt-8" })}>
        Volver al catálogo
      </Link>
    </main>
  );
};

export const Route = createFileRoute("/compra/lista")({
  head: () => ({
    meta: [
      { title: "Compra · Garage Cómics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPlacedPage,
});
