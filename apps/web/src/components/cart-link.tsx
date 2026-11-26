import { buttonVariants } from "@garage-comics/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

import { useCart } from "@/lib/use-cart";

const cartLabel = (count: number) => {
  if (count === 0) {
    return "Carrito, vacío";
  }

  return count === 1 ? "Carrito, 1 cómic" : `Carrito, ${count} cómics`;
};

/** The header's way into the cart, with how many comics it holds. */
export const CartLink = () => {
  const { ids } = useCart();
  const count = ids.length;

  return (
    <Link
      to="/carrito"
      aria-label={cartLabel(count)}
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className: "border-foreground/15 bg-transparent",
      })}
    >
      <ShoppingBag data-icon="inline-start" />
      <span className="max-sm:sr-only">Carrito</span>
      {count === 0 ? null : (
        <span
          aria-hidden
          className="bg-print text-print-foreground -mr-1 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums"
        >
          {count}
        </span>
      )}
    </Link>
  );
};
