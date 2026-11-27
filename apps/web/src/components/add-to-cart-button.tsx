import { Button } from "@garage-comics/ui/components/button";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { CART_MAX_ITEMS } from "@/lib/cart";
import { useCart } from "@/lib/use-cart";

export const AddToCartButton = ({
  comicId,
  title,
}: {
  comicId: string;
  title: string;
}) => {
  const { ids, add } = useCart();

  if (ids.includes(comicId)) {
    return (
      <Button variant="outline" disabled>
        <Check data-icon="inline-start" />
        En el carrito
      </Button>
    );
  }

  return (
    <Button
      aria-label={`Agregar ${title} al carrito`}
      onClick={() => {
        if (ids.length >= CART_MAX_ITEMS) {
          toast.error(
            `El carrito admite hasta ${CART_MAX_ITEMS} cómics. Paga esta Compra y haz otra.`
          );

          return;
        }

        add(comicId);
      }}
    >
      <Plus data-icon="inline-start" />
      Agregar
    </Button>
  );
};
