import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import { useCart } from "@/lib/use-cart";

export const CartLink = () => {
  const { ids } = useCart();

  return (
    <Link
      to="/carrito"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <ShoppingCart data-icon="inline-start" />
      Carrito{ids.length === 0 ? "" : ` (${ids.length})`}
    </Link>
  );
};
